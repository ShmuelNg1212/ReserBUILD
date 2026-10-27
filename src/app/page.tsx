import { redirect } from "next/navigation";
import { requireActor } from "@/lib/session";

export default async function Home() {
  const actor = await requireActor();
  redirect(actor.role === "admin" ? "/admin" : "/book");
}
