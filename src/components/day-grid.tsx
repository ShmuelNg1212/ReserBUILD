import Link from "next/link";
import type { SpaceDay } from "@/server/availability";
import { formatPeso } from "@/server/money";
import { minutesToClock } from "@/lib/format";
import { GridScroller } from "./grid-scroller";
import { cx } from "./ui";

const ROW = 40; // px per half hour

type Props = {
  days: SpaceDay[];
  from: number; // first minute shown
  to: number; // last minute shown
  selection: { start: number; end: number } | null;
  selectedCode?: string;
  hrefFor: (params: Record<string, string>) => string;
};

// The day as a printed schedule: half-hour rows, one column per space,
// taken and closed time drawn in place, and your block in ink. Ink means
// "yours": only a free chosen space gets it.
export function DayGrid({ days, from, to, selection, selectedCode, hrefFor }: Props) {
  const rows = Array.from({ length: (to - from) / 30 }, (_, i) => from + i * 30);
  const top = (m: number) => ((m - from) / 30) * ROW;
  const height = (a: number, b: number) => ((b - a) / 30) * ROW;
  const length = selection ? selection.end - selection.start : 60;
  const cols = { gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` };
  // Peak starts, shared by every space in the seed; drawn once in the gutter.
  const peakStarts = [...new Set(days.flatMap((d) => d.peak.map(([a]) => a)))].filter((m) => m > from && m < to);

  return (
    <div>
      <div className="grid" style={cols}>
        <div className="border-b-2 border-ink" />
        {days.map(({ space, quote, reason }) => {
          const chosen = space.code === selectedCode;
          const yours = chosen && !!quote;
          return (
            <Link
              key={space.spaceId}
              href={hrefFor({ space: space.code })}
              scroll={false}
              aria-current={chosen ? "true" : undefined}
              className={cx(
                "grid min-h-14 place-items-center border-b-2 px-1 py-1.5 text-center no-underline",
                yours ? "border-ink bg-ink text-paper" : chosen ? "border-ink bg-shade" : "border-ink hover:bg-panel",
              )}
            >
              <span className="text-lg leading-none font-bold">{space.code}</span>
              <span className={cx("text-xs", yours ? "text-paper" : "text-graphite")}>
                {quote ? formatPeso(quote.total) : reason ? (/^(Taken|You)/.test(reason) ? "Taken" : "Not free") : `${space.capacity} max`}
              </span>
              <span className="sr-only">
                {space.name}, up to {space.capacity} people. {quote ? `Free, ${formatPeso(quote.total)}` : (reason ?? "")}
              </span>
            </Link>
          );
        })}
      </div>
      <GridScroller scrollTo={selection ? top(selection.start) : 0}>
        <div className="grid" style={cols}>
          <div aria-hidden className="relative" style={{ height: rows.length * ROW }}>
            {rows.map((m) => (
              <span
                key={m}
                className={cx("absolute right-0 h-px bg-rule", m % 60 === 0 ? "w-2" : "w-1")}
                style={{ top: top(m) }}
              />
            ))}
            {rows.map((m) =>
              m % 60 === 0 ? (
                <span key={`l${m}`} className="absolute right-2.5 pt-0.5 text-xs text-graphite" style={{ top: top(m) }}>
                  {minutesToClock(m)}
                </span>
              ) : null,
            )}
            {peakStarts.map((m) => (
              <span
                key={`p${m}`}
                className="absolute right-2.5 mt-4 text-[11px] font-semibold tracking-wide text-ink uppercase"
                style={{ top: top(m) }}
              >
                Peak
              </span>
            ))}
          </div>

          {days.map(({ space, open, booked, quote }) => {
            const closed: [number, number][] = [];
            let cursor = from;
            for (const [a, b] of open) {
              if (a > cursor) closed.push([cursor, Math.min(a, to)]);
              cursor = Math.max(cursor, b);
            }
            if (cursor < to) closed.push([cursor, to]);
            const yoursHere = selection && space.code === selectedCode && quote;
            return (
              <div
                key={space.spaceId}
                aria-hidden
                className="relative border-l border-rule"
                style={{
                  height: rows.length * ROW,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${ROW - 1}px, var(--color-rule) ${ROW - 1}px ${ROW}px)`,
                }}
              >
                {rows.map((m) => (
                  <Link
                    key={m}
                    tabIndex={-1}
                    scroll={false}
                    href={hrefFor({
                      space: space.code,
                      start: minutesToClock(m),
                      end: minutesToClock(Math.min(m + length, to)),
                    })}
                    className="absolute inset-x-0 hover:bg-panel"
                    style={{ top: top(m), height: ROW }}
                  />
                ))}
                {peakStarts.map((m) => (
                  <div key={`p${m}`} className="pointer-events-none absolute inset-x-0 h-0.5 bg-ink/25" style={{ top: top(m) - 1 }} />
                ))}
                {closed.map(([a, b]) => (
                  <div
                    key={`c${a}`}
                    className="hatch pointer-events-none absolute inset-x-0"
                    style={{ top: top(a), height: height(a, b) }}
                  />
                ))}
                {selection && !yoursHere && (
                  <div
                    className="pointer-events-none absolute inset-x-0 bg-ink/5"
                    style={{ top: top(selection.start), height: height(selection.start, selection.end) }}
                  />
                )}
                {booked.map((b) => (
                  <div
                    key={b.startMinutes}
                    className={cx(
                      "pointer-events-none absolute inset-x-1 rounded-sm border px-1 py-0.5 text-[11px] leading-tight",
                      b.mine ? "border-ink bg-paper font-semibold" : "border-rule-taken bg-shade text-shade-ink",
                    )}
                    style={{ top: top(b.startMinutes) + 1, height: height(b.startMinutes, b.endMinutes) - 2 }}
                  >
                    {b.mine ? "Yours" : "Taken"}
                  </div>
                ))}
                {yoursHere && (
                  <div
                    className="pointer-events-none absolute inset-x-1 rounded-sm bg-ink px-1.5 py-1 text-[11px] leading-tight font-semibold text-paper transition-[top,height] duration-200 ease-out"
                    style={{ top: top(selection.start) + 1, height: height(selection.start, selection.end) - 2 }}
                  >
                    {space.code} · {minutesToClock(selection.start)}–{minutesToClock(selection.end)}
                    <span className="block font-bold">{formatPeso(quote.total)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GridScroller>
    </div>
  );
}
