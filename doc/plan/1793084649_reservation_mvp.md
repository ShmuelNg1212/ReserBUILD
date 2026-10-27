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

## OPEN QUESTIONS, ROUND 2 (from `/impeccable init`, 2026-10-27)

The human said: several staff run the app, and **users pay ahead**. This replaces the answers to questions 5 and 6. Approved 2026-10-27 with all defaults and neutral colors. ADR 0003.

10. **Hold.** Default: a new booking is `pending`. It holds the slot (the overlap constraint already counts `pending`).
11. **Deadline.** Default: the user must submit payment within 24 hours of booking, or by 2 hours before start, whichever is earlier. After that, the booking is cancelled automatically and the slot is free. A booking made less than 2 hours before start is refused.
12. **Submit payment.** Default: the user submits the full total, the method (e-wallet or bank transfer), and the reference number. This makes a payment with status `pending`. No partial payments from users.
13. **Verify.** Default: any admin checks the reference and marks the payment `paid`. `received_by` is that admin, and the time is recorded. When the paid total equals the booking total, the booking becomes `confirmed`. An admin can also reject a payment (`voided`) with a reason; the user can then submit again before the deadline. `received_by` becomes nullable until verification.
14. **Cash.** Default: an admin can still record a cash payment at the office as `paid` at once.
15. **Check-in.** Default: only a `confirmed` (fully paid) booking can be checked in.
16. **Cancellation and refunds.** Default: a user can cancel a `pending` booking at any time before start. A paid (`confirmed`) booking can be cancelled only by an admin. The admin handles any refund outside the app, and the app records "refunded outside the app" with a note. No refund amounts are modelled.
17. **Brand assets.** Ateneo de Manila branding is binding. Default: the UI uses neutral tokens until the official logo and brand guide are placed in `doc/canonical/brand/`. Nobody draws or guesses the logo or official colors.

## DECISIONS DURING EXECUTE

- OPEN QUESTIONS 1–9: the human said "go". All defaults apply.
- Auth: own scrypt + session table, not Better Auth. Better Auth needs string user IDs; the ERD uses integers. ADR 0002.
- `cacheComponents` is off in `next.config.ts`. Every page reads the session.
- Check-in opens 15 minutes before start and closes at end.
- Outcome: after end, an admin marks `completed` (from `checked_in`) or `no_show` (from `confirmed`).
- A participant whose email matches a user account is linked to it; otherwise external.
- A rate used by charges cannot be deleted. The admin sets its last day.
- Refunds are not modelled. Cancelling a paid booking sets its balance to 0 but keeps the payments. Open for a later plan.
- Booking has a review step (`/book/review`) for the purpose field and the charge tally before commit.
- Participants are capped at the headcount; sign-up limits year level to 1 to 6.
- Payment account details are unknown. `src/lib/payment-info.ts` is empty; the app tells users to ask the facility office.
- The race test first passed without the constraint, because the early check caught every request. It now holds an uncommitted clashing insert in a second connection. Checked: it fails with the constraint removed.

## Tasks

### 1. Scaffold — `tests: alongside`
- [x] Create the Next.js 16 app (TypeScript, App Router, Tailwind, ESLint) in the repo root.
- [x] Add Vitest. `npm test` runs all tests.
- [x] Add Drizzle and drizzle-kit. Read `DATABASE_URL` from `.env.local`. Add `.env.example`.
- [x] Create the databases `reserbuild` and `reserbuild_test`.
- [x] Write `doc/wiki/setup.md`: install, env, migrate, seed, run, test.

Done when (checked: dev returned 200): `npm run dev` serves a page, `npm test` passes one smoke test, and `doc/wiki/setup.md` has every command.

### 2. Schema and seed — `tests: first`
- [x] Write the Drizzle schema for all 7 ERD tables, with the enums from the answers. Money is `numeric(10,2)`. Times are `timestamptz`.
- [x] Add `btree_gist` and the overlap exclusion constraint on `reservation`.
- [x] Add checks: `end_at > start_at`; `headcount > 0`; `rates.end_time > start_time`.
- [x] Seed: spaces A–D (2 `build`, 2 `meeting`), one admin, one student, one faculty user, and a rate table with off-peak and peak windows.
- [x] Write ADR `doc/adr/0001-admin-role.md` if question 1 adds the role.

Done when: an integration test proves that two overlapping active reservations for one space fail, and that a cancelled one does not block.

### 3. Pricing engine — `tests: first`
- [x] Write a pure function `priceReservation(space, start, end, rates) → charges[]`.
- [x] Test: one window; a booking that crosses off-peak to peak; day-specific beats daily; space-specific beats all-spaces; `effective_from`/`effective_to` edges; a gap with no rate fails; a tie fails; cent rounding.
- [x] Add `doc/wiki/footguns/` notes for rate precedence and the time zone.

Done when: all pricing tests pass and the function has no database access.

### 4. Auth — `tests: first`
- [x] ~~Add Better Auth~~ Own session auth with email and password. Store sessions in Postgres. See ADR 0002.
- [x] Sign-up form collects the ERD User fields. `year_level` is required for students and null for faculty.
- [x] Add a helper `requireUser(role?)` for server actions and pages.

Done when: tests prove that a non-admin cannot call an admin action, and a signed-out user is redirected from booking pages.

### 5. Booking — `tests: first`
- [x] Server action: check availability for a space and a time.
- [x] Server action: create a reservation. Check limits, capacity, and overlap. Price it with task 3. Write the reservation and its charges in one transaction.
- [x] Server actions: cancel, check in, add and remove participants, mark attendance.
- [x] Map the overlap constraint error to a clear message.

Done when: tests cover each rule in OPEN QUESTIONS 5–8, and a race test (two parallel creates) gives exactly one booking.

### 6. Payments — `tests: first`
- [x] Admin server action: record a payment (amount, method, reference, received by). Void a payment.
- [x] Balance = `total_amount` − sum of `paid` payments. Refuse a payment above the balance.

Done when: tests cover partial payment, full payment, overpayment refused, and void.

### 7. Design study — design pass
- [x] Run `/impeccable init` to write PRODUCT.md. The human answers its questions.
- [x] Run `/impeccable shape` for the booking flow. Record the surfaces below as the brief. Answers: time first; staff home is payments to check. The human picked the Enlistment Grid direction. Brief: `.impeccable/surfaces/src-app-book-page-tsx.md`.

Done when: PRODUCT.md exists and the shape brief lists each surface.

### 8. UI — `tests: alongside`
- [x] Spaces page: the 4 spaces with type, capacity, and a day view of free and booked times.
- [x] Booking form: space, date, start, end, purpose, headcount. Shows the live price breakdown by charge.
- [x] My reservations: upcoming and past, with status and balance.
- [x] Reservation detail: charges, payments, participants, cancel and check-in.
- [x] Admin: spaces (edit, deactivate), rates (CRUD), reservations list, record payment.
- [x] Run `/impeccable [feature]` per surface. Run `/impeccable document` once to write DESIGN.md.

Done when: a browser probe signs in as the seeded student, books a space across a peak boundary, sees two charges, and the admin records a payment that sets the balance to zero. (With pay ahead: the student submits a reference and staff verify it.)

### 9. Pay ahead — `tests: first` (added by round 2)
- [x] Pending hold, deadline, expiry sweep, submit, verify, reject, cash, void, cancel rules. ADR 0003.

## Rendezvous checklist
- [x] `npm test` passes: 93 tests, 6 files, run twice in a row clean. One earlier full run stalled 509 s in one test and was not reproduced in four runs; `testTimeout` is now 15 s so a lock wait fails fast.
- [x] `code-review` (mattpocock, two axes). Spec findings fixed: user cancel with a pending payment, sweep before payment changes, void deadline floor, default status, cancelled payments in the staff queue. Standards findings fixed: float money in list balances, duplicated clock parser, DB reads outside `src/server`, the `purpose: "quote"` hack, copied cancel and check-in rules, implicit "rejected" rule, untyped label maps, stale AGENTS facts. Not changed (judgement): file size of `reservations.ts`, the action try/failure pattern, repeated error strings.
- [ ] `simplify`: skipped. The code-review smells above covered the same ground.
- [x] `security-review`: the skill could not run (no git remote). Manual review: authorization in every action and page, sign-up role, sessions, injection, money locks. Fixed: sign-in timing revealed which emails exist. Accepted for local use (ADR 0002): no rate limit, no session cleanup, a malformed form ID gives a server error.
- [x] Design review: impeccable finish reviewer instead of separate critique/audit/polish (the new-work flow). Round 1 `fix` (8 material fixes), round 2 all 8 resolved plus one copy regression, round 3 `ship` on the scored fixes. `impeccable detect`: no findings.
- [ ] `break-ui`: not run as a skill. Edge states probed instead (closed day, empty list, rejected, cancelled, sign-in error). Long names and long text not tested.
- [x] Browser probe (Playwright, dev server, seeded data), 13/13 pass, no console errors: signed-out redirect; student books A 28 Oct 16:00–18:00, footer quotes ₱350; review shows 2 charges (₱150 off-peak + ₱200 peak); booking waits for payment; reference GC-778812 shows as being checked; staff queue lists it; staff verify; booking confirmed with balance ₱0.00; faculty sees A taken; faculty cannot open /admin. State probe 9/9 pass.
- [ ] Merge to main locally.
## Sync docs
- [x] Update `doc/wiki/spec.md` with the answered questions. Remove them from its open questions.
- [x] Write `doc/wiki/architecture.md`.
