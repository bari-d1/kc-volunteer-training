import "server-only";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  siteSettingSchemas,
  type SiteSettingKey,
  type SiteSettingValue,
} from "@/lib/schemas/site-settings";
import { logChange } from "./change-log";

/** Every known setting, validated. Missing or invalid values come back as null. */
export async function getSiteSettings() {
  await requireAdmin();
  const rows = await prisma.siteSetting.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(
    (Object.keys(siteSettingSchemas) as SiteSettingKey[]).map((key) => {
      const parsed = siteSettingSchemas[key].safeParse(byKey.get(key));
      return [key, parsed.success ? parsed.data : null];
    }),
  ) as { [K in SiteSettingKey]: SiteSettingValue<K> | null };
}

export async function setSiteSetting<K extends SiteSettingKey>(
  key: K,
  value: unknown,
) {
  await requireAdmin();
  const schema = siteSettingSchemas[key];
  if (!schema) throw new Error(`Unknown setting “${key}”`);
  const data = schema.parse(value);
  return prisma.$transaction(async (tx) => {
    const setting = await tx.siteSetting.upsert({
      where: { key },
      create: { key, value: data },
      update: { value: data },
    });
    await logChange(
      tx,
      "SiteSetting",
      setting.id,
      "update",
      `Updated ${key} settings`,
    );
    return data as SiteSettingValue<K>;
  });
}
