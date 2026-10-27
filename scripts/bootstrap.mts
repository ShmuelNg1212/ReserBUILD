import { createHash } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { hashPassword } from "../src/server/auth";
import { createDb } from "../src/server/db";
import { signInFailures, spaces, users } from "../src/server/db/schema";
import { insertCatalog } from "./catalog.mjs";

config({ path: ".env.local", quiet: true });

// Starting data for a hosted database. Safe to run on every deploy: it only
// adds what is missing and never deletes.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const { db, pool } = createDb(url);

const existing = await db.select({ id: spaces.spaceId }).from(spaces).limit(1);
if (existing.length === 0) {
  const seeded = await insertCatalog(db);
  console.log(`Bootstrap: added ${seeded.spaces} tables and ${seeded.rates} rates.`);
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (email) {
  if (!password || password.length < 12) throw new Error("ADMIN_PASSWORD must have at least 12 characters");
  const [found] = await db.select({ id: users.userId }).from(users).where(eq(users.email, email));
  if (!found) {
    await db.insert(users).values({
      schoolId: "ADMIN-001",
      firstName: process.env.ADMIN_FIRST_NAME ?? "Facility",
      lastName: process.env.ADMIN_LAST_NAME ?? "Admin",
      email,
      role: "admin",
      passwordHash: await hashPassword(password),
    });
    console.log(`Bootstrap: created admin ${email}.`);
  } else if (process.env.ADMIN_RESET_PASSWORD === "true") {
    // Recovery: there is no password reset in the app. Unset the flag after one deploy.
    await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.userId, found.id));
    await db.delete(signInFailures).where(eq(signInFailures.email, email));
    const fingerprint = createHash("sha256").update(password).digest("hex").slice(0, 8);
    console.log(`Bootstrap: reset password for ${email} (fingerprint ${fingerprint}).`);
  }
}

await pool.end();
console.log("Bootstrap done.");
