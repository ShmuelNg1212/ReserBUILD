import { execSync } from "node:child_process";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { createDb } from "../src/server/db";
import { assertLocalDatabase } from "../src/server/db/local";

config({ path: ".env.local", quiet: true });

// Drop and rebuild the local database, then seed it.
const { db, pool } = createDb(assertLocalDatabase(process.env.DATABASE_URL));
await db.execute(sql`drop schema if exists public cascade`);
await db.execute(sql`drop schema if exists drizzle cascade`);
await db.execute(sql`create schema public`);
await pool.end();
execSync("npm run db:migrate && npm run db:seed", { stdio: "inherit" });
