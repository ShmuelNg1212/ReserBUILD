import { eq } from "drizzle-orm";
import { z } from "zod";
import { parseOrThrow, requireRole, type Actor } from "./accounts";
import type { Db } from "./db";
import { paymentMethod, payments, reservations } from "./db/schema";
import { AppError } from "./errors";
import { fromCents, toCents } from "./money";
import { balanceOf } from "./reservations";

const paymentSchema = z.object({
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

export async function recordPayment(
  db: Db,
  actor: Actor | null,
  reservationId: number,
  raw: unknown,
  now = new Date(),
) {
  const admin = requireRole(actor, "admin");
  const data = parseOrThrow(paymentSchema, raw);
  return db.transaction(async (tx) => {
    // Lock the reservation so two payments cannot both pass the balance check.
    const [r] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.reservationId, reservationId))
      .for("update");
    if (!r) throw new AppError("NOT_FOUND", "Reservation not found");
    if (r.status === "cancelled") throw new AppError("BAD_STATUS", "This booking is cancelled");
    const existing = await tx.select().from(payments).where(eq(payments.reservationId, reservationId));
    const balance = balanceOf(r, existing);
    if (data.amount > balance) {
      throw new AppError("OVERPAYMENT", `The balance is only ₱${fromCents(balance)}`);
    }
    const [payment] = await tx
      .insert(payments)
      .values({
        reservationId,
        amount: fromCents(data.amount),
        method: data.method,
        referenceNo: data.referenceNo,
        status: "paid",
        paidAt: now,
        receivedBy: admin.name,
      })
      .returning();
    return payment;
  });
}

export async function voidPayment(db: Db, actor: Actor | null, paymentId: number) {
  requireRole(actor, "admin");
  const [p] = await db.select().from(payments).where(eq(payments.paymentId, paymentId));
  if (!p) throw new AppError("NOT_FOUND", "Payment not found");
  if (p.status !== "paid") throw new AppError("BAD_STATUS", "Only a paid payment can be voided");
  await db.update(payments).set({ status: "voided" }).where(eq(payments.paymentId, paymentId));
}
