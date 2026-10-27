import { TZDate } from "@date-fns/tz";
import type { DayOfWeek } from "./db/schema";

export const TIME_ZONE = process.env.APP_TIME_ZONE ?? "Asia/Manila";

const DAYS: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export type LocalParts = {
  date: string; // YYYY-MM-DD
  dayOfWeek: DayOfWeek;
  minutes: number; // minutes since local midnight
  subMinuteMs: number; // non-zero when the instant is not on a whole minute
};

export function localParts(instant: Date, timeZone = TIME_ZONE): LocalParts {
  const d = new TZDate(instant, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    dayOfWeek: DAYS[d.getDay()],
    minutes: d.getHours() * 60 + d.getMinutes(),
    subMinuteMs: d.getSeconds() * 1000 + d.getMilliseconds(),
  };
}

// "HH:MM" → minutes since midnight.
export const clockToMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// The instant of a local wall time ("HH:MM" or "HH:MM:SS") on a local date.
export function atLocal(date: string, time: string, timeZone = TIME_ZONE): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss = 0] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, ss, timeZone).getTime());
}

export function formatLocal(instant: Date, options: Intl.DateTimeFormatOptions, timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-PH", { timeZone, ...options }).format(instant);
}
