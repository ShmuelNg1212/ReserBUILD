# Setup

The app runs only on this machine. There is no deploy.

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
| `npm run db:migrate` | Applies new migrations to `reserbuild`. |
| `npm run db:seed` | Replaces all data in `reserbuild` with the demo data. |
| `npm run db:reset` | Drops `reserbuild`, then migrates and seeds. |

## Schema changes

1. Edit `src/server/db/schema.ts`.
2. Run `npm run db:generate`. Review the SQL in `drizzle/`.
3. Constraints Drizzle cannot express (the overlap exclusion) live in custom migrations: `npx drizzle-kit generate --custom --name <name>`.
4. Run `npm run db:migrate`.
