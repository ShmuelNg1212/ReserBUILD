"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Keeps the chosen block in view inside the day grid, with an hour of context above.
export function GridScroller({ scrollTo, children }: { scrollTo: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: Math.max(0, scrollTo - 80) });
  }, [scrollTo]);
  return (
    <div ref={box} className="max-h-[min(62vh,36rem)] overflow-y-auto overscroll-contain border-b border-rule">
      {children}
    </div>
  );
}
