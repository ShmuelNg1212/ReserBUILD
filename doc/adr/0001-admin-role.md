# 0001: Add an admin role

Date: 2026-10-27. Status: accepted.

## Context

The ERD in `doc/canonical/erd.png` has two roles: `student` and `faculty`. Somebody must manage spaces and rates, record payments (`Payment.received_by`), and mark outcomes. The ERD does not name this person.

## Decision

Add `admin` to `User.role`. An admin cannot sign up through the app. The seed creates one, and an admin can be added with SQL. An admin has `year_level` null, as faculty does. `Payment.received_by` holds the admin's full name.

## Consequences

The schema differs from the canonical ERD in this one value. The human should update the ERD when it is next edited.
