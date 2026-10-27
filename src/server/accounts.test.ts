import { describe, expect, it } from "vitest";
import { makeUser, setupTestDb } from "@/test/db";
import { getActorForToken, requireRole, signIn, signOut, signUp } from "./accounts";
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
