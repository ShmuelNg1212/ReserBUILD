import type { Metadata } from "next";
import Link from "next/link";
import { rejectPaymentAction, verifyPaymentAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Field, Input, Notice, SpaceMark } from "@/components/ui";
import { formatDay, formatPeso, formatRange, formatWhen, METHOD } from "@/lib/format";
import { requireActor } from "@/lib/session";
import { listPendingPayments } from "@/server/admin";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Payments to check" };

export default async function PaymentsQueue({ searchParams }: PageProps<"/admin">) {
  const actor = await requireActor("admin");
  const rows = await listPendingPayments(getDb(), actor);
  const { done, ref } = await searchParams;
  return (
    <>
      {done === "verified" && <Notice tone="ok">Verified payment {ref ? `ref ${ref}` : ""}. The booking is confirmed when fully paid.</Notice>}
      {done === "rejected" && <Notice tone="warn">Rejected payment {ref ? `ref ${ref}` : ""}. The user can send it again before the deadline.</Notice>}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-2">
        <h1 className="text-xl font-bold">Payments to check</h1>
        <p className="text-sm text-graphite">
          {rows.length === 0 ? "None waiting" : `${rows.length} waiting · oldest first`}
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="grid gap-1 py-10 text-center">
          <p className="font-semibold">No payments to check.</p>
          <p className="text-sm text-graphite">
            When a user sends a reference number, it shows here. <Link href="/admin/bookings?status=pending">See bookings waiting for payment</Link>.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-rule">
          {rows.map((r) => (
            <li key={r.payment.paymentId} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center">
              <Link href={`/bookings/${r.reservationId}`} className="flex items-center gap-3 no-underline hover:underline">
                <SpaceMark code={r.spaceCode} />
                <div className="min-w-0">
                  <p className="font-semibold">
                    {formatDay(r.startAt)} · {formatRange(r.startAt, r.endAt)}
                  </p>
                  <p className="truncate text-sm text-graphite">
                    {r.firstName} {r.lastName} · {r.schoolId}
                  </p>
                </div>
              </Link>
              <div className="text-sm">
                <p>
                  <span className="text-lg font-bold">{formatPeso(r.payment.amount)}</span> · {METHOD[r.payment.method]}
                </p>
                <p className="text-graphite">
                  Ref <span className="font-medium text-ink">{r.payment.referenceNo}</span> · sent{" "}
                  {r.payment.submittedAt && formatWhen(r.payment.submittedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <ActionForm action={verifyPaymentAction} submit="Verify" busy="Verifying…">
                  <input type="hidden" name="from" value="queue" />
                  <input type="hidden" name="id" value={r.reservationId} />
                  <input type="hidden" name="paymentId" value={r.payment.paymentId} />
                </ActionForm>
                <details className="text-sm">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-danger px-4 font-semibold text-danger hover:bg-danger-bg">
                    Reject
                  </summary>
                  <ActionForm action={rejectPaymentAction} submit="Reject payment" variant="danger" className="mt-2 w-64">
                    <input type="hidden" name="from" value="queue" />
                    <input type="hidden" name="id" value={r.reservationId} />
                    <input type="hidden" name="paymentId" value={r.payment.paymentId} />
                    <Field label="Reason for the user" htmlFor={`r-${r.payment.paymentId}`}>
                      <Input id={`r-${r.payment.paymentId}`} name="note" placeholder="Reference not found" required />
                    </Field>
                  </ActionForm>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
