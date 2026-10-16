import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { DEFAULT_COURSE_SLUG } from "@/lib/course-config";
import { prisma } from "@/lib/prisma";
import {
  AdminSessionSettingSchema,
  EmailsSettingSchema,
  LinksSettingSchema,
  QuizSettingSchema,
  SafeguardingSettingSchema,
  siteSettingSchemas,
  type SiteSettingKey,
  type SiteSettingValue,
} from "@/lib/schemas/site-settings";
import { logChange } from "./change-log";
import { SettingsError } from "./inputs";

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

// ─── Settings page ──────────────────────────────────────────────────────────

/**
 * How many questions the active bank can put in one attempt: each group
 * counts once, each ungrouped question once (see drawQuestions).
 */
export async function getQuizBankStatus() {
  await requireAdmin();
  const course = await prisma.course.findUnique({
    where: { slug: DEFAULT_COURSE_SLUG },
    select: { id: true },
  });
  const where = { courseId: course?.id ?? "", isActive: true };
  const [ungrouped, groups, required] = await Promise.all([
    prisma.quizQuestion.count({ where: { ...where, group: null } }),
    prisma.quizQuestion.groupBy({
      by: ["group"],
      where: { ...where, group: { not: null } },
    }),
    prisma.quizQuestion.count({ where: { ...where, isRequired: true } }),
  ]);
  return { drawUnits: ungrouped + groups.length, required };
}

const SafeguardingFormSchema = SafeguardingSettingSchema.extend({
  incidentFormUrl: LinksSettingSchema.shape.incidentFormUrl,
});

/** Safeguarding contacts and the incident form link (stored under links). */
export async function saveSafeguardingSettings(input: unknown) {
  await requireAdmin();
  const { incidentFormUrl, ...safeguarding } =
    SafeguardingFormSchema.parse(input);
  const links = await prisma.siteSetting.findUnique({
    where: { key: "links" },
  });
  const current = LinksSettingSchema.partial().safeParse(links?.value);
  await setSiteSetting("safeguarding", safeguarding);
  await setSiteSetting("links", {
    ...(current.success ? current.data : {}),
    incidentFormUrl,
  });
}

/** The volunteers' WhatsApp group link (empty to remove it). */
export async function saveWhatsappLink(input: unknown) {
  await requireAdmin();
  const { whatsappUrl } = z
    .object({ whatsappUrl: LinksSettingSchema.shape.whatsappUrl })
    .parse(input);
  const links = await prisma.siteSetting.findUnique({
    where: { key: "links" },
  });
  const current = LinksSettingSchema.safeParse(links?.value);
  if (!current.success) {
    throw new SettingsError({
      whatsappUrl: "Save the safeguarding incident form link first.",
    });
  }
  await setSiteSetting("links", { ...current.data, whatsappUrl });
}

/** Pass mark and questions per attempt, checked against the question bank. */
export async function saveQuizSettings(input: unknown) {
  await requireAdmin();
  const quiz = QuizSettingSchema.parse(input);
  const bank = await getQuizBankStatus();
  if (quiz.questionsPerAttempt > bank.drawUnits) {
    throw new SettingsError({
      questionsPerAttempt: `The active question bank only has ${bank.drawUnits} different questions to draw from.`,
    });
  }
  if (quiz.questionsPerAttempt < bank.required) {
    throw new SettingsError({
      questionsPerAttempt: `${bank.required} questions are required in every attempt, so it needs at least ${bank.required}.`,
    });
  }
  await setSiteSetting("quiz", quiz);
}

export async function saveEmailSettings(input: unknown) {
  await requireAdmin();
  await setSiteSetting("emails", EmailsSettingSchema.parse(input));
}

/**
 * Bumps the admin session version, so every admin cookie (including the
 * one making this request) stops working.
 */
export async function signOutAllAdminSessions() {
  await requireAdmin();
  const row = await prisma.siteSetting.findUnique({
    where: { key: "adminSession" },
  });
  const current = AdminSessionSettingSchema.safeParse(row?.value);
  const version = (current.success ? current.data.version : 0) + 1;
  await setSiteSetting("adminSession", { version });
  return version;
}
