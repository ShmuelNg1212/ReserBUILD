import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { parseOrThrow, requireRole, type Actor } from "./accounts";
import type { Db } from "./db";
import {
  charges,
  participants,
  payments,
  rates,
  reservations,
  spaces,
  users,
  type Payment,
  type Reservation,
} from "./db/schema";
import { AppError, pgCode } from "./errors";
import { fromCents, toCents } from "./money";
import { priceReservation, PricingError, type PricedCharge } from "./pricing";
import { atLocal, localParts } from "./time";

export const RULES = {
  slotMinutes: 30,
  minMinutes: 60,
  maxMinutes: 8 * 60,
  maxDaysAhead: 30,
  checkInEarlyMinutes: 15,
  payWithinHours: 24,
  payBeforeStartHours: 2,
};

const HOUR = 3_600_000;

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Pay ahead (ADR 0003): 24 h after booking or 2 h before start, whichever is earlier.
export function paymentDueAt(now: Date, start: Date): Date {
  return new Date(Math.min(now.getTime() + RULES.payWithinHours * HOUR, start.getTime() - RULES.payBeforeStartHours * HOUR));
}

// Cancel pending bookings past their deadline with no submitted or paid payment.
// Runs before booking reads and writes, so no background job is needed.
export async function expireOverdue(db: Db | Tx, now: Date) {
  await db
    .update(reservations)
    .set({ status: "cancelled", cancelledAt: now, cancelReason: "Payment was not received by the deadline" })
    .where(
      and(
        eq(reservations.status, "pending"),
        lte(reservations.paymentDueAt, now),
        sql`not exists (select 1 from ${payments} where ${payments.reservationId} = ${reservations.reservationId}
          and ${payments.status} in ('pending', 'paid'))`,
      ),
    );
}

// Statuses that hold a slot. Keep in step with drizzle/0001_reservation_overlap.sql.
export const ACTIVE_STATUSES = ["pending", "confirmed", "checked_in"] as const;

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time as HH:MM");

const bookingSchema = z.object({
  spaceId: z.coerce.number().int().positive("Choose a space"),
  date: z.iso.date("Choose a date"),
  startTime: timeOfDay,
  endTime: timeOfDay,
  purpose: z.string().trim().min(1, "Enter a purpose").max(500),
  headcount: z.coerce.number().int().min(1, "Headcount must be at least 1"),
});

export type BookingInput = z.input<typeof bookingSchema>;

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

const PRICING_MESSAGES: Record<PricingError["code"], string> = {
  INVALID_RANGE: "End time must be after start time",
  CROSSES_DAY: "A booking must start and end on the same day",
  NO_RATE: "The space is not open for part of this time",
  RATE_CONFLICT: "Two rates overlap for this time. Ask an admin to fix the rates",
};

async function validateBooking(db: Db, raw: unknown, now: Date) {
  const input = parseOrThrow(bookingSchema, raw);
  const [startMin, endMin] = [minutesOf(input.startTime), minutesOf(input.endTime)];
  if (startMin % RULES.slotMinutes !== 0 || endMin % RULES.slotMinutes !== 0) {
    throw new AppError("BAD_SLOT", "Bookings start and end on the hour or half hour");
  }
  const duration = endMin - startMin;
  if (duration < RULES.minMinutes || duration > RULES.maxMinutes) {
    throw new AppError("BAD_DURATION", "A booking must be 1 to 8 hours long");
  }
  const start = atLocal(input.date, input.startTime);
  const end = atLocal(input.date, input.endTime);
  if (start <= now) throw new AppError("IN_PAST", "Choose a start time in the future");
  if (start.getTime() - now.getTime() < RULES.payBeforeStartHours * HOUR) {
    throw new AppError("TOO_SOON", "Book at least 2 hours ahead, so there is time to pay");
  }
  if (start.getTime() > now.getTime() + RULES.maxDaysAhead * 86_400_000) {
    throw new AppError("TOO_FAR_AHEAD", "You can book at most 30 days ahead");
  }

  const [space] = await db.select().from(spaces).where(eq(spaces.spaceId, input.spaceId));
  if (!space || !space.isActive) throw new AppError("SPACE_UNAVAILABLE", "This space is not available");
  if (input.headcount > space.capacity) {
    throw new AppError("OVER_CAPACITY", `Space ${space.code} holds at most ${space.capacity} people`);
  }

  const spaceRates = await db
    .select()
    .from(rates)
    .where(or(isNull(rates.spaceId), eq(rates.spaceId, space.spaceId)));
  let priced: ReturnType<typeof priceReservation>;
  try {
    priced = priceReservation({ spaceId: space.spaceId, start, end, rates: spaceRates });
  } catch (e) {
    if (e instanceof PricingError) throw new AppError(e.code, PRICING_MESSAGES[e.code]);
    throw e;
  }
  return { input, space, start, end, ...priced };
}

export type Quote = { total: string; charges: (PricedCharge & { isPeak: boolean })[] };

export async function quoteReservation(db: Db, actor: Actor | null, raw: unknown, now = new Date()): Promise<Quote> {
  requireRole(actor);
  const v = await validateBooking(db, raw, now);
  const peakIds = new Set(
    (await db.select({ id: rates.rateId }).from(rates).where(eq(rates.isPeak, true))).map((r) => r.id),
  );
  return { total: v.total, charges: v.charges.map((c) => ({ ...c, isPeak: peakIds.has(c.rateId) })) };
}

export async function createReservation(db: Db, actor: Actor | null, raw: unknown, now = new Date()) {
  const me = requireRole(actor);
  const v = await validateBooking(db, raw, now);
  await expireOverdue(db, now);
  const slotTaken = () => new AppError("SLOT_TAKEN", `Space ${v.space.code} is already booked for part of this time`);

  // Early check for a clear message. The exclusion constraint is the real guard.
  const clash = await db
    .select({ id: reservations.reservationId })
    .from(reservations)
    .where(
      and(
        eq(reservations.spaceId, v.space.spaceId),
        inArray(reservations.status, [...ACTIVE_STATUSES]),
        lt(reservations.startAt, v.end),
        gt(reservations.endAt, v.start),
      ),
    );
  if (clash.length > 0) throw slotTaken();

  try {
    return await db.transaction(async (tx) => {
      const [reservation] = await tx
        .insert(reservations)
        .values({
          userId: me.userId,
          spaceId: v.space.spaceId,
          startAt: v.start,
          endAt: v.end,
          purpose: v.input.purpose,
          headcount: v.input.headcount,
          status: "pending",
          totalAmount: v.total,
          createdAt: now,
          paymentDueAt: paymentDueAt(now, v.start),
        })
        .returning();
      await tx.insert(charges).values(
        v.charges.map((c) => ({
          reservationId: reservation.reservationId,
          rateId: c.rateId,
          segmentStart: c.segmentStart,
          segmentEnd: c.segmentEnd,
          hours: c.hours,
          rateApplied: c.rateApplied,
          amount: c.amount,
        })),
      );
      return reservation;
    });
  } catch (e) {
    if (pgCode(e) === "23P01") throw slotTaken();
    throw e;
  }
}

// The reservation, if the actor owns it or is an admin. NOT_FOUND otherwise, so
// IDs of other users' bookings do not leak.
export async function loadOwned(db: Db | Tx, actor: Actor, reservationId: number): Promise<Reservation> {
  const [r] = await db.select().from(reservations).where(eq(reservations.reservationId, reservationId));
  if (!r || (r.userId !== actor.userId && actor.role !== "admin")) {
    throw new AppError("NOT_FOUND", "Reservation not found");
  }
  return r;
}

// Users cancel their own unpaid bookings. Once money is involved, only staff
// can cancel, and they record how the refund was handled.
export async function cancelReservation(
  db: Db,
  actor: Actor | null,
  reservationId: number,
  now = new Date(),
  note?: string,
) {
  const me = requireRole(actor);
  const r = await loadOwned(db, me, reservationId);
  if (r.status !== "confirmed" && r.status !== "pending") {
    throw new AppError("BAD_STATUS", "Only an upcoming booking can be cancelled");
  }
  if (now >= r.startAt) throw new AppError("TOO_LATE", "A booking cannot be cancelled after it starts");
  const moneyIn = await db.$count(
    payments,
    and(eq(payments.reservationId, reservationId), inArray(payments.status, ["pending", "paid"])),
  );
  if ((r.status === "confirmed" || moneyIn > 0) && me.role !== "admin") {
    throw new AppError("STAFF_ONLY", "This booking has a payment. Ask the facility office to cancel it");
  }
  const reason = note?.trim() || null;
  if (moneyIn > 0 && !reason) {
    throw new AppError("REFUND_NOTE_REQUIRED", "Write how the payment was refunded");
  }
  await db
    .update(reservations)
    .set({ status: "cancelled", cancelledAt: now, cancelReason: reason })
    .where(eq(reservations.reservationId, reservationId));
}

export async function checkIn(db: Db, actor: Actor | null, reservationId: number, now = new Date()) {
  const me = requireRole(actor);
  const r = await loadOwned(db, me, reservationId);
  if (r.status !== "confirmed") throw new AppError("BAD_STATUS", "Only a confirmed booking can be checked in");
  const opens = r.startAt.getTime() - RULES.checkInEarlyMinutes * 60_000;
  if (now.getTime() < opens || now >= r.endAt) {
    throw new AppError("CHECK_IN_CLOSED", "Check-in opens 15 minutes before the start and closes at the end");
  }
  await db
    .update(reservations)
    .set({ status: "checked_in", checkedInAt: now })
    .where(eq(reservations.reservationId, reservationId));
}

export async function setOutcome(
  db: Db,
  actor: Actor | null,
  reservationId: number,
  outcome: "completed" | "no_show",
  now = new Date(),
) {
  const me = requireRole(actor, "admin");
  const r = await loadOwned(db, me, reservationId);
  if (now < r.endAt) throw new AppError("NOT_ENDED", "This booking has not ended yet");
  const from = outcome === "completed" ? "checked_in" : "confirmed";
  if (r.status !== from) {
    throw new AppError(
      "BAD_STATUS",
      outcome === "completed" ? "Only a checked-in booking can be completed" : "A checked-in booking is not a no-show",
    );
  }
  await db.update(reservations).set({ status: outcome }).where(eq(reservations.reservationId, reservationId));
}

const participantSchema = z.object({
  fullName: z.string().trim().min(1, "Enter a name"),
  email: z
    .union([z.email("Enter a valid email"), z.literal("")])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  affiliation: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function addParticipant(db: Db, actor: Actor | null, reservationId: number, raw: unknown) {
  const me = requireRole(actor);
  const r = await loadOwned(db, me, reservationId);
  if (r.status === "cancelled") throw new AppError("BAD_STATUS", "This booking is cancelled");
  const data = parseOrThrow(participantSchema, raw);
  const count = await db.$count(participants, eq(participants.reservationId, reservationId));
  if (count >= r.headcount) {
    throw new AppError("OVER_HEADCOUNT", `This booking is for ${r.headcount} people`);
  }
  // Link a school account when the email matches one; otherwise external.
  const [match] = data.email
    ? await db.select({ userId: users.userId }).from(users).where(eq(users.email, data.email))
    : [];
  const [p] = await db
    .insert(participants)
    .values({ reservationId, userId: match?.userId ?? null, ...data })
    .returning();
  return p;
}

async function loadOwnedParticipant(db: Db, actor: Actor, participantId: number) {
  const [p] = await db.select().from(participants).where(eq(participants.participantId, participantId));
  if (!p) throw new AppError("NOT_FOUND", "Participant not found");
  await loadOwned(db, actor, p.reservationId);
  return p;
}

export async function removeParticipant(db: Db, actor: Actor | null, participantId: number) {
  const me = requireRole(actor);
  await loadOwnedParticipant(db, me, participantId);
  await db.delete(participants).where(eq(participants.participantId, participantId));
}

export async function setAttended(db: Db, actor: Actor | null, participantId: number, attended: boolean) {
  const me = requireRole(actor);
  await loadOwnedParticipant(db, me, participantId);
  await db.update(participants).set({ attended }).where(eq(participants.participantId, participantId));
}

// A cancelled booking owes nothing. Otherwise: total minus paid payments.
export function balanceOf(reservation: Pick<Reservation, "status" | "totalAmount">, paid: Pick<Payment, "amount" | "status">[]) {
  if (reservation.status === "cancelled") return 0;
  const paidCents = paid.filter((p) => p.status === "paid").reduce((s, p) => s + toCents(p.amount), 0);
  return toCents(reservation.totalAmount) - paidCents;
}

export async function getReservationDetail(db: Db, actor: Actor | null, reservationId: number, now = new Date()) {
  const me = requireRole(actor);
  await expireOverdue(db, now);
  const reservation = await loadOwned(db, me, reservationId);
  const [space] = await db.select().from(spaces).where(eq(spaces.spaceId, reservation.spaceId));
  const [owner] = await db
    .select({ firstName: users.firstName, lastName: users.lastName, email: users.email, schoolId: users.schoolId })
    .from(users)
    .where(eq(users.userId, reservation.userId));
  const chargeRows = await db
    .select({ charge: charges, isPeak: rates.isPeak })
    .from(charges)
    .innerJoin(rates, eq(rates.rateId, charges.rateId))
    .where(eq(charges.reservationId, reservationId))
    .orderBy(asc(charges.segmentStart));
  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.reservationId, reservationId))
    .orderBy(asc(payments.paymentId));
  const participantRows = await db
    .select()
    .from(participants)
    .where(eq(participants.reservationId, reservationId))
    .orderBy(asc(participants.participantId));
  return {
    reservation,
    space,
    owner,
    charges: chargeRows.map((r) => ({ ...r.charge, isPeak: r.isPeak })),
    payments: paymentRows,
    participants: participantRows,
    balance: fromCents(balanceOf(reservation, paymentRows)),
  };
}

const paidTotal = sql<string>`coalesce((select sum(${payments.amount}) from ${payments}
  where ${payments.reservationId} = ${reservations.reservationId} and ${payments.status} = 'paid'), 0)`;

const listColumns = {
  reservation: reservations,
  spaceCode: spaces.code,
  spaceName: spaces.name,
  paid: paidTotal,
};

function withBalance<T extends { reservation: Reservation; paid: string }>(rows: T[]) {
  return rows.map((row) => ({
    ...row,
    balance: fromCents(balanceOf(row.reservation, [{ amount: Number(row.paid).toFixed(2), status: "paid" }])),
  }));
}

export async function listMyReservations(db: Db, actor: Actor | null, now = new Date()) {
  const me = requireRole(actor);
  await expireOverdue(db, now);
  const rows = await db
    .select(listColumns)
    .from(reservations)
    .innerJoin(spaces, eq(spaces.spaceId, reservations.spaceId))
    .where(eq(reservations.userId, me.userId))
    .orderBy(desc(reservations.startAt));
  return withBalance(rows);
}

export async function listAllReservations(db: Db, actor: Actor | null, now = new Date()) {
  requireRole(actor, "admin");
  await expireOverdue(db, now);
  const rows = await db
    .select({ ...listColumns, ownerFirst: users.firstName, ownerLast: users.lastName })
    .from(reservations)
    .innerJoin(spaces, eq(spaces.spaceId, reservations.spaceId))
    .innerJoin(users, eq(users.userId, reservations.userId))
    .orderBy(desc(reservations.startAt));
  return withBalance(rows);
}

// Active bookings for one space on one local date, for the day view.
export async function getDayBookings(db: Db, actor: Actor | null, spaceId: number, date: string, now = new Date()) {
  requireRole(actor);
  await expireOverdue(db, now);
  const dayStart = atLocal(date, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const rows = await db
    .select({ startAt: reservations.startAt, endAt: reservations.endAt, userId: reservations.userId })
    .from(reservations)
    .where(
      and(
        eq(reservations.spaceId, spaceId),
        inArray(reservations.status, [...ACTIVE_STATUSES]),
        lt(reservations.startAt, dayEnd),
        gt(reservations.endAt, dayStart),
      ),
    )
    .orderBy(asc(reservations.startAt));
  return rows.map((r) => ({
    startMinutes: localParts(r.startAt).minutes,
    endMinutes: localParts(r.endAt).minutes,
    mine: r.userId === actor!.userId,
  }));
}
