import type { Metadata } from "next";
import Link from "next/link";
import { BookingControls } from "@/components/booking-controls";
import { DayGrid } from "@/components/day-grid";
import { buttonClass, cx } from "@/components/ui";
import { formatDay, formatDayLong, formatWhen, minutesToClock, todayLocal } from "@/lib/format";
import { requireActor } from "@/lib/session";
import { loadDay } from "@/server/availability";
import { getDb } from "@/server/db";
import { formatPeso } from "@/server/money";
import { DAY, paymentDueAt, RULES } from "@/server/reservations";
import { atLocal, clockToMinutes, formatLocal, localParts } from "@/server/time";

export const metadata: Metadata = { title: "Book a space" };

const addDays = (date: string, n: number) => localParts(new Date(atLocal(date, "12:00").getTime() + n * DAY)).date;
const clockOk = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[03]0$/.test(v);

export default async function BookPage({ searchParams }: PageProps<"/book">) {
  const actor = await requireActor();
  const q = await searchParams;
  const today = todayLocal();
  const maxDate = addDays(today, RULES.maxDaysAhead);
  const date = typeof q.date === "string" && q.date >= today && q.date <= maxDate ? q.date : today;
  const people = Math.max(1, Number(q.people) || 1);

  const db = getDb();
  const preview = await loadDay(db, actor, date);
  const open = preview.flatMap((d) => d.open);
  const from = open.length ? Math.min(...open.map((w) => w[0])) : 7 * 60;
  const to = open.length ? Math.max(...open.map((w) => w[1])) : 22 * 60;

  // Default: the first hour at least 2 hours from now, inside opening hours.
  const now = localParts(new Date());
  const earliest = date === today ? Math.ceil((now.minutes + RULES.payBeforeStartHours * 60) / 30) * 30 : from;
  const defaultStart = Math.min(Math.max(from, earliest), to - 60);
  let start = clockOk(q.start) ? q.start : minutesToClock(defaultStart);
  let end = clockOk(q.end) ? q.end : minutesToClock(Math.min(clockToMinutes(start) + 60, to));
  if (clockToMinutes(end) <= clockToMinutes(start))
    end = minutesToClock(Math.min(clockToMinutes(start) + 60, 24 * 60 - 30));
  if (!open.length) [start, end] = ["", ""];

  const slot = open.length ? { date, startTime: start, endTime: end, headcount: people } : null;
  const days = slot ? await loadDay(db, actor, date, slot) : preview;
  const free = days.filter((d) => d.quote);
  const chosen = days.find((d) => d.space.code === q.space) ?? free[0];

  const params = { date, start, end, people: String(people), ...(chosen ? { space: chosen.space.code } : {}) };
  const hrefFor = (p: Record<string, string>) => `/book?${new URLSearchParams({ ...params, ...p })}`;
  const times = Array.from({ length: (to - from) / 30 + 1 }, (_, i) => minutesToClock(from + i * 30));
  const strip = Array.from({ length: RULES.maxDaysAhead + 1 }, (_, i) => addDays(today, i));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-44">
      <div className="grid max-w-3xl gap-4">
        <h1 className="text-xl font-bold">
          <span className="sr-only">Book a space on </span>
          {formatDayLong(atLocal(date, "12:00"))}
        </h1>

        <nav
          aria-label="Pick a day"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]"
        >
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
      </div>

      {slot && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="max-w-3xl">
              {chosen?.quote ? (
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
                  <p className="font-semibold">
                    {chosen.space.name} · {start}–{end} · {(clockToMinutes(end) - clockToMinutes(start)) / 60} h
                  </p>
                  <p className="text-right text-xl font-bold">{formatPeso(chosen.quote.total)}</p>
                  <p className="text-sm whitespace-nowrap text-graphite">
                    Pay by {formatWhen(paymentDueAt(new Date(), atLocal(date, start)))}
                  </p>
                  <Link
                    href={`/book/review?${new URLSearchParams(params)}`}
                    className={buttonClass("primary", "no-underline")}
                  >
                    Review
                  </Link>
                </div>
              ) : (
                <div className="flex-1 text-sm" role="status">
                  <p>
                    {chosen
                      ? `${chosen.space.name}: ${chosen.reason}.`
                      : (days.find((d) => d.reason)?.reason ?? "No space is free for this time") +
                        ". Try another time."}
                  </p>
                  {free.length > 0 && (
                    <p className="mt-1 flex flex-wrap items-center gap-2">
                      Free at this time:
                      {free.map((d) => (
                        <Link
                          key={d.space.code}
                          href={hrefFor({ space: d.space.code })}
                          scroll={false}
                          className="font-semibold"
                        >
                          {d.space.name}
                        </Link>
                      ))}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
