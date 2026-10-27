import { describe, expect, it } from "vitest";
import { makeSpace, makeStandardRates, makeUser, setupTestDb } from "@/test/db";
import type { Actor } from "./accounts";
import { AppError } from "./errors";
import { recordPayment, voidPayment } from "./payments";
import { cancelReservation, createReservation, getReservationDetail } from "./reservations";
import { atLocal } from "./time";

const { db } = setupTestDb();
const now = atLocal("2026-11-01", "08:00");
const asActor = (u: { userId: number; role: Actor["role"]; firstName: string; lastName: string }): Actor => ({
  userId: u.userId,
  role: u.role,
  name: `${u.firstName} ${u.lastName}`,
});

async function setup() {
  const user = asActor(await makeUser(db, "student"));
  const admin = asActor(await makeUser(db, "admin"));
  const space = await makeSpace(db);
  await makeStandardRates(db);
  // 16:00–18:00 → 100.00 + 150.00 = 250.00
  const r = await createReservation(
    db,
    user,
    { spaceId: space.spaceId, date: "2026-11-02", startTime: "16:00", endTime: "18:00", purpose: "x", headcount: 2 },
    now,
  );
  return { user, admin, r };
}

async function code(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
}

const balance = async (actor: Actor, id: number) => (await getReservationDetail(db, actor, id)).balance;

describe("payments", () => {
  it("records partial and full payments against the balance", async () => {
    const { admin, r } = await setup();
    const first = await recordPayment(db, admin, r.reservationId, { amount: "100", method: "cash" }, now);
    expect(first).toMatchObject({ amount: "100.00", status: "paid", receivedBy: admin.name, paidAt: now });
    expect(await balance(admin, r.reservationId)).toBe("150.00");
    await recordPayment(db, admin, r.reservationId, { amount: "150.00", method: "e_wallet", referenceNo: "GC-123" }, now);
    expect(await balance(admin, r.reservationId)).toBe("0.00");
  });

  it("refuses an overpayment", async () => {
    const { admin, r } = await setup();
    expect(await code(recordPayment(db, admin, r.reservationId, { amount: "250.01", method: "cash" }, now))).toBe(
      "OVERPAYMENT",
    );
  });

  it.each(["0", "-5", "abc", "1.234"])("refuses the amount %s", async (amount) => {
    const { admin, r } = await setup();
    expect(await code(recordPayment(db, admin, r.reservationId, { amount, method: "cash" }, now))).toBe("INVALID_INPUT");
  });

  it("refuses a payment on a cancelled booking", async () => {
    const { user, admin, r } = await setup();
    await cancelReservation(db, user, r.reservationId, now);
    expect(await code(recordPayment(db, admin, r.reservationId, { amount: "10", method: "cash" }, now))).toBe(
      "BAD_STATUS",
    );
  });

  it("restores the balance when a payment is voided", async () => {
    const { admin, r } = await setup();
    const p = await recordPayment(db, admin, r.reservationId, { amount: "250", method: "bank_transfer" }, now);
    await voidPayment(db, admin, p.paymentId);
    expect(await balance(admin, r.reservationId)).toBe("250.00");
    expect(await code(voidPayment(db, admin, p.paymentId))).toBe("BAD_STATUS");
  });

  it("is admin only", async () => {
    const { user, admin, r } = await setup();
    expect(await code(recordPayment(db, user, r.reservationId, { amount: "10", method: "cash" }, now))).toBe("FORBIDDEN");
    const p = await recordPayment(db, admin, r.reservationId, { amount: "10", method: "cash" }, now);
    expect(await code(voidPayment(db, user, p.paymentId))).toBe("FORBIDDEN");
  });
});
