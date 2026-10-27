---
version: 1
slug: "src-app-book-page-tsx"
primary_target: "src/app/book/page.tsx"
related_targets: ["src/app/bookings","src/app/admin","src/app/sign-in","src/app/sign-up"]
---

# ReserBUILD app surfaces

Mode: Operate. Phone first for students and faculty; desktop for staff.

## Job and audience
- Users (Ateneo students and faculty) book a space for a time they already have in mind, see the price, pay ahead with a reference number, and check in.
- Staff verify payment references first, then manage bookings, rates, and spaces.

## Surfaces
- `/book`: time first. Date strip, start and end time, people; a day grid of half-hour rows × spaces A–D; pick a free space; quote; Book.
- `/bookings`: my bookings, upcoming and past, with status and what to do next.
- `/bookings/[id]`: the booking block, charge tally, pay-ahead form or payment status, participants, cancel, check in. Staff see extra actions.
- `/admin`: payments to check (queue). `/admin/bookings`, `/admin/rates`, `/admin/spaces`.
- `/sign-in`, `/sign-up`.

## States that matter
Closed hours (no rate), taken, yours, selection, pending payment with deadline, payment waiting for staff, rejected with reason, confirmed, checked in, cancelled with reason, empty lists, form errors next to fields.

## Direction contract
THESIS: A booking is a block on your day, set like an enlisted class on a printed schedule. It refuses the category default of a list of room cards with Book buttons.
OWN-WORLD: White paper ground, near-black ink, graphite secondary text, hairline rules every half hour and a 2px ink rule under headers. Taken blocks are pale gray fills with gray text; your block is solid ink with white text. One workhorse sans (Geist) with tabular figures everywhere numbers appear. No accent hue; red, green, and amber only for state.
STORY: The user sees their day as a grid, sees where the free time is, sees their chosen block with its exact price before booking, and knows the payment deadline.
FIRST VIEWPORT: Top bar with product name and account. A date strip of the next 7 days. Start, end, and people controls. Grid header A–D under a 2px rule, half-hour rows with time labels in a 48px gutter, taken and closed blocks drawn in place, the selected block in ink with "space · time · ₱". A fixed footer above a 2px rule: space, hours, total, pay-by, Book.
FORM: Enlistment Grid, my top-ranked grounded candidate (1 of 7), chosen as IMPECCABLE'S PICK. seed:26774c587c69d05c
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
