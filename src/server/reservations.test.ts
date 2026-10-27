import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { makeSpace, makeStandardRates, makeUser, setupTestDb } from "@/test/db";
import type { Actor } from "./accounts";
import { charges, reservations } from "./db/schema";
import { AppError } from "./errors";
import { listPendingPayments } from "./admin";
import { recordPayment, submitPayment, verifyPayment } from "./payments";
import {
  addParticipant,
  cancelReservation,
  checkIn,
  createReservation,
  getReservationDetail,
  quoteReservation,
  removeParticipant,
  setAttended,
  setOutcome,
} from "./reservations";
import { atLocal } from "./time";

const { db, pool } = setupTestDb();

// "Now" is Sunday 2026-11-01 08:00 Manila. Bookings are on Monday 2026-11-02.
const now = atLocal("2026-11-01", "08:00");

const asActor = (u: { userId: number; role: Actor["role"] }): Actor => ({ userId: u.userId, role: u.role, name: "T" });

async function setup() {
  const user = await makeUser(db, "student");
  const admin = await makeUser(db, "admin");
  const space = await makeSpace(db, { capacity: 6 });
  await makeStandardRates(db);
  return { user: asActor(user), admin: asActor(admin), space };
}

function input(spaceId: number, overrides: Record<string, unknown> = {}) {
  return {
    spaceId: String(spaceId),
    date: "2026-11-02",
    startTime: "16:00",
    endTime: "18:00",
    purpose: "Capstone build",
    headcount: "3",
    ...overrides,
  };
}

// Pay and verify, so the booking becomes confirmed.
async function confirm(user: Actor, admin: Actor, reservationId: number) {
  const p = await submitPayment(db, user, reservationId, { method: "e_wallet", referenceNo: "REF-1" }, now);
  await verifyPayment(db, admin, p.paymentId, now);
}

async function code(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
}

describe("createReservation", () => {
  it("creates a pending booking with a payment deadline and one charge per rate segment", async () => {
    const { user, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId), now);
    expect(r.status).toBe("pending");
    // 24 h after booking (11-02 08:00) is earlier than 2 h before start (11-02 14:00).
    expect(r.paymentDueAt).toEqual(atLocal("2026-11-02", "08:00"));
    expect(r.totalAmount).toBe("250.00"); // 1 h × 100 + 1 h × 150
    const rows = await db.select().from(charges).where(eq(charges.reservationId, r.reservationId));
    expect(rows.map((c) => c.amount).sort()).toEqual(["100.00", "150.00"]);
  });

  it("quotes the same price without writing", async () => {
    const { user, space } = await setup();
    const quote = await quoteReservation(db, user, input(space.spaceId), now);
    expect(quote.total).toBe("250.00");
    expect(quote.charges).toHaveLength(2);
    expect(await db.$count(reservations)).toBe(0);
  });

  it.each([
    ["start not on a half hour", { startTime: "16:15" }, "BAD_SLOT"],
    ["shorter than 1 hour", { endTime: "16:30" }, "BAD_DURATION"],
    ["longer than 8 hours", { startTime: "08:00", endTime: "16:30" }, "BAD_DURATION"],
    ["end before start", { startTime: "18:00", endTime: "16:00" }, "BAD_DURATION"],
    ["in the past", { date: "2026-11-01", startTime: "07:00", endTime: "08:00" }, "IN_PAST"],
    ["less than 2 hours ahead", { date: "2026-11-01", startTime: "09:30", endTime: "10:30" }, "TOO_SOON"],
    ["more than 30 days ahead", { date: "2026-12-02" }, "TOO_FAR_AHEAD"],
    ["headcount above capacity", { headcount: "7" }, "OVER_CAPACITY"],
    ["headcount zero", { headcount: "0" }, "INVALID_INPUT"],
    ["outside rate hours", { startTime: "21:00", endTime: "23:00" }, "NO_RATE"],
  ])("rejects a booking %s", async (_label, overrides, expected) => {
    const { user, space } = await setup();
    expect(await code(createReservation(db, user, input(space.spaceId, overrides), now))).toBe(expected);
  });

  it("allows a booking exactly 30 days ahead", async () => {
    const { user, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId, { date: "2026-12-01", startTime: "07:00", endTime: "08:00" }), now);
    expect(r.reservationId).toBeGreaterThan(0);
  });

  it("rejects an inactive space", async () => {
    const { user } = await setup();
    const closed = await makeSpace(db, { code: "B", isActive: false });
    expect(await code(createReservation(db, user, input(closed.spaceId), now))).toBe("SPACE_UNAVAILABLE");
  });

  it("rejects an overlapping booking with a clear code", async () => {
    const { user, space } = await setup();
    await createReservation(db, user, input(space.spaceId), now);
    expect(await code(createReservation(db, user, input(space.spaceId, { startTime: "17:00", endTime: "19:00" }), now))).toBe(
      "SLOT_TAKEN",
    );
  });

  it("maps a booking that only the database constraint catches to SLOT_TAKEN", async () => {
    const { user, space } = await setup();
    // Another request has inserted a clashing booking but not committed yet,
    // so the early check cannot see it. Our insert must wait on the constraint.
    const other = await pool.connect();
    try {
      await other.query("begin");
      await other.query(
        `insert into reservations (user_id, space_id, start_at, end_at, purpose, headcount, total_amount)
         values ($1, $2, $3, $4, 'other', 1, 100)`,
        [user.userId, space.spaceId, atLocal("2026-11-02", "17:00"), atLocal("2026-11-02", "17:30")],
      );
      const attempt = code(createReservation(db, user, input(space.spaceId), now));
      await new Promise((resolve) => setTimeout(resolve, 300));
      await other.query("commit");
      expect(await attempt).toBe("SLOT_TAKEN");
    } finally {
      other.release();
    }
    expect(await db.$count(reservations)).toBe(1);
    expect(await db.$count(charges)).toBe(0);
  });

  it("gives exactly one booking when parallel requests ask for one slot", async () => {
    const { user, space } = await setup();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => createReservation(db, user, input(space.spaceId), now)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.$count(reservations)).toBe(1);
  });

  it("requires a signed-in user", async () => {
    const { space } = await setup();
    expect(await code(createReservation(db, null, input(space.spaceId), now))).toBe("UNAUTHENTICATED");
  });
});

describe("cancelReservation", () => {
  it("cancels before start, frees the slot, and owes nothing", async () => {
    const { user, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId), now);
    await cancelReservation(db, user, r.reservationId, now);
    const detail = await getReservationDetail(db, user, r.reservationId);
    expect(detail.reservation.status).toBe("cancelled");
    expect(detail.reservation.cancelledAt).toEqual(now);
    expect(detail.charges).toHaveLength(2);
    expect(detail.balance).toBe("0.00");
    await createReservation(db, user, input(space.spaceId), now);
  });

  it("refuses after the start time", async () => {
    // A paid booking, so the deadline sweep does not cancel it first.
    const { user, admin, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId), now);
    await confirm(user, admin, r.reservationId);
    expect(await code(cancelReservation(db, admin, r.reservationId, atLocal("2026-11-02", "16:00"), "n/a"))).toBe(
      "TOO_LATE",
    );
  });

  it("refuses another user's reservation, but allows an admin", async () => {
    const { user, admin, space } = await setup();
    const other = asActor(await makeUser(db, "faculty"));
    const r = await createReservation(db, user, input(space.spaceId), now);
    expect(await code(cancelReservation(db, other, r.reservationId, now))).toBe("NOT_FOUND");
    await cancelReservation(db, admin, r.reservationId, now);
  });
});

describe("staff-only cancellation of paid bookings", () => {
  it("does not let a user cancel a confirmed booking", async () => {
    const { user, admin, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId), now);
    await confirm(user, admin, r.reservationId);
    expect(await code(cancelReservation(db, user, r.reservationId, now))).toBe("STAFF_ONLY");
  });

  it("needs a refund note from the admin when payments exist", async () => {
    const { user, admin, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId), now);
    await confirm(user, admin, r.reservationId);
    expect(await code(cancelReservation(db, admin, r.reservationId, now))).toBe("REFUND_NOTE_REQUIRED");
    await cancelReservation(db, admin, r.reservationId, now, "Refunded ₱250 by GCash, ref R-9");
    const detail = await getReservationDetail(db, admin, r.reservationId, now);
    expect(detail.reservation).toMatchObject({ status: "cancelled", cancelReason: "Refunded ₱250 by GCash, ref R-9" });
    expect(detail.balance).toBe("0.00");
  });

  it("lets a user cancel a pending booking while a payment is being checked", async () => {
    const { user, admin, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId), now);
    await submitPayment(db, user, r.reservationId, { method: "e_wallet", referenceNo: "GC-5" }, now);
    await cancelReservation(db, user, r.reservationId, now);
    const detail = await getReservationDetail(db, admin, r.reservationId, now);
    expect(detail.reservation.status).toBe("cancelled");
    // The unchecked payment leaves the staff queue with a note to refund it if the money arrived.
    expect(detail.payments[0]).toMatchObject({ status: "voided" });
    expect(detail.payments[0].note).toMatch(/refund/i);
    expect(await listPendingPayments(db, admin)).toHaveLength(0);
  });
});

describe("payment deadline", () => {
  const afterDue = atLocal("2026-11-02", "08:00");

  it("cancels an unpaid booking at the deadline and frees the slot", async () => {
    const { user, space } = await setup();
    const other = asActor(await makeUser(db, "faculty"));
    const r = await createReservation(db, user, input(space.spaceId), now);
    const again = await createReservation(db, other, input(space.spaceId), afterDue);
    expect(again.status).toBe("pending");
    const old = await getReservationDetail(db, user, r.reservationId, afterDue);
    expect(old.reservation).toMatchObject({ status: "cancelled", cancelledAt: afterDue });
    expect(old.reservation.cancelReason).toMatch(/payment/i);
  });

  it("keeps the hold while a submitted payment waits for staff", async () => {
    const { user, space } = await setup();
    const other = asActor(await makeUser(db, "faculty"));
    const r = await createReservation(db, user, input(space.spaceId), now);
    await submitPayment(db, user, r.reservationId, { method: "bank_transfer", referenceNo: "BT-1" }, now);
    expect(await code(createReservation(db, other, input(space.spaceId), afterDue))).toBe("SLOT_TAKEN");
    expect((await getReservationDetail(db, user, r.reservationId, afterDue)).reservation.status).toBe("pending");
  });

  it("expires an overdue booking before staff can record a payment on it", async () => {
    const { user, admin, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId), now);
    expect(await code(recordPayment(db, admin, r.reservationId, { amount: "250", method: "cash" }, afterDue))).toBe(
      "BAD_STATUS",
    );
    expect((await getReservationDetail(db, admin, r.reservationId, afterDue)).reservation.status).toBe("cancelled");
  });

  it("uses 2 hours before start when that is earlier", async () => {
    const { user, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId, { date: "2026-11-01", startTime: "12:00", endTime: "13:00" }), now);
    expect(r.paymentDueAt).toEqual(atLocal("2026-11-01", "10:00"));
  });
});

describe("checkIn", () => {
  it("opens 15 minutes before start and closes at end", async () => {
    const { user, space } = await setup();
    const { admin } = { admin: asActor(await makeUser(db, "admin")) };
    const r = await createReservation(db, user, input(space.spaceId), now);
    await confirm(user, admin, r.reservationId);
    expect(await code(checkIn(db, user, r.reservationId, atLocal("2026-11-02", "15:44")))).toBe("CHECK_IN_CLOSED");
    expect(await code(checkIn(db, user, r.reservationId, atLocal("2026-11-02", "18:00")))).toBe("CHECK_IN_CLOSED");
    await checkIn(db, user, r.reservationId, atLocal("2026-11-02", "15:45"));
    const detail = await getReservationDetail(db, user, r.reservationId);
    expect(detail.reservation.status).toBe("checked_in");
    expect(detail.reservation.checkedInAt).toEqual(atLocal("2026-11-02", "15:45"));
  });

  it("refuses check-in while the booking is unpaid", async () => {
    const { user, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId, { date: "2026-11-01", startTime: "12:00", endTime: "13:00" }), now);
    await submitPayment(db, user, r.reservationId, { method: "e_wallet", referenceNo: "X" }, now);
    expect(await code(checkIn(db, user, r.reservationId, atLocal("2026-11-01", "12:00")))).toBe("BAD_STATUS");
  });

  it("refuses a cancelled reservation", async () => {
    const { user, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId), now);
    await cancelReservation(db, user, r.reservationId, now);
    expect(await code(checkIn(db, user, r.reservationId, atLocal("2026-11-02", "16:00")))).toBe("BAD_STATUS");
  });
});

describe("setOutcome", () => {
  it("lets an admin complete a checked-in reservation after it ends", async () => {
    const { user, admin, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId), now);
    await confirm(user, admin, r.reservationId);
    await checkIn(db, user, r.reservationId, atLocal("2026-11-02", "16:00"));
    expect(await code(setOutcome(db, admin, r.reservationId, "completed", atLocal("2026-11-02", "17:00")))).toBe("NOT_ENDED");
    await setOutcome(db, admin, r.reservationId, "completed", atLocal("2026-11-02", "18:00"));
    expect((await getReservationDetail(db, admin, r.reservationId)).reservation.status).toBe("completed");
  });

  it("marks an unchecked reservation as no-show, and never completed", async () => {
    const { user, admin, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId), now);
    await confirm(user, admin, r.reservationId);
    const after = atLocal("2026-11-02", "19:00");
    expect(await code(setOutcome(db, admin, r.reservationId, "completed", after))).toBe("BAD_STATUS");
    await setOutcome(db, admin, r.reservationId, "no_show", after);
  });

  it("is admin only", async () => {
    const { user, space } = await setup();
    const r = await createReservation(db, user, input(space.spaceId), now);
    expect(await code(setOutcome(db, user, r.reservationId, "no_show", atLocal("2026-11-02", "19:00")))).toBe("FORBIDDEN");
  });
});

describe("participants", () => {
  it("adds internal and external participants up to the headcount", async () => {
    const { user, space } = await setup();
    const classmate = await makeUser(db, "student");
    const r = await createReservation(db, user, input(space.spaceId, { headcount: "2" }), now);

    const internal = await addParticipant(db, user, r.reservationId, { fullName: "Classmate", email: classmate.email.toUpperCase() });
    expect(internal.userId).toBe(classmate.userId);
    const external = await addParticipant(db, user, r.reservationId, { fullName: "Guest", email: "guest@other.org", affiliation: "Other U" });
    expect(external.userId).toBeNull();

    expect(await code(addParticipant(db, user, r.reservationId, { fullName: "Third" }))).toBe("OVER_HEADCOUNT");

    await setAttended(db, user, external.participantId, true);
    await removeParticipant(db, user, internal.participantId);
    const detail = await getReservationDetail(db, user, r.reservationId);
    expect(detail.participants.map((p) => [p.fullName, p.attended])).toEqual([["Guest", true]]);
  });

  it("refuses changes from someone who does not own the reservation", async () => {
    const { user, space } = await setup();
    const other = asActor(await makeUser(db, "student"));
    const r = await createReservation(db, user, input(space.spaceId), now);
    const p = await addParticipant(db, user, r.reservationId, { fullName: "Guest" });
    expect(await code(addParticipant(db, other, r.reservationId, { fullName: "X" }))).toBe("NOT_FOUND");
    expect(await code(removeParticipant(db, other, p.participantId))).toBe("NOT_FOUND");
    expect(await code(setAttended(db, other, p.participantId, true))).toBe("NOT_FOUND");
  });
});

describe("getReservationDetail", () => {
  it("hides another user's reservation", async () => {
    const { user, space } = await setup();
    const other = asActor(await makeUser(db, "student"));
    const r = await createReservation(db, user, input(space.spaceId), now);
    expect(await code(getReservationDetail(db, other, r.reservationId))).toBe("NOT_FOUND");
  });
});
