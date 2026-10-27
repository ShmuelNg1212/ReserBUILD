import { formatPeso, formatRange } from "@/lib/format";
import { cx } from "./ui";

type Line = { segmentStart: Date; segmentEnd: Date; hours: string; rateApplied: string; amount: string; isPeak: boolean };

// Charges as a tally that sums exactly to the total. The bar draws each
// segment at a length proportional to its minutes.
export function ChargeTally({ charges, total, totalLabel = "Total" }: { charges: Line[]; total: string; totalLabel?: string }) {
  const minutes = (c: Line) => (c.segmentEnd.getTime() - c.segmentStart.getTime()) / 60_000;
  return (
    <div className="grid gap-2">
      <div aria-hidden className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {charges.map((c) => (
          <span
            key={c.segmentStart.getTime()}
            className={cx("block", c.isPeak ? "bg-ink" : "bg-[#a9a9a4]")}
            style={{ flexGrow: minutes(c) }}
          />
        ))}
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">Charges</caption>
        <tbody>
          {charges.map((c) => (
            <tr key={c.segmentStart.getTime()} className="border-b border-rule">
              <td className="py-2 pr-2">
                <span className="font-medium">{formatRange(c.segmentStart, c.segmentEnd)}</span>{" "}
                <span className="text-graphite">{c.isPeak ? "peak" : "off-peak"}</span>
              </td>
              <td className="py-2 pr-2 text-right whitespace-nowrap text-graphite">
                {c.hours} h × {formatPeso(c.rateApplied)}
              </td>
              <td className="py-2 text-right font-medium whitespace-nowrap">{formatPeso(c.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink">
            <th scope="row" colSpan={2} className="pt-2 text-left font-semibold">
              {totalLabel}
            </th>
            <td className="pt-2 text-right text-lg font-bold whitespace-nowrap">{formatPeso(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
