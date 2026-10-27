import Link from "next/link";
import type { SpaceDay } from "@/lib/availability";
import { formatPeso, minutesToClock } from "@/lib/format";
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
// taken and closed time drawn in place, and your block in ink.
export function DayGrid({ days, from, to, selection, selectedCode, hrefFor }: Props) {
  const rows = Array.from({ length: (to - from) / 30 }, (_, i) => from + i * 30);
  const top = (m: number) => ((m - from) / 30) * ROW;
  const height = (a: number, b: number) => ((b - a) / 30) * ROW;
  const length = selection ? selection.end - selection.start : 60;

  const cols = { gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` };
  return (
    <div>
      <div className="grid" style={cols}>
        <div className="border-b-2 border-ink" />
        {days.map(({ space, quote, reason }) => {
          const selected = space.code === selectedCode;
          return (
            <Link
              key={space.spaceId}
              href={hrefFor({ space: space.code })}
              scroll={false}
              aria-current={selected ? "true" : undefined}
              className={cx(
                "grid min-h-14 place-items-center border-b-2 border-ink px-1 py-1.5 text-center no-underline",
                selected ? "bg-ink text-paper" : "hover:bg-panel",
              )}
            >
              <span className="text-lg leading-none font-bold">{space.code}</span>
              <span className={cx("text-xs", selected ? "text-paper" : "text-graphite")}>
                {quote
                  ? formatPeso(quote.total)
                  : reason
                    ? reason.startsWith("Taken") || reason.startsWith("You")
                      ? "Taken"
                      : "Not free"
                    : `${space.capacity} max`}
              </span>
              <span className="sr-only">
                {space.name}, up to {space.capacity} people.{" "}
                {quote ? `Free, ${formatPeso(quote.total)}` : (reason ?? "")}
              </span>
            </Link>
          );
        })}
      </div>
      <GridScroller scrollTo={selection ? top(selection.start) : 0}>
        <div className="grid" style={cols}>
          <div aria-hidden className="relative" style={{ height: rows.length * ROW }}>
            {rows.map((m) =>
              m % 60 === 0 ? (
                <span
                  key={m}
                  className="absolute right-2 pt-0.5 text-xs text-graphite"
                  style={{ top: top(m) }}
                >
                  {minutesToClock(m)}
                </span>
              ) : null,
            )}
          </div>

          {days.map(({ space, open, booked, quote }) => {
            const closed: [number, number][] = [];
            let cursor = from;
            for (const [a, b] of open) {
              if (a > cursor) closed.push([cursor, Math.min(a, to)]);
              cursor = Math.max(cursor, b);
            }
            if (cursor < to) closed.push([cursor, to]);
            // Ink only when this space can take the time; otherwise its taken block shows.
            const selectedHere = selection && space.code === selectedCode && !!quote;
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
                {closed.map(([a, b]) => (
                  <div
                    key={`c${a}`}
                    className="hatch pointer-events-none absolute inset-x-0"
                    style={{ top: top(a), height: height(a, b) }}
                  />
                ))}
                {selection && (
                  <div
                    className={cx("pointer-events-none absolute inset-x-0", selectedHere ? "" : "bg-ink/5")}
                    style={{ top: top(selection.start), height: height(selection.start, selection.end) }}
                  />
                )}
                {booked.map((b) => (
                  <div
                    key={b.startMinutes}
                    className={cx(
                      "pointer-events-none absolute inset-x-1 rounded-sm border px-1 py-0.5 text-[11px] leading-tight",
                      b.mine ? "border-ink bg-paper font-semibold" : "border-[#d2d2ce] bg-shade text-shade-ink",
                    )}
                    style={{ top: top(b.startMinutes) + 1, height: height(b.startMinutes, b.endMinutes) - 2 }}
                  >
                    {b.mine ? "Yours" : "Taken"}
                  </div>
                ))}
                {selectedHere && (
                  <div
                    className="pointer-events-none absolute inset-x-1 rounded-sm bg-ink px-1.5 py-1 text-[11px] leading-tight font-semibold text-paper"
                    style={{ top: top(selection.start) + 1, height: height(selection.start, selection.end) - 2 }}
                  >
                    {space.code} · {minutesToClock(selection.start)}–{minutesToClock(selection.end)}
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
