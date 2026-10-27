import type { Metadata } from "next";
import Link from "next/link";
import { createBookingAction } from "@/app/actions/bookings";
import { ActionForm } from "@/components/action-form";
import { ChargeTally } from "@/components/charge-tally";
import { Field, Notice, SpaceMark, Textarea } from "@/components/ui";
import { formatDayLong, formatWhen } from "@/lib/format";
import { requireActor } from "@/lib/session";
import { getDb } from "@/server/db";
import { loadDay } from "@/server/availability";
import { paymentDueAt } from "@/server/reservations";
import { atLocal } from "@/server/time";

export const metadata: Metadata = { title: "Review booking" };

export default async function ReviewPage({ searchParams }: PageProps<"/book/review">) {
  const actor = await requireActor();
  const q = await searchParams;
  const s = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : "");
  const sel = { date: s("date"), start: s("start"), end: s("end"), people: Math.max(1, Number(q.people) || 1) };
  const back = `/book?${new URLSearchParams({ ...sel, people: String(sel.people), space: s("space") })}`;

  const slot = { date: sel.date, startTime: sel.start, endTime: sel.end, headcount: sel.people };
  const days = /^\d{4}-\d{2}-\d{2}$/.test(sel.date) ? await loadDay(getDb(), actor, sel.date, slot) : [];
  const day = days.find((d) => d.space.code === s("space"));

  if (!day?.quote) {
    return (
      <div className="mx-auto grid max-w-lg gap-4 px-4 py-8">
        <h1 className="text-xl font-bold">This time is no longer available</h1>
        <Notice tone="warn">{day?.reason ?? "Pick a space and a time first."}</Notice>
        <Link href={back}>Back to the schedule</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-lg gap-6 px-4 py-6">
      <Link href={back} className="text-sm">
        Change time or space
      </Link>
      <div className="flex items-center gap-4 border-b-2 border-ink pb-4">
        <SpaceMark code={day.space.code} size="lg" />
        <div>
          <h1 className="text-xl font-bold">{day.space.name}</h1>
          <p className="text-graphite">{formatDayLong(atLocal(sel.date, "12:00"))}</p>
          <p className="font-semibold">
            {sel.start}–{sel.end} · {sel.people} {sel.people === 1 ? "person" : "people"}
          </p>
        </div>
      </div>

      <ChargeTally charges={day.quote.charges} total={day.quote.total} />

      <Notice tone="warn">
        Pay by <strong>{formatWhen(paymentDueAt(new Date(), atLocal(sel.date, sel.start)))}</strong>, or the booking is
        cancelled and the space is freed. You pay by e-wallet or bank transfer and enter the reference number; staff
        then confirm it.
      </Notice>

      <ActionForm action={createBookingAction} submit={`Book and hold this time`} busy="Booking…">
        <input type="hidden" name="spaceId" value={day.space.spaceId} />
        <input type="hidden" name="date" value={sel.date} />
        <input type="hidden" name="startTime" value={sel.start} />
        <input type="hidden" name="endTime" value={sel.end} />
        <input type="hidden" name="headcount" value={sel.people} />
        <Field
          label="What is the booking for?"
          htmlFor="purpose"
          hint="Staff see this. For example: thesis group meeting."
        >
          <Textarea id="purpose" name="purpose" rows={2} maxLength={500} required />
        </Field>
      </ActionForm>
    </div>
  );
}
