import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { parseOrThrow, requireRole, type Actor } from "./accounts";
import type { Db } from "./db";
import { charges, dayOfWeek, payments, rates, reservations, spaces, users } from "./db/schema";
import { AppError } from "./errors";
import { fromCents, toCents } from "./money";

export async function listSpaces(db: Db) {
  return db.select().from(spaces).orderBy(asc(spaces.code));
}

const spaceSchema = z.object({
  name: z.string().trim().min(1, "Enter a name"),
  spaceType: z.enum(["build", "meeting"], "Choose a type"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  isActive: z.coerce.boolean(),
});

export async function updateSpace(db: Db, actor: Actor | null, spaceId: number, raw: unknown) {
  requireRole(actor, "admin");
  const data = parseOrThrow(spaceSchema, raw);
  const [space] = await db.update(spaces).set(data).where(eq(spaces.spaceId, spaceId)).returning();
  if (!space) throw new AppError("NOT_FOUND", "Space not found");
  return space;
}

export async function listRates(db: Db) {
  return db.select().from(rates).orderBy(asc(rates.spaceId), asc(rates.dayOfWeek), asc(rates.startTime));
}

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/, "Enter a time as HH:MM");
const blankToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const rateSchema = z
  .object({
    spaceId: z.preprocess(blankToNull, z.coerce.number().int().positive().nullable()),
    dayOfWeek: z.preprocess(blankToNull, z.enum(dayOfWeek.enumValues).nullable()),
    startTime: clock,
    endTime: clock,
    hourlyRate: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Enter a rate like 150 or 150.50")
      .transform((v) => fromCents(toCents(v)))
      .refine((v) => v !== "0.00", "Rate must be more than zero"),
    isPeak: z.coerce.boolean(),
    effectiveFrom: z.iso.date("Enter a start date"),
    effectiveTo: z.preprocess(blankToNull, z.iso.date().nullable()),
  })
  .refine((r) => r.endTime.slice(0, 5) > r.startTime.slice(0, 5), {
    message: "End time must be after start time",
  })
  .refine((r) => r.effectiveTo === null || r.effectiveTo >= r.effectiveFrom, {
    message: "The last day must be on or after the first day",
  });

export async function createRate(db: Db, actor: Actor | null, raw: unknown) {
  requireRole(actor, "admin");
  const [rate] = await db.insert(rates).values(parseOrThrow(rateSchema, raw)).returning();
  return rate;
}

export async function getRate(db: Db, actor: Actor | null, rateId: number) {
  requireRole(actor, "admin");
  const [rate] = await db.select().from(rates).where(eq(rates.rateId, rateId));
  if (!rate) throw new AppError("NOT_FOUND", "Rate not found");
  return { rate, usedBy: await db.$count(charges, eq(charges.rateId, rateId)) };
}

export async function updateRate(db: Db, actor: Actor | null, rateId: number, raw: unknown) {
  requireRole(actor, "admin");
  const [rate] = await db
    .update(rates)
    .set(parseOrThrow(rateSchema, raw))
    .where(eq(rates.rateId, rateId))
    .returning();
  if (!rate) throw new AppError("NOT_FOUND", "Rate not found");
  return rate;
}

// Charges keep a reference to their rate, so a used rate can only be ended
// (set its last day), not deleted.
export async function deleteRate(db: Db, actor: Actor | null, rateId: number) {
  requireRole(actor, "admin");
  if ((await db.$count(charges, eq(charges.rateId, rateId))) > 0) {
    throw new AppError("RATE_IN_USE", "Bookings use this rate. Set its last day instead of deleting it");
  }
  await db.delete(rates).where(eq(rates.rateId, rateId));
}

// The staff queue: submitted payments waiting for a check, oldest first.
export async function listPendingPayments(db: Db, actor: Actor | null) {
  requireRole(actor, "admin");
  return db
    .select({
      payment: payments,
      reservationId: reservations.reservationId,
      startAt: reservations.startAt,
      endAt: reservations.endAt,
      paymentDueAt: reservations.paymentDueAt,
      totalAmount: reservations.totalAmount,
      spaceCode: spaces.code,
      spaceName: spaces.name,
      firstName: users.firstName,
      lastName: users.lastName,
      schoolId: users.schoolId,
    })
    .from(payments)
    .innerJoin(reservations, eq(reservations.reservationId, payments.reservationId))
    .innerJoin(spaces, eq(spaces.spaceId, reservations.spaceId))
    .innerJoin(users, eq(users.userId, reservations.userId))
    .where(and(eq(payments.status, "pending"), ne(reservations.status, "cancelled")))
    .orderBy(asc(payments.submittedAt));
}
