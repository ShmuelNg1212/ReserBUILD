"use server";

import { redirect } from "next/navigation";
import { signIn, signOut, signUp } from "@/server/accounts";
import { getDb } from "@/server/db";
import { setSessionCookie, takeSessionCookie } from "@/lib/session";
import { failure, field, type ActionState } from "./state";

export async function signInAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { token, expiresAt } = await signIn(getDb(), field(form, "email") ?? "", field(form, "password") ?? "");
    await setSessionCookie(token, expiresAt);
  } catch (e) {
    return failure(e);
  }
  redirect("/");
}

export async function signUpAction(_: ActionState, form: FormData): Promise<ActionState> {
  const input = Object.fromEntries([...form.entries()].filter(([k]) => !k.startsWith("$")));
  try {
    await signUp(getDb(), input);
    const { token, expiresAt } = await signIn(getDb(), String(input.email), String(input.password));
    await setSessionCookie(token, expiresAt);
  } catch (e) {
    return failure(e);
  }
  redirect("/book");
}

export async function signOutAction() {
  const token = await takeSessionCookie();
  if (token) await signOut(getDb(), token);
  redirect("/sign-in");
}
