import type { Metadata } from "next";
import Link from "next/link";
import { BookingControls } from "@/components/booking-controls";
import { DayGrid } from "@/components/day-grid";
import { buttonClass, cx } from "@/components/ui";
import { loadDay, payBy, type Selection } from "@/lib/availability";
import { clockToMinutes, formatDay, formatPeso, formatWhen, minutesToClock, todayLocal } from "@/lib/format";
import { requireActor } from "@/lib/session";
import { getDb } from "@/server/db";
import { RULES } from "@/server/reservations";
import { atLocal, formatLocal, localParts } from "@/server/time";

export const metadata: Metadata = { title: "Book a space" };

const addDays = (date: string, n: number) => localParts(new Date(atLocal(date, "12:00").getTime() + n * 86_400_000)).date;
const clockOk = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[03]0$/.test(v);

export default async function BookPage({ searchParams }: PageProps<"/book">) {
  const actor = await requireActor();
  const q = await searchParams;
  const today = todayLocal();
  const maxDate = addDays(today, RULES.maxDaysAhead);
  const date = typeof q.date === "string" && q.date >= today && q.date <= maxDate ? q.date : today;
  const people = Math.max(1, Number(q.people) || 1);

  const db = getDb();
  const preview = await loadDay(db, actor, null, date);
  const open = preview.flatMap((d) => d.open);
  const from = open.length ? Math.min(...open.map((w) => w[0])) : 7 * 60;
  const to = open.length ? Math.max(...open.map((w) => w[1])) : 22 * 60;

  // Default: the first hour at least 2 hours from now, inside opening hours.
  const now = localParts(new Date());
  const earliest = date === today ? Math.ceil((now.minutes + RULES.payBeforeStartHours * 60) / 30) * 30 : from;
  const defaultStart = Math.min(Math.max(from, earliest), to - 60);
  let start = clockOk(q.start) ? q.start : minutesToClock(defaultStart);
  let end = clockOk(q.end) ? q.end : minutesToClock(Math.min(clockToMinutes(start) + 60, to));
  if (clockToMinutes(end) <= clockToMinutes(start)) end = minutesToClock(Math.min(clockToMinutes(start) + 60, 24 * 60 - 30));
  if (!open.length) [start, end] = ["", ""];

  const sel: Selection | null = open.length ? { date, start, end, people } : null;
  const days = sel ? await loadDay(db, actor, sel, date) : preview;
  const free = days.filter((d) => d.quote);
  const chosen = days.find((d) => d.space.code === q.space) ?? free[0];

  const params = { date, start, end, people: String(people), ...(chosen ? { space: chosen.space.code } : {}) };
  const hrefFor = (p: Record<string, string>) => `/book?${new URLSearchParams({ ...params, ...p })}`;
  const times = Array.from({ length: (to - from) / 30 + 1 }, (_, i) => minutesToClock(from + i * 30));
  const strip = Array.from({ length: RULES.maxDaysAhead + 1 }, (_, i) => addDays(today, i));

  return (
    <div className="mx-auto grid max-w-3xl gap-4 px-4 pt-4 pb-40">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold">Book a space</h1>
        <Link href="/bookings" className="text-sm">
          My bookings
        </Link>
      </div>

      <nav aria-label="Pick a day" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {strip.map((d) => {
          const current = d === date;
          const noon = atLocal(d, "12:00");
          return (
            <Link
              key={d}
              href={`/book?${new URLSearchParams({ ...params, date: d })}`}
              scroll={false}
              aria-current={current ? "date" : undefined}
              className={cx(
                "grid min-h-12 min-w-16 shrink-0 place-items-center rounded-lg border px-2 text-center text-xs leading-tight no-underline",
                current ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink",
              )}
            >
              <span>{formatLocal(noon, { weekday: "short" })}</span>
              <span className="text-base font-semibold">{formatLocal(noon, { day: "numeric", month: "short" })}</span>
            </Link>
          );
        })}
      </nav>

      <BookingControls
        key={`${date}-${start}-${end}-${people}`}
        date={date}
        start={start || times[0]}
        end={end || times[1]}
        people={people}
        space={chosen?.space.code}
        times={times}
      />

      {!open.length ? (
        <div className="grid gap-2 border-y-2 border-ink py-8 text-center">
          <p className="font-semibold">All spaces are closed on {formatDay(atLocal(date, "12:00"))}.</p>
          <p className="text-sm text-graphite">Pick another day above.</p>
        </div>
      ) : (
        <DayGrid
          days={days}
          from={from}
          to={to}
          selection={{ start: clockToMinutes(start), end: clockToMinutes(end) }}
          selectedCode={chosen?.space.code}
          hrefFor={hrefFor}
        />
      )}

      {sel && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
            {chosen?.quote ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {chosen.space.code} · {start}–{end}
                  </p>
                  <p className="text-sm text-graphite">Pay by {formatWhen(payBy(sel))}</p>
                </div>
                <p className="text-xl font-bold">{formatPeso(chosen.quote.total)}</p>
                <Link href={`/book/review?${new URLSearchParams(params)}`} className={buttonClass("primary", "no-underline")}>
                  Review
                </Link>
              </>
            ) : (
              <div className="flex-1 text-sm" role="status">
                <p>
                  {chosen
                    ? `${chosen.space.name}: ${chosen.reason}.`
                    : (days.find((d) => d.reason)?.reason ?? "No space is free for this time") + ". Try another time."}
                </p>
                {free.length > 0 && (
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    Free at this time:
                    {free.map((d) => (
                      <Link key={d.space.code} href={hrefFor({ space: d.space.code })} scroll={false} className="font-semibold">
                        {d.space.name}
                      </Link>
                    ))}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
