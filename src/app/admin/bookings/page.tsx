import type { Metadata } from "next";
import Link from "next/link";
import { Badge, cx } from "@/components/ui";
import { formatDay, formatRange, STATUS } from "@/lib/format";
import { formatPeso } from "@/server/money";
import { requireActor } from "@/lib/session";
import { getDb } from "@/server/db";
import type { ReservationStatus } from "@/server/db/schema";
import { listAllReservations } from "@/server/reservations";

export const metadata: Metadata = { title: "All bookings" };

const FILTERS: { value?: ReservationStatus; label: string }[] = [
  { label: "All" },
  { value: "pending", label: "Waiting for payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked in" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

export default async function AllBookings({ searchParams }: PageProps<"/admin/bookings">) {
  const actor = await requireActor("admin");
  const { status } = await searchParams;
  const all = await listAllReservations(getDb(), actor);
  const rows = status ? all.filter((r) => r.reservation.status === status) : all;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-2">
        <h1 className="text-xl font-bold">All bookings</h1>
        <p className="text-sm text-graphite">{rows.length} shown</p>
      </div>
      <nav aria-label="Filter by status" className="-mx-1 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => {
          const current = (f.value ?? "") === (status ?? "");
          return (
            <Link
              key={f.label}
              href={f.value ? `/admin/bookings?status=${f.value}` : "/admin/bookings"}
              aria-current={current ? "page" : undefined}
              className={cx(
                "inline-flex min-h-11 items-center rounded-md border px-3 text-sm whitespace-nowrap no-underline",
                current ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-graphite">No bookings with this status.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-semibold">Space</th>
                <th className="py-2 pr-3 font-semibold">When</th>
                <th className="py-2 pr-3 font-semibold">Booked by</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 text-right font-semibold">Total</th>
                <th className="py-2 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ reservation: r, spaceCode, ownerFirst, ownerLast, balance }) => (
                <tr key={r.reservationId} className="border-b border-rule hover:bg-panel">
                  <td className="py-2.5 pr-3 font-bold">{spaceCode}</td>
                  <td className="py-2.5 pr-3">
                    <Link href={`/bookings/${r.reservationId}`} className="font-medium">
                      {formatDay(r.startAt)} · {formatRange(r.startAt, r.endAt)}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    {ownerFirst} {ownerLast}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                  </td>
                  <td className="py-2.5 pr-3 text-right">{formatPeso(r.totalAmount)}</td>
                  <td className="py-2.5 text-right">{formatPeso(balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
