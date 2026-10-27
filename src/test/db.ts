import { sql } from "drizzle-orm";
import { afterAll, beforeEach } from "vitest";
import type { Pool } from "pg";
import { createDb, type Db } from "@/server/db";
import { hashPassword } from "@/server/auth";
import { rates, spaces, users, type Role } from "@/server/db/schema";

// Call once per integration test file. Gives an empty database per test.
export function setupTestDb(): { db: Db; pool: Pool } {
  const { db, pool } = createDb(process.env.TEST_DATABASE_URL!);
  beforeEach(async () => {
    await db.execute(
      sql`truncate users, sessions, sign_in_failures, spaces, rates, reservations, participants, charges, payments restart identity cascade`,
    );
  });
  afterAll(() => pool.end());
  return { db, pool };
}

let counter = 0;

export async function makeUser(db: Db, role: Role = "student", password = "password123") {
  counter += 1;
  const [user] = await db
    .insert(users)
    .values({
      schoolId: `S-${counter}`,
      firstName: "Test",
      lastName: `User${counter}`,
      email: `user${counter}@school.test`,
      role,
      yearLevel: role === "student" ? 2 : null,
      passwordHash: await hashPassword(password),
    })
    .returning();
  return user;
}

export async function makeSpace(db: Db, values: Partial<typeof spaces.$inferInsert> = {}) {
  const [space] = await db
    .insert(spaces)
    .values({ code: "A", name: "Build Room A", spaceType: "build", capacity: 10, ...values })
    .returning();
  return space;
}

// 07:00–17:00 off-peak at 100.00, 17:00–22:00 peak at 150.00, every day.
export async function makeStandardRates(db: Db) {
  return db
    .insert(rates)
    .values([
      { startTime: "07:00", endTime: "17:00", hourlyRate: "100.00", effectiveFrom: "2026-01-01" },
      { startTime: "17:00", endTime: "22:00", hourlyRate: "150.00", isPeak: true, effectiveFrom: "2026-01-01" },
    ])
    .returning();
}
