import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { hashPassword } from "../src/server/auth";
import { createDb } from "../src/server/db";
import { assertLocalDatabase } from "../src/server/db/local";
import { users } from "../src/server/db/schema";
import { insertCatalog } from "./catalog.mts";

config({ path: ".env.local", quiet: true });

// Local demo data. Replaces everything in the database.
const { db, pool } = createDb(assertLocalDatabase(process.env.DATABASE_URL));

await db.execute(
  sql`truncate users, sessions, sign_in_failures, spaces, rates, reservations, participants, charges, payments restart identity cascade`,
);

const people = [
  { schoolId: "ADMIN-001", firstName: "Rosa", lastName: "Admin", email: "admin@reserbuild.local", role: "admin", password: "admin12345" },
  { schoolId: "2024-00123", firstName: "Ana", lastName: "Cruz", email: "student@reserbuild.local", role: "student", password: "student12345", department: "Engineering", program: "BS Computer Engineering", yearLevel: 3 },
  { schoolId: "FAC-0042", firstName: "Miguel", lastName: "Santos", email: "faculty@reserbuild.local", role: "faculty", password: "faculty12345", department: "Architecture" },
] as const;

for (const { password, ...person } of people) {
  await db.insert(users).values({ ...person, passwordHash: await hashPassword(password) });
}

const seeded = await insertCatalog(db);

await pool.end();
console.log(`Seeded 3 users, ${seeded.spaces} tables, ${seeded.rates} rates.`);
