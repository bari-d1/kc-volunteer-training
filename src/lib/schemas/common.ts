import { z } from "zod";

/** Trimmed string that can't be empty. */
export const NonEmptyString = z.string().trim().min(1);

/** Absolute http(s) URL. Rejects javascript:, data: and other schemes. */
export const HttpUrlSchema = z.url({ protocol: /^https?$/ });

/** Absolute http(s) URL or a site-relative path like /images/team.jpg. */
export const UrlOrPathSchema = z.union([
  HttpUrlSchema,
  z
    .string()
    .regex(
      /^\/(?!\/)\S*$/,
      "Expected an http(s) URL or a path starting with /",
    ),
]);

/** Colour tokens the UI can render (see globals.css). */
export const ColourTokenSchema = z.enum([
  "lime",
  "experience",
  "ministry",
  "creative",
  "systems",
]);
export type ColourToken = z.infer<typeof ColourTokenSchema>;

/** Loose phone check: digits, spaces and + ( ) - only. */
export const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{7,20}$/, "Expected a phone number");
