# Plan: ReserBUILD MVP (local only)

Study: [../study/1793084609_reservation_mvp.md](../study/1793084609_reservation_mvp.md)
Branch: `feat/reservation-mvp`
Mode: mixed. Technical tasks 1–6 first, then design tasks 7–8.

## OPEN QUESTIONS

Each question has a default. Execute uses the default if the human does not answer.

1. **Admin role.** Who manages spaces and rates and records payments? Default: add `admin` to `User.role`. This changes the ERD, so it needs an ADR.
2. **Time zone and currency.** Default: `Asia/Manila` and PHP (₱). Tell me if this is wrong.
3. **Rate precedence.** When rates overlap, which rate wins? Default: a rate for the space beats an all-spaces rate. Then a rate for the day beats a daily rate. If two rates still tie, the booking fails and the admin must fix the rates.
4. **Rates by role.** Do students and faculty pay different rates? Default: no. The ERD has no role column on Rates.
5. **Booking approval.** Does a booking need admin approval? Default: no. A new booking is `confirmed`. It becomes `pending` only if a later version adds approval.
6. **Payment timing.** Can a user check in before paying in full? Default: yes. The reservation shows a balance. The admin records payments at any time.
7. **Booking limits.** Default: bookings start on the hour or half hour; minimum 1 hour; maximum 8 hours; at most 30 days ahead; no booking in the past.
8. **Cancellation.** Default: the user can cancel before `start_at`. A cancelled booking keeps its charges for the record but owes nothing.
9. **Enums.** Default values as in the study (reservation, payment method, payment status).

## Tasks

### 1. Scaffold — `tests: alongside`
- [ ] Create the Next.js 16 app (TypeScript, App Router, Tailwind, ESLint) in the repo root.
- [ ] Add Vitest. `npm test` runs all tests.
- [ ] Add Drizzle and drizzle-kit. Read `DATABASE_URL` from `.env.local`. Add `.env.example`.
- [ ] Create the databases `reserbuild` and `reserbuild_test`.
- [ ] Write `doc/wiki/setup.md`: install, env, migrate, seed, run, test.

Done when: `npm run dev` serves a page, `npm test` passes one smoke test, and `doc/wiki/setup.md` has every command.

### 2. Schema and seed — `tests: first`
- [ ] Write the Drizzle schema for all 7 ERD tables, with the enums from the answers. Money is `numeric(10,2)`. Times are `timestamptz`.
- [ ] Add `btree_gist` and the overlap exclusion constraint on `reservation`.
- [ ] Add checks: `end_at > start_at`; `headcount > 0`; `rates.end_time > start_time`.
- [ ] Seed: spaces A–D (2 `build`, 2 `meeting`), one admin, one student, one faculty user, and a rate table with off-peak and peak windows.
- [ ] Write ADR `doc/adr/0001-admin-role.md` if question 1 adds the role.

Done when: an integration test proves that two overlapping active reservations for one space fail, and that a cancelled one does not block.

### 3. Pricing engine — `tests: first`
- [ ] Write a pure function `priceReservation(space, start, end, rates) → charges[]`.
- [ ] Test: one window; a booking that crosses off-peak to peak; day-specific beats daily; space-specific beats all-spaces; `effective_from`/`effective_to` edges; a gap with no rate fails; a tie fails; cent rounding.
- [ ] Add `doc/wiki/footguns/` notes for rate precedence and the time zone.

Done when: all pricing tests pass and the function has no database access.

### 4. Auth — `tests: first`
- [ ] Add Better Auth with email and password. Store sessions in Postgres.
- [ ] Sign-up form collects the ERD User fields. `year_level` is required for students and null for faculty.
- [ ] Add a helper `requireUser(role?)` for server actions and pages.

Done when: tests prove that a non-admin cannot call an admin action, and a signed-out user is redirected from booking pages.

### 5. Booking — `tests: first`
- [ ] Server action: check availability for a space and a time.
- [ ] Server action: create a reservation. Check limits, capacity, and overlap. Price it with task 3. Write the reservation and its charges in one transaction.
- [ ] Server actions: cancel, check in, add and remove participants, mark attendance.
- [ ] Map the overlap constraint error to a clear message.

Done when: tests cover each rule in OPEN QUESTIONS 5–8, and a race test (two parallel creates) gives exactly one booking.

### 6. Payments — `tests: first`
- [ ] Admin server action: record a payment (amount, method, reference, received by). Void a payment.
- [ ] Balance = `total_amount` − sum of `paid` payments. Refuse a payment above the balance.

Done when: tests cover partial payment, full payment, overpayment refused, and void.

### 7. Design study — design pass
- [ ] Run `/impeccable init` to write PRODUCT.md. The human answers its questions.
- [ ] Run `/impeccable shape` for the booking flow. Record the surfaces below as the brief.

Done when: PRODUCT.md exists and the shape brief lists each surface.

### 8. UI — `tests: alongside`
- [ ] Spaces page: the 4 spaces with type, capacity, and a day view of free and booked times.
- [ ] Booking form: space, date, start, end, purpose, headcount. Shows the live price breakdown by charge.
- [ ] My reservations: upcoming and past, with status and balance.
- [ ] Reservation detail: charges, payments, participants, cancel and check-in.
- [ ] Admin: spaces (edit, deactivate), rates (CRUD), reservations list, record payment.
- [ ] Run `/impeccable [feature]` per surface. Run `/impeccable document` once to write DESIGN.md.

Done when: a browser probe signs in as the seeded student, books a space across a peak boundary, sees two charges, and the admin records a payment that sets the balance to zero.

## Rendezvous checklist
- [ ] `npm test` passes.
- [ ] `code-review`, `simplify`, `security-review` (auth and money change).
- [ ] `/impeccable critique`, `/impeccable audit`, `/impeccable polish`; `break-ui` on lists and the booking form.
- [ ] Browser probe from task 8 passes. Record the result here.
- [ ] Merge to main locally.

## Sync docs
- [ ] Update `doc/wiki/spec.md` with the answered questions. Remove them from its open questions.
- [ ] Write `doc/wiki/architecture.md`.
