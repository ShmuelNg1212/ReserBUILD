# 0002: Own session auth instead of Better Auth

Date: 2026-10-27. Status: accepted.

## Context

The study chose Better Auth. Better Auth expects its own user table with string IDs. The ERD has `users.user_id` as an integer, and the user fields are school-specific.

## Decision

Keep the ERD `users` table and add `password_hash`. Hash passwords with scrypt (Node `crypto`). Store a SHA-256 hash of a random session token in `sessions`. Send the raw token in an httpOnly, SameSite=Lax cookie. Sessions last 7 days.

## Consequences

No password reset, email check, or rate limit on sign-in. These are acceptable while the app runs only locally. Add them, or move to a library, before the app goes online.

## Update 2026-10-27: sign-in throttle

Before the Vercel deploy, the human chose to add a sign-in throttle and to defer password reset.

- Each failed sign-in adds a row to `sign_in_failures`, keyed by the lower-case email. Unknown emails count too.
- After 5 failures in 15 minutes, sign-in for that email fails with `TOO_MANY_ATTEMPTS`, even with the correct password.
- A successful sign-in deletes the rows for that email.

Known limits:

- The key is the email, not the IP address. An attacker can lock one account for 15 minutes. An attacker can also try one password against many emails.
- There is still no password reset and no email check. The app has no email service.
