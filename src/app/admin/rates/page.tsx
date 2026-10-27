import type { Metadata } from "next";
import Link from "next/link";
import { createRateAction, deleteRateAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { RateFields } from "@/components/rate-fields";
import { Badge, Section } from "@/components/ui";
import { DAY_LABEL, formatPeso } from "@/lib/format";
import { requireActor } from "@/lib/session";
import { listRates, listSpaces } from "@/server/admin";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Rates" };

export default async function RatesPage() {
  await requireActor("admin");
  const db = getDb();
  const [rates, spaces] = await Promise.all([listRates(db), listSpaces(db)]);
  const code = (id: number | null) => (id === null ? "All" : (spaces.find((s) => s.spaceId === id)?.code ?? "?"));

  return (
    <>
      <div className="grid gap-1 border-b-2 border-ink pb-2">
        <h1 className="text-xl font-bold">Rates</h1>
        <p className="text-sm text-graphite">
          When rates overlap, a rate for one space beats an all-spaces rate, then a rate for one day beats an every-day
          rate. Time with no rate is closed.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2 pr-3 font-semibold">Space</th>
              <th className="py-2 pr-3 font-semibold">Day</th>
              <th className="py-2 pr-3 font-semibold">Hours</th>
              <th className="py-2 pr-3 text-right font-semibold">Per hour</th>
              <th className="py-2 pr-3 font-semibold">In effect</th>
              <th className="py-2 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.rateId} className="border-b border-rule">
                <td className="py-2 pr-3 font-bold">{code(r.spaceId)}</td>
                <td className="py-2 pr-3">{r.dayOfWeek ? DAY_LABEL[r.dayOfWeek] : "Every day"}</td>
                <td className="py-2 pr-3">
                  {r.startTime.slice(0, 5)}–{r.endTime.slice(0, 5)} {r.isPeak && <Badge tone="ink">Peak</Badge>}
                </td>
                <td className="py-2 pr-3 text-right font-medium">{formatPeso(r.hourlyRate)}</td>
                <td className="py-2 pr-3">
                  {r.effectiveFrom} → {r.effectiveTo ?? "open"}
                </td>
                <td className="py-1">
                  <div className="flex items-start justify-end gap-1">
                    <Link href={`/admin/rates/${r.rateId}`} className="inline-flex min-h-11 items-center px-2">
                      Edit
                    </Link>
                    <ActionForm action={deleteRateAction} submit="Delete" variant="quiet" busy="Deleting…">
                      <input type="hidden" name="id" value={r.rateId} />
                    </ActionForm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Section title="Add a rate">
        <ActionForm action={createRateAction} submit="Add rate" busy="Adding…" className="max-w-4xl">
          <RateFields spaces={spaces} />
        </ActionForm>
      </Section>
    </>
  );
}
