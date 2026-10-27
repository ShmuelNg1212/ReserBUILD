import { asc, eq } from "drizzle-orm";
import { requireRole, type Actor } from "./accounts";
import type { Db } from "./db";
import { rates, spaces, type Space } from "./db/schema";
import { isAppError } from "./errors";
import { openWindows } from "./pricing";
import { getDayBookings, quoteReservation, type Quote, type SlotInput } from "./reservations";
import { clockToMinutes } from "./time";

export type SpaceDay = {
  space: Space;
  open: [number, number][];
  peak: [number, number][];
  booked: { startMinutes: number; endMinutes: number; mine: boolean }[];
  // For the asked-for slot: a quote, or the reason this space cannot take it.
  quote?: Quote;
  reason?: string;
};

// One day across all open spaces, for the booking grid.
export async function loadDay(
  db: Db,
  actor: Actor | null,
  date: string,
  slot?: Omit<SlotInput, "spaceId">,
): Promise<SpaceDay[]> {
  requireRole(actor);
  const [allSpaces, allRates] = await Promise.all([
    db.select().from(spaces).where(eq(spaces.isActive, true)).orderBy(asc(spaces.code)),
    db.select().from(rates),
  ]);
  const peakRates = allRates.filter((r) => r.isPeak);
  return Promise.all(
    allSpaces.map(async (space) => {
      const day: SpaceDay = {
        space,
        open: openWindows(space.spaceId, date, allRates),
        peak: openWindows(space.spaceId, date, peakRates),
        booked: await getDayBookings(db, actor, space.spaceId, date),
      };
      if (!slot) return day;
      const [s, e] = [clockToMinutes(String(slot.startTime)), clockToMinutes(String(slot.endTime))];
      const clash = day.booked.find((b) => b.startMinutes < e && b.endMinutes > s);
      if (clash) return { ...day, reason: clash.mine ? "You already booked this time" : "Taken for part of this time" };
      try {
        return { ...day, quote: await quoteReservation(db, actor, { ...slot, spaceId: space.spaceId }) };
      } catch (err) {
        if (isAppError(err)) return { ...day, reason: err.message };
        throw err;
      }
    }),
  );
}
