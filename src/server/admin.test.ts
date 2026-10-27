import { describe, expect, it } from "vitest";
import { makeSpace, makeStandardRates, makeUser, setupTestDb } from "@/test/db";
import type { Actor } from "./accounts";
import { createRate, deleteRate, updateRate, updateSpace } from "./admin";
import { AppError } from "./errors";
import { createReservation } from "./reservations";
import { atLocal } from "./time";

const { db } = setupTestDb();
const asActor = (u: { userId: number; role: Actor["role"] }): Actor => ({ userId: u.userId, role: u.role, name: "T" });

async function code(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
}

const rateInput = {
  spaceId: "",
  dayOfWeek: "",
  startTime: "07:00",
  endTime: "12:00",
  hourlyRate: "120",
  isPeak: "",
  effectiveFrom: "2026-01-01",
  effectiveTo: "",
};

describe("admin", () => {
  it("blocks students and faculty from every admin action", async () => {
    const space = await makeSpace(db);
    for (const role of ["student", "faculty"] as const) {
      const actor = asActor(await makeUser(db, role));
      expect(await code(updateSpace(db, actor, space.spaceId, { name: "x", spaceType: "build", capacity: 1 }))).toBe(
        "FORBIDDEN",
      );
      expect(await code(createRate(db, actor, rateInput))).toBe("FORBIDDEN");
      expect(await code(updateRate(db, actor, 1, rateInput))).toBe("FORBIDDEN");
      expect(await code(deleteRate(db, actor, 1))).toBe("FORBIDDEN");
    }
  });

  it("creates a rate with blank fields as null", async () => {
    const admin = asActor(await makeUser(db, "admin"));
    const rate = await createRate(db, admin, rateInput);
    expect(rate).toMatchObject({ spaceId: null, dayOfWeek: null, hourlyRate: "120.00", isPeak: false, effectiveTo: null });
  });

  it.each([
    ["end before start", { startTime: "12:00", endTime: "07:00" }],
    ["zero rate", { hourlyRate: "0" }],
    ["last day before first day", { effectiveTo: "2025-12-31" }],
    ["bad day", { dayOfWeek: "funday" }],
  ])("rejects a rate with %s", async (_label, overrides) => {
    const admin = asActor(await makeUser(db, "admin"));
    expect(await code(createRate(db, admin, { ...rateInput, ...overrides }))).toBe("INVALID_INPUT");
  });

  it("does not delete a rate that bookings use", async () => {
    const admin = asActor(await makeUser(db, "admin"));
    const space = await makeSpace(db);
    const [offPeak] = await makeStandardRates(db);
    await createReservation(
      db,
      admin,
      { spaceId: space.spaceId, date: "2026-11-02", startTime: "09:00", endTime: "10:00", purpose: "x", headcount: 1 },
      atLocal("2026-11-01", "08:00"),
    );
    expect(await code(deleteRate(db, admin, offPeak.rateId))).toBe("RATE_IN_USE");
    const unused = await createRate(db, admin, { ...rateInput, effectiveFrom: "2027-01-01" });
    await deleteRate(db, admin, unused.rateId);
  });

  it("deactivates a space", async () => {
    const admin = asActor(await makeUser(db, "admin"));
    const space = await makeSpace(db);
    const updated = await updateSpace(db, admin, space.spaceId, { name: "A", spaceType: "build", capacity: 8, isActive: "" });
    expect(updated.isActive).toBe(false);
  });
});
