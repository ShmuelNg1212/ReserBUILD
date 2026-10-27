import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { parseOrThrow, requireRole, type Actor } from "./accounts";
import type { Db } from "./db";
import { paymentMethod, payments, reservations, type Payment } from "./db/schema";
import { AppError } from "./errors";
import { fromCents, toCents } from "./money";
import { balanceOf, CANCELLED_UNCHECKED_NOTE, expireOverdue, loadOwned, paymentDueAt, type Tx } from "./reservations";

// Pay ahead (ADR 0003). Users submit; staff verify, reject, record, or void.

// A rejected payment is one staff voided before it was ever paid.
export const isRejected = (p: Pick<Payment, "status" | "paidAt" | "note">) =>
  p.status === "voided" && !p.paidAt && p.note !== CANCELLED_UNCHECKED_NOTE;

// The one label for a payment's state, wherever it shows.
export function paymentLabel(p: Pick<Payment, "status" | "paidAt" | "note">) {
  if (p.status === "paid") return { label: "Paid", tone: "ok" as const };
  if (p.status === "pending") return { label: "Being checked", tone: "warn" as const };
  if (isRejected(p)) return { label: "Rejected", tone: "danger" as const };
  return { label: p.paidAt ? "Voided" : "Not checked", tone: "neutral" as const };
}

const reference = z.string().trim().min(1, "Enter the reference number");
const reason = z.string().trim().min(1, "Enter a reason");

const submitSchema = z.object({
  method: z.enum(["e_wallet", "bank_transfer"], "Choose e-wallet or bank transfer"),
  referenceNo: reference,
});

const recordSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 150 or 150.50")
    .transform(toCents)
    .refine((cents) => cents > 0, "Amount must be more than zero"),
  method: z.enum(paymentMethod.enumValues, "Choose a payment method"),
  referenceNo: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
});

// Expire overdue holds, then lock the booking row so concurrent payment
// changes see one balance.
async function lockReservation(tx: Tx, reservationId: number, now: Date) {
  await expireOverdue(tx, now);
  const [r] = await tx
    .select()
    .from(reservations)
    .where(eq(reservations.reservationId, reservationId))
    .for("update");
  if (!r) throw new AppError("NOT_FOUND", "Reservation not found");
  const rows = await tx.select().from(payments).where(eq(payments.reservationId, reservationId));
  return { r, rows, balance: balanceOf(r, rows) };
}

async function loadPayment(db: Db | Tx, paymentId: number) {
  const [p] = await db.select().from(payments).where(eq(payments.paymentId, paymentId));
  if (!p) throw new AppError("NOT_FOUND", "Payment not found");
  return p;
}

// A pending booking with nothing left to pay becomes confirmed.
async function confirmIfSettled(tx: Tx, reservationId: number, now: Date) {
  const { r, balance } = await lockReservation(tx, reservationId, now);
  if (r.status === "pending" && balance === 0) {
    await tx.update(reservations).set({ status: "confirmed" }).where(eq(reservations.reservationId, reservationId));
  }
}

export async function submitPayment(db: Db, actor: Actor | null, reservationId: number, raw: unknown, now = new Date()) {
  const me = requireRole(actor);
  const data = parseOrThrow(submitSchema, raw);
  await loadOwned(db, me, reservationId, now);
  return db.transaction(async (tx) => {
    const { r, rows, balance } = await lockReservation(tx, reservationId, now);
    if (r.status !== "pending" || !r.paymentDueAt || now >= r.paymentDueAt) {
      throw new AppError("BAD_STATUS", "This booking is not waiting for payment");
    }
    if (rows.some((p) => p.status === "pending")) {
      throw new AppError("PAYMENT_WAITING", "Your payment is waiting for staff to check it");
    }
    const [payment] = await tx
      .insert(payments)
      .values({ reservationId, amount: fromCents(balance), status: "pending", submittedAt: now, ...data })
      .returning();
    return payment;
  });
}

export async function verifyPayment(db: Db, actor: Actor | null, paymentId: number, now = new Date()) {
  const admin = requireRole(actor, "admin");
  const p = await loadPayment(db, paymentId);
  return db.transaction(async (tx) => {
    const { r, balance } = await lockReservation(tx, p.reservationId, now);
    const current = await loadPayment(tx, paymentId);
    if (current.status !== "pending") throw new AppError("BAD_STATUS", "Only a pending payment can be verified");
    if (r.status === "cancelled") throw new AppError("BAD_STATUS", "This booking is cancelled");
    if (toCents(current.amount) > balance) throw new AppError("OVERPAYMENT", `The balance is only ₱${fromCents(balance)}`);
    const [paid] = await tx
      .update(payments)
      .set({ status: "paid", paidAt: now, receivedBy: admin.name })
      .where(eq(payments.paymentId, paymentId))
      .returning();
    await confirmIfSettled(tx, p.reservationId, now);
    return paid;
  });
}

export async function rejectPayment(db: Db, actor: Actor | null, paymentId: number, rawReason: unknown) {
  requireRole(actor, "admin");
  const note = parseOrThrow(reason, rawReason);
  const [rejected] = await db
    .update(payments)
    .set({ status: "voided", note })
    .where(and(eq(payments.paymentId, paymentId), eq(payments.status, "pending")))
    .returning();
  if (!rejected) {
    await loadPayment(db, paymentId);
    throw new AppError("BAD_STATUS", "Only a pending payment can be rejected");
  }
  return rejected;
}

// Staff record a payment received at the office, for example cash.
export async function recordPayment(db: Db, actor: Actor | null, reservationId: number, raw: unknown, now = new Date()) {
  const admin = requireRole(actor, "admin");
  const data = parseOrThrow(recordSchema, raw);
  return db.transaction(async (tx) => {
    const { r, balance } = await lockReservation(tx, reservationId, now);
    if (r.status === "cancelled") throw new AppError("BAD_STATUS", "This booking is cancelled");
    if (data.amount > balance) throw new AppError("OVERPAYMENT", `The balance is only ₱${fromCents(balance)}`);
    const [payment] = await tx
      .insert(payments)
      .values({
        reservationId,
        amount: fromCents(data.amount),
        method: data.method,
        referenceNo: data.referenceNo,
        status: "paid",
        submittedAt: now,
        paidAt: now,
        receivedBy: admin.name,
      })
      .returning();
    await confirmIfSettled(tx, reservationId, now);
    return payment;
  });
}

// Undo a paid payment recorded by mistake. A confirmed booking that now owes
// money returns to pending with a new deadline, never earlier than now: close
// to the start, the hold lasts until the start.
export async function voidPayment(db: Db, actor: Actor | null, paymentId: number, rawReason: unknown, now = new Date()) {
  requireRole(actor, "admin");
  const note = parseOrThrow(reason, rawReason);
  const p = await loadPayment(db, paymentId);
  await db.transaction(async (tx) => {
    const { r } = await lockReservation(tx, p.reservationId, now);
    const current = await loadPayment(tx, paymentId);
    if (current.status !== "paid") throw new AppError("BAD_STATUS", "Only a paid payment can be voided");
    await tx.update(payments).set({ status: "voided", note }).where(eq(payments.paymentId, paymentId));
    if (r.status === "confirmed") {
      await tx
        .update(reservations)
        .set({ status: "pending", paymentDueAt: dueAfterVoid(now, r.startAt) })
        .where(eq(reservations.reservationId, r.reservationId));
    }
  });
}

function dueAfterVoid(now: Date, start: Date) {
  const due = paymentDueAt(now, start);
  return due > now ? due : start;
}
