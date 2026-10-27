import { and, count, eq, gt, or } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, hashToken, newSessionToken, verifyPassword } from "./auth";
import type { Db } from "./db";
import { sessions, signInFailures, users, type Role, type User } from "./db/schema";
import { AppError, pgCode } from "./errors";

const SESSION_DAYS = 7;
const THROTTLE_MAX_FAILURES = 5;
const THROTTLE_WINDOW_MS = 15 * 60_000;

let dummy: Promise<string> | undefined;
const dummyHash = () => (dummy ??= hashPassword("not-a-real-password"));

export type Actor = { userId: number; role: Role; name: string };

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null);

const signUpSchema = z
  .object({
    schoolId: z.string().trim().min(1, "School ID is required"),
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.email("Enter a valid email").transform((v) => v.toLowerCase()),
    phone: optionalText,
    role: z.enum(["student", "faculty"], "Choose student or faculty"),
    department: optionalText,
    program: optionalText,
    yearLevel: z.string().trim().optional(),
    password: z.string().min(8, "Password must have at least 8 characters"),
  })
  .transform((v, ctx) => {
    if (v.role === "faculty") return { ...v, yearLevel: null };
    const year = Number(v.yearLevel);
    if (!Number.isInteger(year) || year < 1 || year > 6) {
      ctx.addIssue({ code: "custom", message: "Year level must be 1 to 6", path: ["yearLevel"] });
      return z.NEVER;
    }
    return { ...v, yearLevel: year };
  });

export type SignUpInput = z.input<typeof signUpSchema>;

export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError("INVALID_INPUT", result.error.issues[0].message);
  return result.data;
}

export async function signUp(db: Db, input: Record<string, unknown>): Promise<User> {
  const { password, ...data } = parseOrThrow(signUpSchema, input);
  const existing = await db
    .select({ id: users.userId })
    .from(users)
    .where(or(eq(users.email, data.email), eq(users.schoolId, data.schoolId)));
  if (existing.length > 0) throw duplicate();
  try {
    const [user] = await db
      .insert(users)
      .values({ ...data, passwordHash: await hashPassword(password) })
      .returning();
    return user;
  } catch (e) {
    if (pgCode(e) === "23505") throw duplicate();
    throw e;
  }
}

const duplicate = () => new AppError("DUPLICATE", "An account with this email or school ID already exists");

export async function signIn(db: Db, email: string, password: string, now = new Date()) {
  const key = email.trim().toLowerCase();
  const since = new Date(now.getTime() - THROTTLE_WINDOW_MS);
  const [{ failures }] = await db
    .select({ failures: count() })
    .from(signInFailures)
    .where(and(eq(signInFailures.email, key), gt(signInFailures.failedAt, since)));
  if (failures >= THROTTLE_MAX_FAILURES) {
    throw new AppError("TOO_MANY_ATTEMPTS", "Too many failed sign-ins. Wait 15 minutes, then try again.");
  }

  const [user] = await db.select().from(users).where(eq(users.email, key));
  // Hash even when the email is unknown, so timing does not reveal which emails have accounts.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !ok) {
    await db.insert(signInFailures).values({ email: key, failedAt: now });
    throw new AppError("INVALID_CREDENTIALS", "Email or password is incorrect");
  }
  await db.delete(signInFailures).where(eq(signInFailures.email, key));
  const { token, tokenHash } = newSessionToken();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ tokenHash, userId: user.userId, expiresAt });
  return { token, expiresAt };
}

export async function signOut(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function getActorForToken(db: Db, token: string, now = new Date()): Promise<Actor | null> {
  const [row] = await db
    .select({ userId: users.userId, role: users.role, firstName: users.firstName, lastName: users.lastName })
    .from(sessions)
    .innerJoin(users, eq(users.userId, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)));
  if (!row) return null;
  return { userId: row.userId, role: row.role, name: `${row.firstName} ${row.lastName}` };
}

// Every domain function that changes data calls this first.
export function requireRole(actor: Actor | null, ...roles: Role[]): Actor {
  if (!actor) throw new AppError("UNAUTHENTICATED", "Sign in to continue");
  if (roles.length > 0 && !roles.includes(actor.role)) {
    throw new AppError("FORBIDDEN", "You do not have access to this action");
  }
  return actor;
}
