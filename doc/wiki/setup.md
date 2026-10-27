# Setup

Production runs on Vercel with Neon Postgres (doc/adr/0004-vercel-neon-hosting.md). A push to `main` deploys.

## Needs

- Node 24 and npm.
- PostgreSQL 17, running locally (`brew services start postgresql@17`). The `btree_gist` extension must be available. Homebrew Postgres has it.

## First run

1. `npm install`
2. `cp .env.example .env.local`. Change the URLs if your Postgres needs a user or password.
3. `createdb reserbuild && createdb reserbuild_test`
4. `npm run db:reset`. This drops the local database, applies the migrations, and seeds demo data.
5. `npm run dev`, then open http://localhost:3000.

## Demo accounts

These exist only in a local database. Production has no demo accounts.

| Role | Email | Password |
|---|---|---|
| Admin | admin@reserbuild.local | admin12345 |
| Student | student@reserbuild.local | student12345 |
| Faculty | faculty@reserbuild.local | faculty12345 |

## Commands

| Command | Does |
|---|---|
| `npm test` | Runs all tests. Rebuilds `reserbuild_test` from the migrations first. |
| `npm run typecheck` | Generates Next route types, then runs `tsc`. |
| `npm run lint` | ESLint. |
| `npm run db:generate` | Writes a new migration from `src/server/db/schema.ts`. |
| `npm run db:migrate` | Applies new migrations. Uses `DATABASE_URL_UNPOOLED` when set. |
| `npm run db:seed` | Replaces all data with the demo data. Local databases only. |
| `npm run db:reset` | Drops the database, then migrates and seeds. Local databases only. |
| `npm run db:bootstrap` | Adds tables A–D and the rates when there are no spaces, and the admin from `ADMIN_EMAIL` when that account does not exist. Never deletes. |

## Schema changes

1. Edit `src/server/db/schema.ts`.
2. Run `npm run db:generate`. Review the SQL in `drizzle/`.
3. Constraints Drizzle cannot express (the overlap exclusion) live in custom migrations: `npx drizzle-kit generate --custom --name <name>`.
4. Run `npm run db:migrate`.

## Deploy

### Environment variables (Vercel project)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled URL. The Neon integration sets it. |
| `DATABASE_URL_UNPOOLED` | Neon direct URL. The Neon integration sets it. |
| `APP_TIME_ZONE` | `Asia/Manila` |
| `ADMIN_EMAIL` | The first admin's email. Production only. |
| `ADMIN_PASSWORD` | 12 characters or more. Production only. Remove it after the first deploy. |

### Release

1. Run `npm test`, `npm run typecheck`, and `npm run lint`.
2. Record the current `origin/main` commit in the plan: `git rev-parse origin/main`.
3. `git push origin main`. Vercel builds: `db:migrate`, `db:bootstrap`, then `next build` (`vercel.json`).
4. Watch the build in the Vercel dashboard. The release is done when the live site shows the change.

### Rollback

- App: in the Vercel dashboard, open Deployments, pick the previous deployment, and choose "Instant Rollback". Or `npx vercel rollback`.
- Database: migrations do not roll back. Fix forward with a new migration, or restore a Neon branch to a time before the deploy (Neon console, Restore).
