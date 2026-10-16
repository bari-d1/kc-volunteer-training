import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  siteSettingSchemas,
  type SiteSettingKey,
  type SiteSettingValue,
} from "@/lib/schemas/site-settings";

/**
 * One setting, validated against its schema; null if it's missing or
 * invalid. Read once per request.
 */
export const getSetting = cache(
  async <K extends SiteSettingKey>(
    key: K,
  ): Promise<SiteSettingValue<K> | null> => {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    const parsed = siteSettingSchemas[key].safeParse(row?.value);
    return parsed.success ? (parsed.data as SiteSettingValue<K>) : null;
  },
);

/** Admin digest recipients: the Settings list, else ADMIN_DIGEST_TO. */
export async function getAdminDigestRecipients() {
  const emails = await getSetting("emails");
  if (emails?.digestRecipients.length) return emails.digestRecipients;
  return (process.env.ADMIN_DIGEST_TO ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}
