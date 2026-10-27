# ReserBUILD spec

Source: the human-supplied data model in [../canonical/erd.png](../canonical/erd.png). This page records only what that model shows. Product rules not in the model are open questions.

## Purpose

ReserBUILD lets school users book spaces and pay for the time they use.

## Entities

- **User**: a person from the school. Has a unique `school_id` and a unique `email`. `role` is `student` or `faculty`. Has `department`, `program`, and `year_level` (null for faculty).
- **Space**: a bookable space. `code` is unique: `A`, `B`, `C`, or `D`. `space_type` is `build` or `meeting`. Has `capacity` and `is_active`.
- **Reservation**: one user books one space from `start_at` to `end_at`. Has `purpose`, `headcount`, `status`, and `total_amount`. Records `created_at`, `checked_in_at`, and `cancelled_at`.
- **Participant**: a person who attends a reservation. `user_id` is null for an external person. Has `full_name`, `email`, `affiliation`, and `attended`.
- **Rates**: an hourly rate for a time window. `space_id` null means the rate applies to all spaces. `day_of_week` null means the rate applies every day. Has `start_time`, `end_time`, `hourly_rate`, `is_peak`, `effective_from`, and `effective_to`.
- **Charge**: one billed segment of a reservation under one rate. Has `segment_start`, `segment_end`, `hours`, `rate_applied`, and `amount`.
- **Payment**: a payment against a reservation. Has `amount`, `method`, `reference_no`, `status`, `paid_at`, and `received_by`.

## Relationships

- A user books zero or more reservations.
- A space is booked in zero or more reservations, and is priced by zero or more rates.
- A reservation includes zero or more participants.
- A reservation is billed as one or more charges. Each charge applies one rate.
- A reservation is settled by zero or more payments.
- A user attends as zero or more participants.

## Open questions

- The values of `Reservation.status`, `Payment.method`, and `Payment.status`.
- How a reservation is split into charge segments when it crosses rate windows.
- Which rate wins when a space-specific rate and an all-spaces rate overlap.
- Whether students and faculty pay different rates.
- How `total_amount` relates to the sum of charges and payments.
