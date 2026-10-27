import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "@/app/actions/auth";
import { ActionForm } from "@/components/action-form";
import { Field, Input, Select } from "@/components/ui";
import { getActor } from "@/lib/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUp() {
  if (await getActor()) redirect("/");
  return (
    <div className="mx-auto grid max-w-lg gap-6 px-4 py-10">
      <div className="grid gap-1 border-b-2 border-ink pb-3">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-sm text-graphite">For Ateneo students and faculty.</p>
      </div>
      <ActionForm action={signUpAction} submit="Create account" busy="Creating account…">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName">
            <Input id="firstName" name="firstName" autoComplete="given-name" required />
          </Field>
          <Field label="Last name" htmlFor="lastName">
            <Input id="lastName" name="lastName" autoComplete="family-name" required />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="School ID" htmlFor="schoolId">
            <Input id="schoolId" name="schoolId" required />
          </Field>
          <Field label="I am a" htmlFor="role">
            <Select id="role" name="role" defaultValue="student">
              <option value="student">Student</option>
              <option value="faculty">Faculty member</option>
            </Select>
          </Field>
        </div>
        <Field label="School email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Phone (optional)" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Department (optional)" htmlFor="department">
            <Input id="department" name="department" />
          </Field>
          <Field label="Program (optional)" htmlFor="program">
            <Input id="program" name="program" />
          </Field>
        </div>
        <Field label="Year level" htmlFor="yearLevel" hint="Students only. Faculty can leave this blank.">
          <Input id="yearLevel" name="yearLevel" inputMode="numeric" className="max-w-24" />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </ActionForm>
      <p className="text-sm">
        Have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
