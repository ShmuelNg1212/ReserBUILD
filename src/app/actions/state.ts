import { isAppError } from "@/server/errors";

export type ActionState = { error?: string; ok?: string } | undefined;

// Turn an expected domain failure into a message for the form; rethrow the rest.
export function failure(e: unknown): ActionState {
  if (isAppError(e)) return { error: e.message };
  throw e;
}

export const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v : undefined;
};

export const idOf = (form: FormData, name = "id") => Number(field(form, name));
