import { config } from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "../src/server/db";

config({ path: ".env.local", quiet: true });

// Migrations need a direct connection; Neon's pooled URL cannot hold the migration lock.
const { db, pool } = createDb((process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL)!);
await migrate(db, { migrationsFolder: "./drizzle" });
await pool.end();
console.log("Migrations applied.");
