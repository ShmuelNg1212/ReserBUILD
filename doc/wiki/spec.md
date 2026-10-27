# ReserBUILD spec

Sources: the data model in [../canonical/erd.png](../canonical/erd.png), the plan answers in [../plan/1793084649_reservation_mvp.md](../plan/1793084649_reservation_mvp.md), and ADRs [0001](../adr/0001-admin-role.md), [0002](../adr/0002-own-session-auth.md), [0003](../adr/0003-pay-ahead.md).

## Purpose

ReserBUILD lets Ateneo students and faculty book a campus space for a time, see the exact price, and pay ahead. Staff check payments and manage spaces and rates. The app runs locally only.

## Roles

- `student`, `faculty`: sign up in the app. A student must give a year level (1 to 6); faculty have none.
- `admin` (staff): created by the seed or SQL. Cannot sign up. ADR 0001.

## Entities

As in the ERD, with these additions:

- `users.password_hash` and a `sessions` table. ADR 0002.
- `reservations.payment_due_at`, `reservations.cancel_reason`. ADR 0003.
- `payments.submitted_at`, `payments.note`; `payments.received_by` is null until staff act. ADR 0003.

Enums:

- Reservation status: `pending`, `confirmed`, `checked_in`, `completed`, `cancelled`, `no_show`.
- Payment method: `cash`, `e_wallet`, `bank_transfer`. Payment status: `pending`, `paid`, `voided`.

## Booking rules

- Start and end on the hour or half hour. Length 1 to 8 hours. Start and end on the same local date.
- Start must be at least 2 hours from now, and at most 30 days ahead.
- Headcount 1 to the space capacity. The space must be open for booking (`is_active`).
- Every minute must be covered by a rate. Time with no rate is closed.
- Two active bookings (`pending`, `confirmed`, `checked_in`) for one space cannot overlap. The database enforces this with an exclusion constraint. Back-to-back bookings are allowed.

## Pricing

- The booking is cut at each rate window boundary. Each segment uses one rate and becomes one charge.
- Rate precedence: this space and this day, then this space every day, then all spaces this day, then all spaces every day. A tie at the top fails the booking. See [footguns/rate-precedence.md](footguns/rate-precedence.md).
- Amounts are computed in cents and rounded once per segment. `total_amount` is the sum of the charges.

## Pay ahead (ADR 0003)

- A new booking is `pending` and holds the slot.
- Payment is due 24 hours after booking or 2 hours before start, whichever is earlier.
- The user submits one payment for the full balance with method (e-wallet or bank transfer) and reference number. It is `pending`. Only one pending payment at a time.
- Staff verify (`paid`, with `received_by` and `paid_at`) or reject (`voided`, with a reason). The user can submit again before the deadline.
- Staff can record an office payment (for example cash) as `paid` at once, up to the balance.
- When the paid total reaches the booking total, a `pending` booking becomes `confirmed`.
- At the deadline, a `pending` booking with no `pending` or `paid` payment is cancelled with a reason. The sweep runs before every booking read and write.
- Staff can void a paid payment with a reason. A `confirmed` booking then returns to `pending` with a new deadline.
- Balance: the total minus `paid` payments; 0 for a cancelled booking.

## Cancellation

- Only `pending` or `confirmed` bookings, and only before start.
- A user can cancel their own booking only while no payment is pending or paid.
- Otherwise only staff can cancel, and they must write how the refund was handled. Refunds happen outside the app.

## Check-in and outcome

- Check-in needs `confirmed`. It opens 15 minutes before start and closes at end.
- After end, staff mark `completed` (from `checked_in`) or `no_show` (from `confirmed`).

## Participants

- Up to the headcount. A participant whose email matches an account is linked to it; otherwise the participant is a guest.
- The owner or staff can add, remove, and mark attendance.

## Rates and spaces (staff)

- Staff add, edit, and delete rates. A rate that charges use cannot be deleted; set its last day instead.
- Staff edit a space's name, type, capacity, and whether it is open for booking.

## Open questions

- Payment account details (e-wallet and bank) for users to pay into. Not known; the app tells users to ask the facility office. Fill `src/lib/payment-info.ts` when known.
- Refund amounts are not recorded in the app.
