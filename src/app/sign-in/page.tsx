import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signInAction } from "@/app/actions/auth";
import { ActionForm } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { getActor } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignIn() {
  if (await getActor()) redirect("/");
  return (
    <div className="mx-auto grid max-w-sm gap-6 px-4 py-10">
      <div className="grid gap-1 border-b-2 border-ink pb-3">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-sm text-graphite">Book a campus space, see the price, and pay ahead.</p>
      </div>
      <ActionForm action={signInAction} submit="Sign in" busy="Signing in…">
        <Field label="School email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
      </ActionForm>
      <p className="text-sm">
        New here? <Link href="/sign-up">Create an account</Link>
      </p>
    </div>
  );
}
