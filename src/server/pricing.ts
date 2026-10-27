import type { Rate } from "./db/schema";
import { fromCents, toCents } from "./money";
import { atLocal, localParts, TIME_ZONE } from "./time";

export type PricingRate = Pick<
  Rate,
  "rateId" | "spaceId" | "dayOfWeek" | "startTime" | "endTime" | "hourlyRate" | "effectiveFrom" | "effectiveTo"
>;

export type PricedCharge = {
  rateId: number;
  segmentStart: Date;
  segmentEnd: Date;
  hours: string;
  rateApplied: string;
  amount: string;
  amountCents: number;
};

export type PricingErrorCode = "INVALID_RANGE" | "CROSSES_DAY" | "NO_RATE" | "RATE_CONFLICT";

export class PricingError extends Error {
  constructor(
    readonly code: PricingErrorCode,
    readonly at?: Date,
  ) {
    super(code);
  }
}

// Space-specific beats all-spaces; then day-specific beats daily.
function rank(rate: PricingRate): number {
  return (rate.spaceId !== null ? 2 : 0) + (rate.dayOfWeek !== null ? 1 : 0);
}

export function priceReservation(input: {
  spaceId: number;
  start: Date;
  end: Date;
  rates: PricingRate[];
  timeZone?: string;
}): { charges: PricedCharge[]; totalCents: number; total: string } {
  const { spaceId, start, end, timeZone = TIME_ZONE } = input;
  if (end <= start) throw new PricingError("INVALID_RANGE");

  const local = localParts(start, timeZone);
  if (localParts(end, timeZone).date !== local.date) throw new PricingError("CROSSES_DAY");

  const windows = input.rates
    .filter(
      (r) =>
        (r.spaceId === null || r.spaceId === spaceId) &&
        (r.dayOfWeek === null || r.dayOfWeek === local.dayOfWeek) &&
        r.effectiveFrom <= local.date &&
        (r.effectiveTo === null || r.effectiveTo >= local.date),
    )
    .map((rate) => ({
      rate,
      from: atLocal(local.date, rate.startTime, timeZone).getTime(),
      to: atLocal(local.date, rate.endTime, timeZone).getTime(),
    }));

  const s = start.getTime();
  const e = end.getTime();
  const cuts = new Set([s, e]);
  for (const w of windows) {
    if (w.from > s && w.from < e) cuts.add(w.from);
    if (w.to > s && w.to < e) cuts.add(w.to);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const segments: { rate: PricingRate; from: number; to: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]];
    const covering = windows.filter((w) => w.from <= a && w.to >= b);
    if (covering.length === 0) throw new PricingError("NO_RATE", new Date(a));
    const best = Math.max(...covering.map((w) => rank(w.rate)));
    const top = covering.filter((w) => rank(w.rate) === best);
    if (top.length > 1) throw new PricingError("RATE_CONFLICT", new Date(a));

    const last = segments.at(-1);
    if (last && last.rate.rateId === top[0].rate.rateId && last.to === a) last.to = b;
    else segments.push({ rate: top[0].rate, from: a, to: b });
  }

  const charges = segments.map(({ rate, from, to }) => {
    const minutes = (to - from) / 60_000;
    const rateCents = toCents(rate.hourlyRate);
    const amountCents = Math.round((minutes * rateCents) / 60);
    return {
      rateId: rate.rateId,
      segmentStart: new Date(from),
      segmentEnd: new Date(to),
      hours: (minutes / 60).toFixed(2),
      rateApplied: fromCents(rateCents),
      amount: fromCents(amountCents),
      amountCents,
    };
  });
  const totalCents = charges.reduce((sum, c) => sum + c.amountCents, 0);
  return { charges, totalCents, total: fromCents(totalCents) };
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

// Local minutes [from, to) when any rate covers this space on this date.
// Time outside these windows is closed.
export function openWindows(spaceId: number, date: string, rates: PricingRate[], timeZone = TIME_ZONE): [number, number][] {
  const { dayOfWeek } = localParts(atLocal(date, "12:00", timeZone), timeZone);
  const windows = rates
    .filter(
      (r) =>
        (r.spaceId === null || r.spaceId === spaceId) &&
        (r.dayOfWeek === null || r.dayOfWeek === dayOfWeek) &&
        r.effectiveFrom <= date &&
        (r.effectiveTo === null || r.effectiveTo >= date),
    )
    .map((r): [number, number] => [toMinutes(r.startTime), toMinutes(r.endTime)])
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [from, to] of windows) {
    const last = merged.at(-1);
    if (last && from <= last[1]) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  }
  return merged;
}
