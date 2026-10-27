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

await db.insert(spaces).values([
  { code: "A", name: "Build Room A", spaceType: "build", capacity: 12 },
  { code: "B", name: "Build Room B", spaceType: "build", capacity: 12 },
  { code: "C", name: "Meeting Room C", spaceType: "meeting", capacity: 8 },
  { code: "D", name: "Meeting Room D", spaceType: "meeting", capacity: 20 },
]);

// Monday to Friday: off-peak until 17:00, peak until 22:00. Saturday: one flat rate.
// Sunday has no rate, so the spaces are closed.
const weekdays = ["mon", "tue", "wed", "thu", "fri"] as const;
await db.insert(rates).values([
  ...weekdays.flatMap((day) => [
    { dayOfWeek: day, startTime: "07:00", endTime: "17:00", hourlyRate: "150.00", effectiveFrom: "2026-01-01" },
    { dayOfWeek: day, startTime: "17:00", endTime: "22:00", hourlyRate: "200.00", isPeak: true, effectiveFrom: "2026-01-01" },
  ]),
  { dayOfWeek: "sat" as const, startTime: "08:00", endTime: "18:00", hourlyRate: "120.00", effectiveFrom: "2026-01-01" },
]);

await pool.end();
console.log("Seeded 3 users, 4 spaces, 11 rates.");
