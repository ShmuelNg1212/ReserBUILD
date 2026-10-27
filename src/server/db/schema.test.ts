import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { makeSpace, makeUser, setupTestDb } from "@/test/db";
import { reservations, users } from "./schema";

const { db } = setupTestDb();

function booking(userId: number, spaceId: number, start: string, end: string) {
  return {
    userId,
    spaceId,
    startAt: new Date(start),
    endAt: new Date(end),
    purpose: "Test",
    headcount: 2,
    totalAmount: "100.00",
  };
}

async function errorCode(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    const cause = (e as { cause?: { code?: string } }).cause;
    return cause?.code ?? (e as { code?: string }).code;
  }
  return undefined;
}

describe("reservation overlap constraint", () => {
  it("rejects a second active reservation that overlaps", async () => {
    const user = await makeUser(db);
    const space = await makeSpace(db);
    await db.insert(reservations).values(booking(user.userId, space.spaceId, "2026-11-02T01:00Z", "2026-11-02T03:00Z"));

    const code = await errorCode(
      db.insert(reservations).values(booking(user.userId, space.spaceId, "2026-11-02T02:00Z", "2026-11-02T04:00Z")),
    );
    expect(code).toBe("23P01");
  });

  it("allows back-to-back reservations", async () => {
    const user = await makeUser(db);
    const space = await makeSpace(db);
    await db.insert(reservations).values(booking(user.userId, space.spaceId, "2026-11-02T01:00Z", "2026-11-02T03:00Z"));
    await db.insert(reservations).values(booking(user.userId, space.spaceId, "2026-11-02T03:00Z", "2026-11-02T04:00Z"));
    expect(await db.$count(reservations)).toBe(2);
  });

  it("allows the same time in another space", async () => {
    const user = await makeUser(db);
    const a = await makeSpace(db, { code: "A" });
    const b = await makeSpace(db, { code: "B" });
    await db.insert(reservations).values(booking(user.userId, a.spaceId, "2026-11-02T01:00Z", "2026-11-02T03:00Z"));
    await db.insert(reservations).values(booking(user.userId, b.spaceId, "2026-11-02T01:00Z", "2026-11-02T03:00Z"));
    expect(await db.$count(reservations)).toBe(2);
  });

  it("does not let a cancelled reservation block the slot", async () => {
    const user = await makeUser(db);
    const space = await makeSpace(db);
    const [first] = await db
      .insert(reservations)
      .values(booking(user.userId, space.spaceId, "2026-11-02T01:00Z", "2026-11-02T03:00Z"))
      .returning();
    await db.update(reservations).set({ status: "cancelled" }).where(eq(reservations.reservationId, first.reservationId));
    await db.insert(reservations).values(booking(user.userId, space.spaceId, "2026-11-02T01:00Z", "2026-11-02T03:00Z"));
    expect(await db.$count(reservations)).toBe(2);
  });

  it("requires a year level for students only", async () => {
    const base = { firstName: "A", lastName: "B", passwordHash: "x" };
    const missing = await errorCode(
      db.insert(users).values({ ...base, schoolId: "1", email: "a@x.test", role: "student", yearLevel: null }),
    );
    expect(missing).toBe("23514");
    const facultyWithYear = await errorCode(
      db.insert(users).values({ ...base, schoolId: "2", email: "b@x.test", role: "faculty", yearLevel: 3 }),
    );
    expect(facultyWithYear).toBe("23514");
  });
});
