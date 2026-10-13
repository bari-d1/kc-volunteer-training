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
  whatsappUrl: HttpUrlSchema,
});
export type LinksSetting = z.infer<typeof LinksSettingSchema>;

export const QuizSettingSchema = z.object({
  /** Percentage needed to pass, 0–100. */
  passMark: z.number().int().min(0).max(100),
  questionsPerAttempt: z.number().int().min(1).max(100),
});
export type QuizSetting = z.infer<typeof QuizSettingSchema>;

/** Value schema for each SiteSetting.key. */
export const siteSettingSchemas = {
  safeguarding: SafeguardingSettingSchema,
  links: LinksSettingSchema,
  quiz: QuizSettingSchema,
} as const;
export type SiteSettingKey = keyof typeof siteSettingSchemas;
export type SiteSettingValue<K extends SiteSettingKey> = z.infer<
  (typeof siteSettingSchemas)[K]
>;
