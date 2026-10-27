import type { Db } from "../src/server/db";
import { rates, spaces } from "../src/server/db/schema";

// The real tables and rates (PRODUCT.md, human-supplied 2026-10-27).
// Used by the local seed and the production bootstrap.
export async function insertCatalog(db: Db): Promise<{ spaces: number; rates: number }> {
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

  return { spaces: 4, rates: seeded.length };
}
