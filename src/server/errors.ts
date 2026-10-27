// An expected failure with a message safe to show the user.
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

// Postgres error code, unwrapped from Drizzle's query error.
export function pgCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.cause?.code ?? err?.code;
}
