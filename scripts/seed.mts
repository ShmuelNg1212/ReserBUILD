import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { hashPassword } from "../src/server/auth";
import { createDb } from "../src/server/db";
import { rates, spaces, users } from "../src/server/db/schema";

config({ path: ".env.local", quiet: true });

// Local demo data. Replaces everything in the database.
const { db, pool } = createDb(process.env.DATABASE_URL!);

await db.execute(
  sql`truncate users, sessions, spaces, rates, reservations, participants, charges, payments restart identity cascade`,
);

const people = [
  { schoolId: "ADMIN-001", firstName: "Rosa", lastName: "Admin", email: "admin@reserbuild.local", role: "admin", password: "admin12345" },
  { schoolId: "2024-00123", firstName: "Ana", lastName: "Cruz", email: "student@reserbuild.local", role: "student", password: "student12345", department: "Engineering", program: "BS Computer Engineering", yearLevel: 3 },
  { schoolId: "FAC-0042", firstName: "Miguel", lastName: "Santos", email: "faculty@reserbuild.local", role: "faculty", password: "faculty12345", department: "Architecture" },
] as const;

for (const { password, ...person } of people) {
  await db.insert(users).values({ ...person, passwordHash: await hashPassword(password) });
}

const [, , , tableD] = await db
  .insert(spaces)
  .values([
    { code: "A", name: "Table A", spaceType: "build", capacity: 4 },
    { code: "B", name: "Table B", spaceType: "build", capacity: 4 },
    { code: "C", name: "Table C", spaceType: "build", capacity: 4 },
    { code: "D", name: "Conference Table D", spaceType: "meeting", capacity: 8 },
  ])
  .returning();

// Open Monday to Saturday, 08:00–20:00. Peak is 12:00–14:00. Sunday has no
// rate, so the tables are closed. Tables A–C use the all-spaces rates; table D
// has its own, which win by precedence (doc/wiki/footguns/rate-precedence.md).
const openDays = ["mon", "tue", "wed", "thu", "fri", "sat"] as const;
const day = (spaceId: number | null, offPeak: string, peak: string) =>
  openDays.flatMap((dayOfWeek) => [
    { spaceId, dayOfWeek, startTime: "08:00", endTime: "12:00", hourlyRate: offPeak, effectiveFrom: "2026-01-01" },
    { spaceId, dayOfWeek, startTime: "12:00", endTime: "14:00", hourlyRate: peak, isPeak: true, effectiveFrom: "2026-01-01" },
    { spaceId, dayOfWeek, startTime: "14:00", endTime: "20:00", hourlyRate: offPeak, effectiveFrom: "2026-01-01" },
  ]);
const seeded = await db
  .insert(rates)
  .values([...day(null, "250.00", "500.00"), ...day(tableD.spaceId, "1250.00", "2000.00")])
  .returning();

await pool.end();
console.log(`Seeded 3 users, 4 tables, ${seeded.length} rates.`);
