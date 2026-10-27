"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap no-underline hover:bg-panel aria-[current=page]:bg-ink aria-[current=page]:text-paper"
    >
      {children}
    </Link>
  );
}
