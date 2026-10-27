import type { Metadata } from "next";
import Link from "next/link";
import { Badge, buttonClass, Section, SpaceMark } from "@/components/ui";
import { formatDay, formatRange, formatWhen, STATUS } from "@/lib/format";
import { formatPeso } from "@/server/money";
import { requireActor } from "@/lib/session";
import { getDb } from "@/server/db";
import { listMyReservations } from "@/server/reservations";

export const metadata: Metadata = { title: "My bookings" };

export default async function MyBookings() {
  const actor = await requireActor();
  const rows = await listMyReservations(getDb(), actor);
  const { upcoming, past } = splitByTime(rows, new Date());

  return (
    <div className="mx-auto grid max-w-3xl gap-8 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">My bookings</h1>
        <Link href="/book" className={buttonClass("primary", "no-underline")}>
          Book a space
        </Link>
      </div>
      <Section title="Upcoming">
        {upcoming.length === 0 ? (
          <p className="text-sm text-graphite">
            Nothing booked yet. <Link href="/book">Find a free space</Link> for the time you need.
          </p>
        ) : (
          <List rows={upcoming} />
        )}
      </Section>
      {past.length > 0 && (
        <Section title="Past and cancelled">
          <List rows={past} />
        </Section>
      )}
    </div>
  );
}

function List({ rows }: { rows: Awaited<ReturnType<typeof listMyReservations>> }) {
  return (
    <ul className="divide-y divide-rule">
      {rows.map(({ reservation: r, spaceCode, spaceName, balance }) => {
        const status = STATUS[r.status];
        return (
          <li key={r.reservationId}>
            <Link href={`/bookings/${r.reservationId}`} className="flex items-center gap-3 py-3 no-underline hover:bg-panel">
              <SpaceMark code={spaceCode} muted={r.status === "cancelled"} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {formatDay(r.startAt)} · {formatRange(r.startAt, r.endAt)}
                </p>
                <p className="truncate text-sm text-graphite">
                  {spaceName}
                  {r.status === "pending" && r.paymentDueAt && ` · pay by ${formatWhen(r.paymentDueAt)}`}
                </p>
              </div>
              <div className="grid justify-items-end gap-1">
                <Badge tone={status.tone}>{status.label}</Badge>
                <span className="text-sm font-medium">{formatPeso(r.status === "pending" ? balance : r.totalAmount)}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Upcoming runs soonest first; past and cancelled run newest first.
function splitByTime(rows: Awaited<ReturnType<typeof listMyReservations>>, now: Date) {
  const upcoming = rows.filter((r) => r.reservation.endAt > now && r.reservation.status !== "cancelled").reverse();
  return { upcoming, past: rows.filter((r) => !upcoming.includes(r)) };
}
