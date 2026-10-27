import { requireActor } from "@/lib/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireActor("admin");
  return <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6">{children}</div>;
}
