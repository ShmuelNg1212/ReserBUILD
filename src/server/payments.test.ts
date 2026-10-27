import { describe, expect, it } from "vitest";
import { makeSpace, makeStandardRates, makeUser, setupTestDb } from "@/test/db";
import type { Actor } from "./accounts";
import { AppError } from "./errors";
import { recordPayment, rejectPayment, submitPayment, verifyPayment, voidPayment } from "./payments";
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
  // 16:00–18:00 → 100.00 + 150.00 = 250.00. Payment due 2026-11-02 08:00.
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

const detail = (actor: Actor, id: number) => getReservationDetail(db, actor, id, now);
const ewallet = { method: "e_wallet", referenceNo: "GC-123" };

describe("submitPayment", () => {
  it("records the full total as pending, without a receiver", async () => {
    const { user, r } = await setup();
    const p = await submitPayment(db, user, r.reservationId, ewallet, now);
    expect(p).toMatchObject({ amount: "250.00", status: "pending", submittedAt: now, paidAt: null, receivedBy: null });
    const d = await detail(user, r.reservationId);
    expect(d.reservation.status).toBe("pending");
    expect(d.balance).toBe("250.00");
  });

  it("needs a reference number and a non-cash method", async () => {
    const { user, r } = await setup();
    expect(await code(submitPayment(db, user, r.reservationId, { method: "e_wallet", referenceNo: " " }, now))).toBe(
      "INVALID_INPUT",
    );
    expect(await code(submitPayment(db, user, r.reservationId, { method: "cash", referenceNo: "X" }, now))).toBe(
      "INVALID_INPUT",
    );
  });

  it("refuses a second submission while one waits", async () => {
    const { user, r } = await setup();
    await submitPayment(db, user, r.reservationId, ewallet, now);
    expect(await code(submitPayment(db, user, r.reservationId, ewallet, now))).toBe("PAYMENT_WAITING");
  });

  it("refuses after the deadline", async () => {
    const { user, r } = await setup();
    expect(await code(submitPayment(db, user, r.reservationId, ewallet, atLocal("2026-11-02", "08:00")))).toBe(
      "BAD_STATUS",
    );
  });

  it("refuses another user's booking", async () => {
    const { r } = await setup();
    const other = asActor(await makeUser(db, "student"));
    expect(await code(submitPayment(db, other, r.reservationId, ewallet, now))).toBe("NOT_FOUND");
  });
});

describe("verifyPayment and rejectPayment", () => {
  it("confirms the booking when staff verify the full amount", async () => {
    const { user, admin, r } = await setup();
    const p = await submitPayment(db, user, r.reservationId, ewallet, now);
    const later = atLocal("2026-11-01", "09:00");
    const verified = await verifyPayment(db, admin, p.paymentId, later);
    expect(verified).toMatchObject({ status: "paid", paidAt: later, receivedBy: admin.name });
    const d = await detail(user, r.reservationId);
    expect(d.reservation.status).toBe("confirmed");
    expect(d.balance).toBe("0.00");
  });

  it("lets the user submit again after a rejection", async () => {
    const { user, admin, r } = await setup();
    const p = await submitPayment(db, user, r.reservationId, ewallet, now);
    expect(await code(rejectPayment(db, admin, p.paymentId, " "))).toBe("INVALID_INPUT");
    await rejectPayment(db, admin, p.paymentId, "Reference not found in GCash");
    const d = await detail(user, r.reservationId);
    expect(d.payments[0]).toMatchObject({ status: "voided", note: "Reference not found in GCash" });
    expect(d.reservation.status).toBe("pending");
    await submitPayment(db, user, r.reservationId, { method: "e_wallet", referenceNo: "GC-124" }, now);
  });

  it("acts only on a pending payment", async () => {
    const { user, admin, r } = await setup();
    const p = await submitPayment(db, user, r.reservationId, ewallet, now);
    await verifyPayment(db, admin, p.paymentId, now);
    expect(await code(verifyPayment(db, admin, p.paymentId, now))).toBe("BAD_STATUS");
    expect(await code(rejectPayment(db, admin, p.paymentId, "x"))).toBe("BAD_STATUS");
  });

  it("is admin only", async () => {
    const { user, r } = await setup();
    const p = await submitPayment(db, user, r.reservationId, ewallet, now);
    expect(await code(verifyPayment(db, user, p.paymentId, now))).toBe("FORBIDDEN");
    expect(await code(rejectPayment(db, user, p.paymentId, "x"))).toBe("FORBIDDEN");
  });
});

describe("recordPayment (staff, at the office)", () => {
  it("records partial and full cash payments, then confirms", async () => {
    const { user, admin, r } = await setup();
    const first = await recordPayment(db, admin, r.reservationId, { amount: "100", method: "cash" }, now);
    expect(first).toMatchObject({ amount: "100.00", status: "paid", receivedBy: admin.name, paidAt: now });
    expect((await detail(user, r.reservationId)).reservation.status).toBe("pending");
    await recordPayment(db, admin, r.reservationId, { amount: "150.00", method: "cash" }, now);
    const d = await detail(user, r.reservationId);
    expect(d.balance).toBe("0.00");
    expect(d.reservation.status).toBe("confirmed");
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

  it("is admin only", async () => {
    const { user, r } = await setup();
    expect(await code(recordPayment(db, user, r.reservationId, { amount: "10", method: "cash" }, now))).toBe("FORBIDDEN");
  });
});

describe("voidPayment", () => {
  it("returns a confirmed booking to pending with a new deadline", async () => {
    const { user, admin, r } = await setup();
    const p = await recordPayment(db, admin, r.reservationId, { amount: "250", method: "cash" }, now);
    const later = atLocal("2026-11-01", "10:00");
    expect(await code(voidPayment(db, admin, p.paymentId, "", later))).toBe("INVALID_INPUT");
    await voidPayment(db, admin, p.paymentId, "Counted twice", later);
    const d = await getReservationDetail(db, user, r.reservationId, later);
    expect(d.balance).toBe("250.00");
    expect(d.reservation.status).toBe("pending");
    // min(10:00 + 24 h, 16:00 − 2 h on 11-02) = 11-02 10:00
    expect(d.reservation.paymentDueAt).toEqual(atLocal("2026-11-02", "10:00"));
    expect(await code(voidPayment(db, admin, p.paymentId, "again", later))).toBe("BAD_STATUS");
  });

  it("keeps the hold until start when a void comes less than 2 hours before it", async () => {
    const { user, admin, r } = await setup();
    const p = await recordPayment(db, admin, r.reservationId, { amount: "250", method: "cash" }, now);
    const late = atLocal("2026-11-02", "15:00");
    await voidPayment(db, admin, p.paymentId, "Counterfeit note", late);
    const d = await getReservationDetail(db, user, r.reservationId, late);
    expect(d.reservation).toMatchObject({ status: "pending", paymentDueAt: atLocal("2026-11-02", "16:00") });
  });

  it("is admin only", async () => {
    const { user, admin, r } = await setup();
    const p = await recordPayment(db, admin, r.reservationId, { amount: "10", method: "cash" }, now);
    expect(await code(voidPayment(db, user, p.paymentId, "x", now))).toBe("FORBIDDEN");
  });
});
