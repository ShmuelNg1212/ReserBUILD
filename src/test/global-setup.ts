import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "@/server/db";

// Rebuild the test database from the migrations on every run.
export default async function setup() {
  config({ path: ".env.local", quiet: true });
  const { db, pool } = createDb(process.env.TEST_DATABASE_URL!);
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
  await db.execute(sql`create schema public`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
}
