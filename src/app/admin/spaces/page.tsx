import type { Metadata } from "next";
import { updateSpaceAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Field, Input, Select, SpaceMark } from "@/components/ui";
import { requireActor } from "@/lib/session";
import { listSpaces } from "@/server/admin";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Spaces" };

export default async function SpacesPage() {
  await requireActor("admin");
  const spaces = await listSpaces(getDb());
  return (
    <>
      <div className="grid gap-1 border-b-2 border-ink pb-2">
        <h1 className="text-xl font-bold">Spaces</h1>
        <p className="text-sm text-graphite">A space that is not open for booking keeps its existing bookings.</p>
      </div>
      <ul className="divide-y divide-rule">
        {spaces.map((s) => (
          <li key={s.spaceId} className="grid gap-3 py-4 md:grid-cols-[auto_1fr] md:items-start">
            <SpaceMark code={s.code} size="lg" muted={!s.isActive} />
            <ActionForm action={updateSpaceAction} submit="Save" variant="secondary" busy="Saving…" className="md:grid-cols-[1fr_auto] md:items-end">
              <input type="hidden" name="id" value={s.spaceId} />
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                <Field label="Name" htmlFor={`n${s.spaceId}`}>
                  <Input id={`n${s.spaceId}`} name="name" defaultValue={s.name} required />
                </Field>
                <Field label="Type" htmlFor={`t${s.spaceId}`}>
                  <Select id={`t${s.spaceId}`} name="spaceType" defaultValue={s.spaceType}>
                    <option value="build">Build</option>
                    <option value="meeting">Meeting</option>
                  </Select>
                </Field>
                <Field label="Capacity" htmlFor={`c${s.spaceId}`}>
                  <Input id={`c${s.spaceId}`} name="capacity" type="number" min={1} defaultValue={s.capacity} required />
                </Field>
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                  <input type="checkbox" name="isActive" value="on" defaultChecked={s.isActive} className="size-5" />
                  Open for booking
                </label>
              </div>
            </ActionForm>
          </li>
        ))}
      </ul>
    </>
  );
}
