"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Field, Input, Select } from "./ui";

// Time first: date, start, end, people. Applies on change; the button is the
// no-JavaScript fallback.
export function BookingControls({
  date,
  start,
  end,
  people,
  space,
  times,
}: {
  date: string;
  start: string;
  end: string;
  people: number;
  space?: string;
  times: string[];
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const apply = () => {
    const params = new URLSearchParams(new FormData(form.current!) as unknown as Record<string, string>);
    router.replace(`/book?${params}`, { scroll: false });
  };
  return (
    <form ref={form} method="get" action="/book" onChange={apply} className="grid grid-cols-[1fr_1fr_5.5rem] items-end gap-3">
      {space && <input type="hidden" name="space" value={space} />}
      <input type="hidden" name="date" value={date} />
      <Field label="From" htmlFor="start">
        <Select id="start" name="start" defaultValue={start}>
          {times.slice(0, -1).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </Field>
      <Field label="To" htmlFor="end">
        <Select id="end" name="end" defaultValue={end}>
          {times.slice(1).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </Field>
      <Field label="People" htmlFor="people">
        <Input id="people" name="people" type="number" min={1} max={200} defaultValue={people} inputMode="numeric" />
      </Field>
      <noscript>
        <button className="min-h-11 rounded-lg border border-ink px-4 text-sm font-semibold">Show</button>
      </noscript>
    </form>
  );
}
