import { z } from "zod";
import { ContactPersonSchema } from "./blocks";
import { HttpUrlSchema } from "./common";

export const SafeguardingSettingSchema = z.object({
  email: z.email(),
  contacts: z.array(ContactPersonSchema).min(1),
});
export type SafeguardingSetting = z.infer<typeof SafeguardingSettingSchema>;

export const LinksSettingSchema = z.object({
  incidentFormUrl: HttpUrlSchema,
  /** Left out until KC shares the volunteers' group link. */
  whatsappUrl: HttpUrlSchema.optional(),
});
export type LinksSetting = z.infer<typeof LinksSettingSchema>;

export const QuizSettingSchema = z.object({
  /** Percentage needed to pass, 0–100. */
  passMark: z.number().int().min(0).max(100),
  questionsPerAttempt: z.number().int().min(1).max(100),
});
export type QuizSetting = z.infer<typeof QuizSettingSchema>;

export const EmailsSettingSchema = z.object({
  /** Reminder emails to volunteers who've paused, for everyone. */
  remindersEnabled: z.boolean(),
  /** Who gets the admin digest; overrides ADMIN_DIGEST_TO when not empty. */
  digestRecipients: z.array(z.email("Enter a valid email address")).max(10),
});
export type EmailsSetting = z.infer<typeof EmailsSettingSchema>;

/** Admin cookies carry this; bumping it signs every admin out. */
export const AdminSessionSettingSchema = z.object({
  version: z.number().int().min(0),
});

/** Value schema for each SiteSetting.key. */
export const siteSettingSchemas = {
  safeguarding: SafeguardingSettingSchema,
  links: LinksSettingSchema,
  quiz: QuizSettingSchema,
  emails: EmailsSettingSchema,
  adminSession: AdminSessionSettingSchema,
} as const;
export type SiteSettingKey = keyof typeof siteSettingSchemas;
export type SiteSettingValue<K extends SiteSettingKey> = z.infer<
  (typeof siteSettingSchemas)[K]
>;
