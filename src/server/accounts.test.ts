import { describe, expect, it } from "vitest";
import { makeUser, setupTestDb } from "@/test/db";
import { getActorForToken, requireRole, signIn, signOut, signUp } from "./accounts";
import { signInFailures } from "./db/schema";
import { AppError } from "./errors";

const { db } = setupTestDb();

const student = {
  schoolId: "2024-0001",
  firstName: "Ana",
  lastName: "Cruz",
  email: "Ana.Cruz@School.edu",
  role: "student",
  department: "Engineering",
  program: "BS CpE",
  yearLevel: "2",
  password: "correct horse",
};

async function errorCode(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
}

describe("accounts", () => {
  it("signs up, signs in, and resolves the session", async () => {
    const user = await signUp(db, student);
    expect(user.email).toBe("ana.cruz@school.edu");
    expect(user.passwordHash).not.toContain("correct horse");

    const { token } = await signIn(db, "ana.cruz@school.edu", "correct horse");
    const actor = await getActorForToken(db, token);
    expect(actor).toMatchObject({ userId: user.userId, role: "student", name: "Ana Cruz" });
  });

  it("rejects a wrong password and an unknown email the same way", async () => {
    await signUp(db, student);
    expect(await errorCode(signIn(db, student.email, "wrong password"))).toBe("INVALID_CREDENTIALS");
    expect(await errorCode(signIn(db, "nobody@school.edu", "whatever"))).toBe("INVALID_CREDENTIALS");
  });

  it("rejects a duplicate email or school ID", async () => {
    await signUp(db, student);
    expect(await errorCode(signUp(db, { ...student, schoolId: "other" }))).toBe("DUPLICATE");
    expect(await errorCode(signUp(db, { ...student, email: "other@school.edu" }))).toBe("DUPLICATE");
  });

  it("requires a year level for students and drops it for faculty", async () => {
    expect(await errorCode(signUp(db, { ...student, yearLevel: "" }))).toBe("INVALID_INPUT");
    const faculty = await signUp(db, { ...student, role: "faculty", yearLevel: "3" });
    expect(faculty.yearLevel).toBeNull();
  });

  it("does not let anyone sign up as admin", async () => {
    expect(await errorCode(signUp(db, { ...student, role: "admin" }))).toBe("INVALID_INPUT");
  });

  it("ends the session on sign out and after expiry", async () => {
    await signUp(db, student);
    const now = new Date("2026-11-02T00:00:00Z");
    const { token } = await signIn(db, student.email, student.password, now);
    expect(await getActorForToken(db, token, new Date("2026-11-08T23:00:00Z"))).not.toBeNull();
    expect(await getActorForToken(db, token, new Date("2026-11-09T01:00:00Z"))).toBeNull();

    const second = await signIn(db, student.email, student.password);
    await signOut(db, second.token);
    expect(await getActorForToken(db, second.token)).toBeNull();
  });

  it("locks an email after 5 failed sign-ins in 15 minutes, even with the right password", async () => {
    await signUp(db, student);
    const t0 = new Date("2026-11-02T00:00:00Z");
    const at = (min: number) => new Date(t0.getTime() + min * 60_000);
    for (let i = 0; i < 5; i++) {
      expect(await errorCode(signIn(db, student.email, "wrong password", at(i)))).toBe("INVALID_CREDENTIALS");
    }
    expect(await errorCode(signIn(db, student.email, student.password, at(5)))).toBe("TOO_MANY_ATTEMPTS");
    // Other emails are not affected.
    expect(await errorCode(signIn(db, "nobody@school.edu", "x", at(5)))).toBe("INVALID_CREDENTIALS");
    // The oldest failure leaves the window after 15 minutes.
    expect((await signIn(db, student.email, student.password, at(15.5))).token).toBeTruthy();
  });

  it("clears failed sign-ins after a successful one", async () => {
    await signUp(db, student);
    const now = new Date("2026-11-02T00:00:00Z");
    for (let i = 0; i < 4; i++) await errorCode(signIn(db, student.email, "wrong password", now));
    await signIn(db, student.email, student.password, now);
    for (let i = 0; i < 4; i++) await errorCode(signIn(db, student.email, "wrong password", now));
    expect((await signIn(db, student.email, student.password, now)).token).toBeTruthy();
  });

  it("counts failures for unknown emails too", async () => {
    const now = new Date("2026-11-02T00:00:00Z");
    for (let i = 0; i < 5; i++) await errorCode(signIn(db, "Nobody@School.edu", "x", now));
    expect(await errorCode(signIn(db, "nobody@school.edu", "x", now))).toBe("TOO_MANY_ATTEMPTS");
  });

  it("prunes expired failures on the next failure", async () => {
    const now = new Date("2026-11-02T00:00:00Z");
    for (let i = 0; i < 3; i++) await errorCode(signIn(db, `ghost${i}@school.edu`, "x", now));
    await errorCode(signIn(db, "late@school.edu", "x", new Date(now.getTime() + 16 * 60_000)));
    expect(await db.select().from(signInFailures)).toHaveLength(1);
  });

  it("ignores a forged token", async () => {
    expect(await getActorForToken(db, "not-a-real-token")).toBeNull();
  });

  it("requireRole blocks signed-out users and the wrong role", async () => {
    const user = await makeUser(db, "student");
    const actor = { userId: user.userId, role: user.role, name: "x" };
    expect(() => requireRole(null)).toThrow(expect.objectContaining({ code: "UNAUTHENTICATED" }));
    expect(() => requireRole(actor, "admin")).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(requireRole(actor)).toBe(actor);
    expect(requireRole(actor, "student", "faculty")).toBe(actor);
  });
});
