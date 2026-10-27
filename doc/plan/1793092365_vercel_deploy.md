# Plan: deploy to Vercel with Neon Postgres

Branch: `feat/vercel-deploy`. Mode: technical.

## Decisions (human, 2026-10-27)

- Host: Vercel (Hobby, free) with Neon Postgres (free), region Singapore. Railway Hobby is the fallback when real payments start.
- Sign-in: add a throttle now. Defer password reset (no email service).
- Production data: tables A–D and their rates, plus one admin from env vars. No demo accounts.
- Push target: https://github.com/ShmuelNg1212/ReserBUILD. A push to `main` deploys after the Vercel project is connected.

## OPEN QUESTIONS

None.

## Tasks

- [x] **1. Guard the destructive scripts.** `tests: first`
  - `db:seed` and `db:reset` refuse to run when `DATABASE_URL` is not a local host (`localhost`, `127.0.0.1`, `::1`).
  - Done when: a unit test covers local and remote URLs, and both scripts call the guard before they write.
- [x] **2. Throttle sign-in.** `tests: first`
  - Record each failed sign-in by email. After 5 failures in 15 minutes, refuse sign-in for that email with `TOO_MANY_ATTEMPTS`, even with the correct password. A successful sign-in clears the record.
  - Done when: tests show the lock, the window expiry, and the clear; a migration adds the table; ADR 0002 records the change.
- [x] **3. Production bootstrap.** `tests: alongside`
  - `npm run db:bootstrap` is idempotent. It adds tables A–D and the rates only when there are no spaces. It creates an admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12 characters or more) only when that email has no account. It skips the admin when the vars are not set.
  - The seed and the bootstrap share one catalog of tables and rates.
  - Done when: two runs against the local database give the same result as one run.
- [x] **4. Serverless database pool.** `tests: alongside`
  - Use the Neon pooled URL at run time. Keep the pool small and attach it with `attachDatabasePool` from `@vercel/functions`, so idle connections close when a function suspends.
  - Migrations use `DATABASE_URL_UNPOOLED` when it is set.
  - Done when: the test suite passes and `next build` succeeds.
- [x] **5. Vercel build.** `tests: alongside`
  - `vercel.json` build command: migrate, bootstrap, then `next build`. Pin Node 24 in `engines`.
  - Done when: the same command runs locally against the local database.
- [x] **6. Docs.** `tests: alongside`
  - `setup.md`: deploy, env vars, and rollback. ADR 0004: the hosting choice. Update AGENTS.md project facts and PRODUCT.md (no longer local only).
- [ ] **7. Human steps (wizard).** Create the Neon database through the Vercel integration, set the env vars, connect the GitHub repo, and confirm a release marker on the live site.

## Rendezvous checks

- `npm test`: 100 passed. `npm run typecheck` and `npm run lint`: clean.
- Vercel build command (`db:migrate && db:bootstrap && build`) ran against `reserbuild_test`: build passed.
- Bootstrap ran 3 times on an empty database: 4 tables, 36 rates, 1 admin, no duplicates. A short `ADMIN_PASSWORD` is refused.
- `db:seed` with a remote `DATABASE_URL` is refused before it writes.
- Browser probe on `next start` (local database): a wrong password shows the error; after 5 failures, the right password is refused with the wait message; another account still signs in and lands on `/admin`.
- Security pass: failed rows for unknown emails grew without limit. Fixed: each failure prunes expired rows (test added).
- Not checked here: Neon pooler behaviour and the live site. These need task 7.

Previous main commit (rollback point): `8e05dd7`.
