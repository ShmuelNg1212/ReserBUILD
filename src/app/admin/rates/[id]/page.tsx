import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateRateAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { RateFields } from "@/components/rate-fields";
import { Notice } from "@/components/ui";
import { requireActor } from "@/lib/session";
import { getRate, listSpaces } from "@/server/admin";
import { getDb } from "@/server/db";
import { isAppError } from "@/server/errors";

export const metadata: Metadata = { title: "Edit rate" };

export default async function EditRate({ params }: PageProps<"/admin/rates/[id]">) {
  const actor = await requireActor("admin");
  const db = getDb();
  const found = await getRate(db, actor, Number((await params).id)).catch((e) => {
    if (isAppError(e) && e.code === "NOT_FOUND") return null;
    throw e;
  });
  if (!found) notFound();
  const { rate, usedBy: used } = found;
  const spaces = await listSpaces(db);
  return (
    <div className="grid max-w-4xl gap-4">
      <Link href="/admin/rates" className="text-sm">
        Back to rates
      </Link>
      <h1 className="border-b-2 border-ink pb-2 text-xl font-bold">Edit rate</h1>
      {used > 0 && (
        <Notice tone="warn">
          {used} {used === 1 ? "charge uses" : "charges use"} this rate. Existing bookings keep the price they were
          given. To change the price from a date, set a last day here and add a new rate.
        </Notice>
      )}
      <ActionForm action={updateRateAction} submit="Save rate" busy="Saving…">
        <input type="hidden" name="id" value={rate.rateId} />
        <RateFields spaces={spaces} rate={rate} />
      </ActionForm>
    </div>
  );
}
