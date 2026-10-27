# Study: ReserBUILD MVP

## Goal

Build a local web app from the data model in [../canonical/erd.png](../canonical/erd.png). Users book spaces A–D, the app prices the time from the rates, and staff record payments. The app runs only on this machine for now. No deploy.

## Local environment (checked 2026-10-27)

- Node 24.21, npm 11.19. Bun is also present. Use npm.
- PostgreSQL 17.11 runs as a Homebrew service. The `btree_gist` extension is available.
- No Docker.

## Stack choice

| Concern | Choice | Reason |
|---|---|---|
| App | Next.js 16, App Router, TypeScript, server actions | Chosen at setup. One process for UI and server logic. |
| Database access | Drizzle ORM 0.45 with drizzle-kit migrations | SQL close to the ERD. Supports Postgres ranges and raw constraints in migrations. |
| Auth | Better Auth 1.7, email and password, session cookie | Works locally with no external service. Stores sessions in Postgres. |
| Tests | Vitest 5. Unit tests for pure logic. Integration tests against a separate `reserbuild_test` database. | Rules and money logic need real tests, not only browser checks. |
| Styling | Tailwind CSS, then the impeccable design pass | impeccable is the project design tool. |

## Findings

### Double bookings

The ERD has no rule that stops two reservations for the same space at the same time. The app check alone has a race. Use a Postgres exclusion constraint:

`EXCLUDE USING gist (space_id WITH =, tstzrange(start_at, end_at) WITH &&) WHERE (status IN active statuses)`

This needs `btree_gist`. The constraint is the final guard; the app also checks first, to show a clear error.

### Pricing

A reservation can cross rate windows (for example, off-peak to peak at 17:00). The ERD answers this with **Charge** rows: one row per segment per rate. The pricing logic is a pure function:

1. Find the rates that apply on the reservation's date: matching `space_id` or null, matching `day_of_week` or null, and `effective_from ≤ date ≤ effective_to` (null `effective_to` means open-ended).
2. Cut the reservation at every rate window boundary.
3. For each segment, pick one rate. Proposed precedence: space-specific over all-spaces, then day-specific over daily.
4. `hours = minutes / 60`, `amount = hours × rate`. Compute in integer cents. Round once per segment.
5. `total_amount = sum(charge.amount)`.

A gap with no rate is an error. The app must refuse the booking, not price it at zero.

### Time zone

Rate windows use local `time` values. Reservations use `datetime`. The app must convert with one fixed time zone. Store reservations as `timestamptz`. Keep the zone in one config value.

### Roles

The ERD has only `student` and `faculty`. Somebody must manage spaces and rates, and record payments (`Payment.received_by`). The ERD does not show this role.

### Enums the ERD leaves open

- `Reservation.status`: proposed `pending`, `confirmed`, `checked_in`, `completed`, `cancelled`, `no_show`. Active for overlap: `pending`, `confirmed`, `checked_in`.
- `Payment.method`: proposed `cash`, `e_wallet`, `bank_transfer`.
- `Payment.status`: proposed `pending`, `paid`, `voided`.

### Headcount

`headcount` must not exceed `Space.capacity`. Participants are optional. If participants exist, their count should not exceed headcount.

## Questions for the plan

Each question above goes into the plan's OPEN QUESTIONS with a default.
