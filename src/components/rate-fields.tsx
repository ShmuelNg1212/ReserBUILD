import type { Rate, Space } from "@/server/db/schema";
import { DAY_LABEL } from "@/lib/format";
import { Field, Input, Select } from "./ui";

// Fields shared by the add and edit rate forms.
export function RateFields({ spaces, rate }: { spaces: Space[]; rate?: Rate }) {
  const id = (n: string) => `${rate ? `r${rate.rateId}` : "new"}-${n}`;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Field label="Space" htmlFor={id("space")}>
        <Select id={id("space")} name="spaceId" defaultValue={rate?.spaceId ?? ""}>
          <option value="">All spaces</option>
          {spaces.map((s) => (
            <option key={s.spaceId} value={s.spaceId}>
              {s.code} · {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Day" htmlFor={id("day")}>
        <Select id={id("day")} name="dayOfWeek" defaultValue={rate?.dayOfWeek ?? ""}>
          <option value="">Every day</option>
          {Object.entries(DAY_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="From" htmlFor={id("start")}>
        <Input id={id("start")} name="startTime" type="time" step={1800} defaultValue={rate?.startTime.slice(0, 5) ?? "07:00"} required />
      </Field>
      <Field label="To" htmlFor={id("end")}>
        <Input id={id("end")} name="endTime" type="time" step={1800} defaultValue={rate?.endTime.slice(0, 5) ?? "17:00"} required />
      </Field>
      <Field label="Per hour (₱)" htmlFor={id("rate")}>
        <Input id={id("rate")} name="hourlyRate" inputMode="decimal" defaultValue={rate?.hourlyRate} required />
      </Field>
      <Field label="First day" htmlFor={id("from")}>
        <Input id={id("from")} name="effectiveFrom" type="date" defaultValue={rate?.effectiveFrom} required />
      </Field>
      <Field label="Last day (optional)" htmlFor={id("to")}>
        <Input id={id("to")} name="effectiveTo" type="date" defaultValue={rate?.effectiveTo ?? ""} />
      </Field>
      <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium">
        <input type="checkbox" name="isPeak" value="on" defaultChecked={rate?.isPeak} className="size-5" />
        Peak rate
      </label>
    </div>
  );
}
