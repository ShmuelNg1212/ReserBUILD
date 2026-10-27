// The mark: a schedule frame with a header rule, one taken block (gray) and
// one booked block (ink). See DESIGN.md, Brand.
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <rect x="3" y="3" width="26" height="26" rx="4" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M3 10h26" stroke="var(--color-ink)" strokeWidth="2" />
      <rect x="7" y="13" width="8" height="6" rx="1.5" fill="var(--color-rule-taken)" />
      <rect x="17" y="17" width="8" height="8" rx="1.5" fill="var(--color-ink)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-base tracking-tight">
      <LogoMark />
      <span>
        <span className="font-medium">Reser</span>
        <span className="font-bold">BUILD</span>
      </span>
    </span>
  );
}
