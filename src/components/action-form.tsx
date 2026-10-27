"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/app/actions/state";
import { Button, cx, Notice } from "./ui";

type Variant = "primary" | "secondary" | "danger" | "quiet";

// A form bound to a server action. Shows the action's message and a busy label.
export function ActionForm({
  action,
  submit,
  busy = "Working…",
  variant = "primary",
  className,
  buttonClassName,
  children,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  submit: string;
  busy?: string;
  variant?: Variant;
  className?: string;
  buttonClassName?: string;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={cx("grid gap-3", className)} aria-busy={pending}>
      {children}
      {state?.error && <Notice tone="danger">{state.error}</Notice>}
      {state?.ok && <Notice tone="ok">{state.ok}</Notice>}
      <Button type="submit" variant={variant} disabled={pending} className={buttonClassName}>
        {pending ? busy : submit}
      </Button>
    </form>
  );
}
