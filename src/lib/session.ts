import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getActorForToken, type Actor } from "@/server/accounts";
import { getDb } from "@/server/db";
import type { Role } from "@/server/db/schema";

const COOKIE = "rb_session";

// One session lookup per request.
export const getActor = cache(async (): Promise<Actor | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? getActorForToken(getDb(), token) : null;
});

// For pages: send signed-out users to sign in, and the wrong role home.
export async function requireActor(...roles: Role[]): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  if (roles.length > 0 && !roles.includes(actor.role)) redirect("/");
  return actor;
}

export async function setSessionCookie(token: string, expires: Date) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function takeSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  store.delete(COOKIE);
  return token;
}
