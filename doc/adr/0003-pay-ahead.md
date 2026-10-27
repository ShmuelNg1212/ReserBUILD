# 0003: Users pay ahead; staff verify

Date: 2026-10-27. Status: accepted. Replaces plan answers 5 and 6.

## Context

Several staff run ReserBUILD. Users pay ahead by e-wallet or bank transfer. Staff must check each payment reference before the booking is final.

## Decision

- A new booking is `pending`. It holds the slot.
- Payment is due 24 hours after booking, or 2 hours before start, whichever is earlier (`reservations.payment_due_at`). A booking that starts less than 2 hours from now is refused.
- The user submits one payment for the full total, with method and reference number. It is `pending` until staff act.
- Any admin verifies (`paid`, with `received_by` and `paid_at`) or rejects (`voided`, with a note) the payment. When the paid total reaches the booking total, the booking becomes `confirmed`.
- An admin can record a cash payment as `paid` at once.
- At the deadline, a `pending` booking with no `pending` or `paid` payment is cancelled with a reason. The sweep runs before every booking read and write, so the slot frees without a background job.
- Check-in needs `confirmed`.
- A user can cancel a `pending` booking before start. Only an admin can cancel a `confirmed` booking; if it has paid payments, the admin must write a refund note. Refunds happen outside the app.
- If an admin voids a paid payment on a `confirmed` booking, the booking returns to `pending` with a new deadline.

## Consequences

- `payments.received_by` is nullable until verification. New columns: `payments.submitted_at`, `payments.note`, `reservations.payment_due_at`, `reservations.cancel_reason`.
- No refund amounts are stored.
- An admin should verify payments before the start. A pending payment keeps the hold past the deadline.
