# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router, TypeScript, server actions), PostgreSQL 17 with Drizzle, Tailwind CSS 4. Runs locally only for now; no deploy target. Chosen by the user at setup.

## Users

- **Students and faculty of Ateneo de Manila University**, booking campus spaces for any purpose: study groups, project work, meetings, and events. No single dominant use. Most bookings happen on a phone, often between classes.
- **Facility staff (several admins)**, who manage spaces and rates, check payment references, and resolve problems. They work mainly on desktop.

## Product Purpose

ReserBUILD lets the Ateneo community find a free space, book it for a set time, see the exact price, and pay ahead. Staff get one place to see bookings, confirm payments, and set rates. Success: a user books and pays on a phone in one short visit, and staff never handle a double booking or an unexplained charge.

## Positioning

Prices come from a rate table with peak and off-peak windows, day-specific rates, and per-space rates. Each booking shows a line-by-line charge breakdown that matches what the user pays. The database refuses double bookings.

## Operating Context

- Four tables: A, B, and C seat 4; D is a conference table for 8. Open Monday to Saturday, 08:00–20:00; closed Sunday.
- Rates: peak is 12:00–14:00. Tables A–C cost ₱250 per hour off-peak and ₱500 at peak. Table D costs ₱1,250 per hour off-peak and ₱2,000 at peak. These are the seed values (human-supplied, 2026-10-27); staff can change them in the app.
- Users pay ahead by e-wallet or bank transfer and enter the reference number. Staff check the reference and confirm. Staff can also record a cash payment at the office.
- A booking can list participants, including people from outside the school.
- Time zone Asia/Manila. Currency Philippine peso (₱).

## Capabilities and Constraints

- Built: sign-up and sign-in; booking with rules (half-hour slots, 1 to 8 hours, up to 30 days ahead); pricing by rate windows; cancellation; check-in; participants; staff payments, rates, and spaces.
- Pay ahead (ADR 0003): a booking is held as pending until a staff member checks the payment reference. Unpaid bookings expire at a deadline. Refunds happen outside the app.
- Terms: "space" (not room), "booking" in the UI for a reservation, "rate", "charge", "payment", "balance", "check in", "participant".
- The data model is in `doc/canonical/erd.png`. Rules are in `doc/wiki/spec.md`.

## Brand Commitments

- The users are the Ateneo de Manila community, but the app uses **no Ateneo brand assets**. The human chose neutral colors (2026-10-27). Do not draw, trace, or approximate the university logo or seal, and do not use guessed official colors.
- Product name: "ReserBUILD".

## Evidence on Hand

- `doc/canonical/erd.png`: the data model.
- Seeded demo users, spaces, and rates (`scripts/seed.mts`).
- No real usage data, testimonials, photos of the spaces, or school-approved copy. Do not invent them.

## Product Principles

1. The price is never a surprise. Show the charge breakdown before the user commits.
2. A booked slot is truly held. The system, not staff, prevents clashes.
3. Phone first for booking; desktop is enough for staff tools.
4. Plain language over facility jargon. Errors say what to do next.
5. Staff decisions leave a record: who confirmed a payment, and when.

## Accessibility & Inclusion

WCAG 2.2 AA is required. Includes touch targets of at least 24×24 CSS px (prefer 44), visible focus, contrast minimums, form labels and error messages tied to fields, and no time-limited steps without a way to extend them.
