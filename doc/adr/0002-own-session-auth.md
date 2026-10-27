# 0002: Own session auth instead of Better Auth

Date: 2026-10-27. Status: accepted.

## Context

The study chose Better Auth. Better Auth expects its own user table with string IDs. The ERD has `users.user_id` as an integer, and the user fields are school-specific.

## Decision

Keep the ERD `users` table and add `password_hash`. Hash passwords with scrypt (Node `crypto`). Store a SHA-256 hash of a random session token in `sessions`. Send the raw token in an httpOnly, SameSite=Lax cookie. Sessions last 7 days.

## Consequences

No password reset, email check, or rate limit on sign-in. These are acceptable while the app runs only locally. Add them, or move to a library, before the app goes online.
