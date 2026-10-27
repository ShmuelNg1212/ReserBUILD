import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { getActor } from "@/lib/session";
import { NavLink } from "./nav-link";

export async function AppHeader() {
  const actor = await getActor();
  const links = !actor
    ? []
    : actor.role === "admin"
      ? [
          { href: "/admin", label: "Payments" },
          { href: "/admin/bookings", label: "Bookings" },
          { href: "/admin/rates", label: "Rates" },
          { href: "/admin/spaces", label: "Spaces" },
        ]
      : [
          { href: "/book", label: "Book" },
          { href: "/bookings", label: "My bookings" },
        ];
  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
        <Link href="/" className="py-2 text-base font-bold tracking-tight no-underline">
          ReserBUILD
        </Link>
        {links.length > 0 && (
          <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href} exact={l.href === "/admin"}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
        {actor && (
          <form action={signOutAction} className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-graphite">
              <span className="sm:hidden" aria-hidden>
                {actor.name.split(" ").map((w) => w[0]).join("")}
              </span>
              <span className="sr-only sm:not-sr-only">
                {actor.name}
                {actor.role === "admin" && " · Staff"}
              </span>
            </span>
            <button className="min-h-11 rounded-lg px-2 font-medium underline hover:bg-panel">Sign out</button>
          </form>
        )}
      </div>
    </header>
  );
}
