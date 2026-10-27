import type { ReservationStatus } from "@/server/db/schema";
import { formatPeso } from "@/server/money";
import { formatLocal, localParts } from "@/server/time";

export { formatPeso };

export const formatDay = (d: Date) => formatLocal(d, { weekday: "short", day: "numeric", month: "short" });
export const formatDayLong = (d: Date) => formatLocal(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const formatTime = (d: Date) => formatLocal(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const formatRange = (a: Date, b: Date) => `${formatTime(a)}–${formatTime(b)}`;
export const formatWhen = (d: Date) => `${formatDay(d)} ${formatTime(d)}`;

export const minutesToClock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const clockToMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export const todayLocal = () => localParts(new Date()).date;

export const STATUS: Record<ReservationStatus, { label: string; tone: "neutral" | "ok" | "warn" | "danger" | "ink" }> = {
  pending: { label: "Waiting for payment", tone: "warn" },
  confirmed: { label: "Confirmed", tone: "ok" },
  checked_in: { label: "Checked in", tone: "ink" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
  no_show: { label: "No-show", tone: "neutral" },
};

export const METHOD: Record<string, string> = { cash: "Cash", e_wallet: "E-wallet", bank_transfer: "Bank transfer" };

export const DAY_LABEL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
