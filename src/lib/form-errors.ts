import type { z } from "zod";

/** What every admin server action returns. */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | {
      ok: false;
      /** A message for the whole form or a toast. */
      error: string;
      /** Per-field messages, keyed by dotted path, e.g. "options.1.text". */
      fieldErrors?: Record<string, string>;
    };

/** The first message for each field in a Zod error, keyed by dotted path. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    errors[key] ??= issue.message;
  }
  return errors;
}

/** An ActionResult for input that failed validation. */
export function invalid(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    error: "Some fields need fixing.",
    fieldErrors: fieldErrors(error),
  };
}
