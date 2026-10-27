// Money is handled as integer cents and stored as numeric(10,2) strings.

export function toCents(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid amount: ${value}`);
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

// Display only; never use the result for arithmetic.
export function formatPeso(value: string | number): string {
  const amount = typeof value === "number" ? value / 100 : Number(value);
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}
