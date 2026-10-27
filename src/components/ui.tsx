import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "danger" | "quiet";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-[#333] disabled:bg-graphite",
  secondary: "border border-ink bg-paper text-ink hover:bg-panel",
  danger: "border border-danger bg-paper text-danger hover:bg-danger-bg",
  quiet: "text-ink underline hover:bg-panel",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-70",
    variants[variant],
    className,
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

const control =
  "block min-h-11 w-full rounded-lg border border-graphite bg-paper px-3 text-base text-ink placeholder:text-graphite " +
  "aria-[invalid=true]:border-danger";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(control, props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(control, "pr-8", props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(control, "py-2", props.className)} />;
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-graphite">{hint}</p>}
    </div>
  );
}

type Tone = "neutral" | "ok" | "warn" | "danger" | "ink";

const tones: Record<Tone, string> = {
  neutral: "bg-shade text-shade-ink",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  ink: "bg-ink text-paper",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: Exclude<Tone, "ink">; children: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-lg px-3 py-2.5 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

// A section of a working page: heading over a 2px ink rule, as on the schedule printout.
export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <div className="flex items-end justify-between gap-3 border-b-2 border-ink pb-1.5">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// The space letter: one recurring form at three fixed sizes.
export function SpaceMark({ code, size = "md", muted }: { code: string; size?: "sm" | "md" | "lg"; muted?: boolean }) {
  const sizes = { sm: "size-7 text-sm", md: "size-10 text-lg", lg: "size-14 text-2xl" };
  return (
    <span
      aria-hidden
      className={cx(
        "grid shrink-0 place-items-center rounded-md font-bold",
        sizes[size],
        muted ? "border border-rule text-graphite" : "bg-ink text-paper",
      )}
    >
      {code}
    </span>
  );
}

export { cx };
