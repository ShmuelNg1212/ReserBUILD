import { config } from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "../src/server/db";

config({ path: ".env.local", quiet: true });

const { db, pool } = createDb(process.env.DATABASE_URL!);
await migrate(db, { migrationsFolder: "./drizzle" });
await pool.end();
console.log("Migrations applied.");
