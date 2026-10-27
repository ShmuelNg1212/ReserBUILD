import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { recordPaymentAction, rejectPaymentAction, setOutcomeAction, verifyPaymentAction, voidPaymentAction } from "@/app/actions/admin";
import {
  addParticipantAction,
  cancelBookingAction,
  checkInAction,
  removeParticipantAction,
  setAttendedAction,
  submitPaymentAction,
} from "@/app/actions/bookings";
import { ActionForm } from "@/components/action-form";
import { ChargeTally } from "@/components/charge-tally";
import { Badge, Field, Input, Notice, Section, Select } from "@/components/ui";
import { formatDayLong, formatPeso, formatRange, formatWhen, METHOD, STATUS } from "@/lib/format";
import { PAYMENT_ACCOUNTS } from "@/lib/payment-info";
import { requireActor } from "@/lib/session";
import { getDb } from "@/server/db";
import { AppError } from "@/server/errors";
import { getReservationDetail, RULES } from "@/server/reservations";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage({ params, searchParams }: PageProps<"/bookings/[id]">) {
  const actor = await requireActor();
  const { id } = await params;
  const isNew = (await searchParams).new === "1";
  let d: Awaited<ReturnType<typeof getReservationDetail>>;
  try {
    d = await getReservationDetail(getDb(), actor, Number(id));
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { reservation: r, space, owner, charges, payments, participants, balance } = d;
  const staff = actor.role === "admin";
  const now = new Date();
  const waiting = payments.find((p) => p.status === "pending");
  const lastRejected = [...payments].reverse().find((p) => p.status === "voided" && p.note && !p.paidAt);
  const canPay = r.status === "pending" && !waiting && !!r.paymentDueAt && now < r.paymentDueAt && balance !== "0.00";
  const checkInOpens = new Date(r.startAt.getTime() - RULES.checkInEarlyMinutes * 60_000);
  const canCheckIn = r.status === "confirmed" && now >= checkInOpens && now < r.endAt;
  const moneyIn = payments.some((p) => p.status === "pending" || p.status === "paid");
  const canCancel = (r.status === "pending" || r.status === "confirmed") && now < r.startAt && (staff || !moneyIn);
  const ended = now >= r.endAt;
  const status = STATUS[r.status];
  const hid = <input type="hidden" name="id" value={r.reservationId} />;

  return (
    <div className="mx-auto grid max-w-2xl gap-8 px-4 py-6">
      <Link href={staff ? "/admin/bookings" : "/bookings"} className="text-sm">
        {staff ? "Back to all bookings" : "Back to my bookings"}
      </Link>

      <div className="grid gap-3">
        {isNew && r.status === "pending" && <Notice tone="ok">Booked. The time is held for you until the payment deadline.</Notice>}
        <div className="flex items-start gap-4 rounded-lg bg-ink p-4 text-paper">
          <span className="grid size-14 shrink-0 place-items-center rounded-md bg-paper text-2xl font-bold text-ink" aria-hidden>
            {space.code}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{space.name}</h1>
            <p>{formatDayLong(r.startAt)}</p>
            <p className="text-lg font-semibold">{formatRange(r.startAt, r.endAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="text-graphite">
            {r.headcount} {r.headcount === 1 ? "person" : "people"} · {r.purpose}
          </span>
        </div>
        {staff && (
          <p className="text-sm text-graphite">
            Booked by {owner.firstName} {owner.lastName} ({owner.schoolId}, {owner.email}) on {formatWhen(r.createdAt)}
          </p>
        )}
        <NextStep />
      </div>

      <Section title="Charges">
        <ChargeTally charges={charges} total={r.totalAmount} />
      </Section>

      <Section title="Payment" action={<span className="text-sm">Balance {formatPeso(r.status === "cancelled" ? "0" : balance)}</span>}>
        {payments.length > 0 && (
          <ul className="divide-y divide-rule text-sm">
            {payments.map((p) => (
              <li key={p.paymentId} className="grid gap-2 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{formatPeso(p.amount)}</span>
                  <span>{METHOD[p.method]}</span>
                  {p.referenceNo && <span className="text-graphite">Ref {p.referenceNo}</span>}
                  <Badge tone={p.status === "paid" ? "ok" : p.status === "pending" ? "warn" : "danger"}>
                    {p.status === "paid" ? "Paid" : p.status === "pending" ? "Being checked" : p.paidAt ? "Voided" : "Rejected"}
                  </Badge>
                </div>
                <p className="text-graphite">
                  {p.submittedAt && `Sent ${formatWhen(p.submittedAt)}`}
                  {p.paidAt && ` · confirmed ${formatWhen(p.paidAt)} by ${p.receivedBy}`}
                  {p.note && ` · ${p.note}`}
                </p>
                {staff && p.status === "pending" && (
                  <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-end">
                    <ActionForm action={verifyPaymentAction} submit="Verify payment" busy="Verifying…">
                      {hid}
                      <input type="hidden" name="paymentId" value={p.paymentId} />
                    </ActionForm>
                    <ActionForm action={rejectPaymentAction} submit="Reject" variant="danger" className="sm:grid-cols-[1fr_auto] sm:items-end">
                      {hid}
                      <input type="hidden" name="paymentId" value={p.paymentId} />
                      <Field label="Reason for the user" htmlFor={`reject-${p.paymentId}`}>
                        <Input id={`reject-${p.paymentId}`} name="note" placeholder="Reference not found" required />
                      </Field>
                    </ActionForm>
                  </div>
                )}
                {staff && p.status === "paid" && (
                  <details className="text-sm">
                    <summary className="cursor-pointer py-1 underline">Void this payment</summary>
                    <ActionForm action={voidPaymentAction} submit="Void payment" variant="danger" className="mt-2">
                      {hid}
                      <input type="hidden" name="paymentId" value={p.paymentId} />
                      <Field label="Reason" htmlFor={`void-${p.paymentId}`}>
                        <Input id={`void-${p.paymentId}`} name="note" required />
                      </Field>
                    </ActionForm>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}

        {canPay && !staff && (
          <div className="grid gap-3">
            {lastRejected && <Notice tone="danger">Your last payment was rejected: {lastRejected.note}. Send it again.</Notice>}
            {PAYMENT_ACCOUNTS.length > 0 ? (
              <ul className="text-sm">
                {PAYMENT_ACCOUNTS.map((a) => (
                  <li key={a.method}>
                    <strong>{a.method}:</strong> {a.detail}
                  </li>
                ))}
              </ul>
            ) : (
              <Notice>Get the facility office&apos;s e-wallet or bank account from the office, then send {formatPeso(balance)}.</Notice>
            )}
            <ActionForm action={submitPaymentAction} submit={`I paid ${formatPeso(balance)}`} busy="Sending…">
              {hid}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Paid with" htmlFor="method">
                  <Select id="method" name="method" defaultValue="e_wallet">
                    <option value="e_wallet">E-wallet</option>
                    <option value="bank_transfer">Bank transfer</option>
                  </Select>
                </Field>
                <Field label="Reference number" htmlFor="referenceNo">
                  <Input id="referenceNo" name="referenceNo" autoComplete="off" required />
                </Field>
              </div>
            </ActionForm>
          </div>
        )}
        {payments.length === 0 && !canPay && <p className="text-sm text-graphite">No payments.</p>}

        {staff && r.status !== "cancelled" && balance !== "0.00" && (
          <details className="text-sm">
            <summary className="cursor-pointer py-1 underline">Record a payment at the office</summary>
            <ActionForm action={recordPaymentAction} submit="Record payment" className="mt-2">
              {hid}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Amount (₱)" htmlFor="amount">
                  <Input id="amount" name="amount" defaultValue={balance} inputMode="decimal" required />
                </Field>
                <Field label="Method" htmlFor="rec-method">
                  <Select id="rec-method" name="method" defaultValue="cash">
                    <option value="cash">Cash</option>
                    <option value="e_wallet">E-wallet</option>
                    <option value="bank_transfer">Bank transfer</option>
                  </Select>
                </Field>
                <Field label="Reference (optional)" htmlFor="rec-ref">
                  <Input id="rec-ref" name="referenceNo" />
                </Field>
              </div>
            </ActionForm>
          </details>
        )}
      </Section>

      <Section title={`Participants (${participants.length} of ${r.headcount})`}>
        {participants.length > 0 && (
          <ul className="divide-y divide-rule text-sm">
            {participants.map((p) => (
              <li key={p.participantId} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {p.fullName} {p.userId === null && <span className="font-normal text-graphite">· guest</span>}
                  </p>
                  <p className="text-graphite">{[p.email, p.affiliation].filter(Boolean).join(" · ")}</p>
                </div>
                <ActionForm action={setAttendedAction} submit={p.attended ? "Attended" : "Mark attended"} variant={p.attended ? "primary" : "secondary"} busy="Saving…">
                  {hid}
                  <input type="hidden" name="participantId" value={p.participantId} />
                  <input type="hidden" name="attended" value={String(!p.attended)} />
                </ActionForm>
                <ActionForm action={removeParticipantAction} submit="Remove" variant="quiet" busy="Removing…">
                  {hid}
                  <input type="hidden" name="participantId" value={p.participantId} />
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
        {r.status !== "cancelled" && participants.length < r.headcount && (
          <details open={participants.length === 0} className="text-sm">
            <summary className="cursor-pointer py-1 underline">Add a participant</summary>
            <ActionForm action={addParticipantAction} submit="Add participant" variant="secondary" className="mt-2">
              {hid}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Full name" htmlFor="fullName">
                  <Input id="fullName" name="fullName" required />
                </Field>
                <Field label="Email (optional)" htmlFor="pemail" hint="A school email links their account.">
                  <Input id="pemail" name="email" type="email" />
                </Field>
                <Field label="Affiliation (optional)" htmlFor="affiliation">
                  <Input id="affiliation" name="affiliation" placeholder="For guests" />
                </Field>
              </div>
            </ActionForm>
          </details>
        )}
      </Section>

      {(canCancel || (staff && ended && (r.status === "confirmed" || r.status === "checked_in"))) && (
        <Section title="Manage">
          {staff && ended && r.status === "checked_in" && (
            <ActionForm action={setOutcomeAction} submit="Mark completed" variant="secondary">
              {hid}
              <input type="hidden" name="outcome" value="completed" />
            </ActionForm>
          )}
          {staff && ended && r.status === "confirmed" && (
            <ActionForm action={setOutcomeAction} submit="Mark no-show" variant="secondary">
              {hid}
              <input type="hidden" name="outcome" value="no_show" />
            </ActionForm>
          )}
          {canCancel && (
            <details className="text-sm">
              <summary className="cursor-pointer py-1 text-danger underline">Cancel this booking</summary>
              <ActionForm action={cancelBookingAction} submit="Cancel booking" variant="danger" className="mt-2">
                {hid}
                {moneyIn ? (
                  <Field label="How was the payment refunded?" htmlFor="note" hint="Required. The user sees this.">
                    <Input id="note" name="note" required />
                  </Field>
                ) : (
                  <p className="text-graphite">The time is freed for others. This cannot be undone.</p>
                )}
              </ActionForm>
            </details>
          )}
        </Section>
      )}
    </div>
  );

  function NextStep() {
    if (r.status === "cancelled") return <Notice tone="danger">Cancelled {r.cancelledAt && formatWhen(r.cancelledAt)}{r.cancelReason ? `: ${r.cancelReason}` : "."}</Notice>;
    if (r.status === "pending" && waiting) return <Notice tone="warn">Staff are checking your payment (ref {waiting.referenceNo}). The time stays held meanwhile.</Notice>;
    if (r.status === "pending" && r.paymentDueAt)
      return <Notice tone="warn">Pay {formatPeso(balance)} by <strong>{formatWhen(r.paymentDueAt)}</strong>, or the booking is cancelled.</Notice>;
    if (canCheckIn)
      return (
        <ActionForm action={checkInAction} submit="Check in now" busy="Checking in…">
          {hid}
        </ActionForm>
      );
    if (r.status === "confirmed") return <Notice tone="ok">Paid and confirmed. Check-in opens {formatWhen(checkInOpens)}.</Notice>;
    if (r.status === "checked_in") return <Notice tone="ok">Checked in {r.checkedInAt && formatWhen(r.checkedInAt)}.</Notice>;
    return null;
  }
}
