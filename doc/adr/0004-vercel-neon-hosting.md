# 0004: Host on Vercel with Neon Postgres

Date: 2026-10-27. Status: accepted.

## Context

The app ran only locally. The human wanted a free host for a pilot. Railway has no free plan that keeps an app and a database running all month. Vercel Hobby and Neon Free cost nothing.

## Decision

- Host the Next.js app on Vercel, region `sin1` (Singapore), close to Manila.
- Use Neon Postgres, region Singapore, created through the Vercel integration. Neon supports `btree_gist`.
- At run time, the app uses Neon's pooled URL (`DATABASE_URL`) with a small `pg` pool attached by `attachDatabasePool`. Migrations and the bootstrap use the direct URL (`DATABASE_URL_UNPOOLED`).
- Each Vercel build runs the migrations and the idempotent bootstrap before `next build`. Preview builds use their own Neon branch.
- A push to `main` deploys to production.

## Consequences

- Vercel Hobby is for non-commercial use. When real payments run through the app, move to Vercel Pro or to Railway Hobby (about USD 5 per month).
- Neon Free suspends an idle database. The first request after a quiet period is about one second slower.
- A bad migration fails the build, so the old version stays live. A migration that succeeds but breaks the app needs a fix forward or a Neon restore.
- The AGENTS.md rules for a push that deploys now apply.
