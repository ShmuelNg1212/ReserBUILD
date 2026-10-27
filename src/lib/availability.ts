import "server-only";
import { asc, eq } from "drizzle-orm";
import type { Actor } from "@/server/accounts";
import type { Db } from "@/server/db";
import { rates, spaces, type Space } from "@/server/db/schema";
import { isAppError } from "@/server/errors";
import { openWindows } from "@/server/pricing";
import { getDayBookings, paymentDueAt, quoteReservation, type Quote } from "@/server/reservations";
import { atLocal } from "@/server/time";
import { clockToMinutes } from "./format";

export type Selection = { date: string; start: string; end: string; people: number };

export type SpaceDay = {
  space: Space;
  open: [number, number][];
  booked: { startMinutes: number; endMinutes: number; mine: boolean }[];
  // For the selected time: a quote, or the reason this space cannot take it.
  quote?: Quote;
  reason?: string;
};

export async function loadDay(db: Db, actor: Actor, sel: Selection | null, date: string): Promise<SpaceDay[]> {
  const [allSpaces, allRates] = await Promise.all([
    db.select().from(spaces).where(eq(spaces.isActive, true)).orderBy(asc(spaces.code)),
    db.select().from(rates),
  ]);
  return Promise.all(
    allSpaces.map(async (space) => {
      const day: SpaceDay = {
        space,
        open: openWindows(space.spaceId, date, allRates),
        booked: await getDayBookings(db, actor, space.spaceId, date),
      };
      if (!sel) return day;
      const [s, e] = [clockToMinutes(sel.start), clockToMinutes(sel.end)];
      const clash = day.booked.find((b) => b.startMinutes < e && b.endMinutes > s);
      if (clash) return { ...day, reason: clash.mine ? "You already booked this time" : "Taken for part of this time" };
      try {
        const quote = await quoteReservation(db, actor, {
          spaceId: space.spaceId,
          date: sel.date,
          startTime: sel.start,
          endTime: sel.end,
          purpose: "quote",
          headcount: sel.people,
        });
        return { ...day, quote };
      } catch (err) {
        if (isAppError(err)) return { ...day, reason: err.message };
        throw err;
      }
    }),
  );
}

export const payBy = (sel: Selection, now = new Date()) => paymentDueAt(now, atLocal(sel.date, sel.start));
