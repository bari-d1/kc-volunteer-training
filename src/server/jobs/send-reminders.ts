import "server-only";
import { appUrl } from "@/lib/app-url";
import { DEFAULT_COURSE_SLUG, moduleHref } from "@/lib/course-config";
import { prisma } from "@/lib/prisma";
import { createUnsubscribeToken } from "@/lib/unsubscribe-token";
import { sendEmail } from "../email";
import { getSetting } from "../site-settings";
import { computeModuleStates } from "../unlock";
import { decideReminder, type ReminderDecision } from "./reminder-rules";

/** Most reminder emails one run sends, so a backlog goes out over days. */
export const REMINDERS_PER_RUN = 50;

export type ReminderRun = {
  /** Reminders are switched off in Settings: nothing was looked at. */
  disabled?: boolean;
  /** Reminders Resend accepted. */
  sent: number;
  /** Due, but not sent: over the per-run limit, failed, or skipped. */
  skipped: number;
  /** Everyone considered, with what was (or, in a dry run, would be) done. */
  volunteers: Array<{
    profileId: string;
    firstName: string;
    decision: ReminderDecision;
    outcome?: "sent" | "failed" | "skipped" | "over-limit" | "dry-run";
  }>;
};

/**
 * Sends reminder emails to volunteers who started but haven't finished and
 * have gone quiet (see reminder-rules.ts). Run daily. With dryRun, works out
 * who would get one and sends nothing.
 */
export async function sendReminders({
  dryRun = false,
  now = new Date(),
  limit = REMINDERS_PER_RUN,
} = {}): Promise<ReminderRun> {
  // The global switch in Settings (on unless set off).
  if ((await getSetting("emails"))?.remindersEnabled === false) {
    return { sent: 0, skipped: 0, volunteers: [], disabled: true };
  }
  const course = await prisma.course.findUnique({
    where: { slug: DEFAULT_COURSE_SLUG },
    select: {
      id: true,
      modules: {
        where: { isPublished: true },
        select: { id: true, slug: true, title: true, order: true },
      },
    },
  });
  if (!course) return { sent: 0, skipped: 0, volunteers: [] };

  // Unsubscribed and finished volunteers can never be due.
  const profiles = await prisma.profile.findMany({
    where: {
      emailReminders: true,
      certificates: { none: { courseId: course.id } },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      createdAt: true,
      moduleProgress: {
        where: { module: { courseId: course.id } },
        select: { moduleId: true, completedAt: true, updatedAt: true },
      },
      emailLogs: {
        where: { template: "reminder", status: "SENT" },
        select: { createdAt: true },
      },
    },
  });

  const run: ReminderRun = { sent: 0, skipped: 0, volunteers: [] };
  for (const profile of profiles) {
    const lastActivity = new Date(
      Math.max(
        profile.createdAt.getTime(),
        ...profile.moduleProgress.map((p) => p.updatedAt.getTime()),
      ),
    );
    const decision = decideReminder({
      completed: false,
      emailReminders: true,
      lastActivity,
      remindersSent: profile.emailLogs.map((log) => log.createdAt),
      now,
    });
    const entry: ReminderRun["volunteers"][number] = {
      profileId: profile.id,
      firstName: profile.firstName,
      decision,
    };
    run.volunteers.push(entry);
    if (!decision.send) continue;

    if (dryRun) {
      entry.outcome = "dry-run";
      continue;
    }
    if (run.sent >= limit) {
      entry.outcome = "over-limit";
      run.skipped++;
      continue;
    }

    const completed = new Set(
      profile.moduleProgress
        .filter((p) => p.completedAt)
        .map((p) => p.moduleId),
    );
    const states = computeModuleStates(course.modules, completed);
    const next =
      states.find((m) => m.status === "in-progress") ??
      states.find((m) => m.status !== "completed");
    if (!next) {
      entry.outcome = "skipped";
      run.skipped++;
      continue;
    }

    const token = await createUnsubscribeToken(profile.id);
    const unsubscribeUrl = appUrl(
      `/email/unsubscribe?token=${encodeURIComponent(token)}`,
    );
    const result = await sendEmail({
      to: profile.email,
      template: "reminder",
      props: {
        firstName: profile.firstName,
        completedModules: completed.size,
        totalModules: course.modules.length,
        nextModuleTitle: next.title,
        continueUrl: appUrl(moduleHref(DEFAULT_COURSE_SLUG, next.slug)),
        unsubscribeUrl,
      },
      profileId: profile.id,
      tags: { kind: "reminder", number: String(decision.number) },
      headers: {
        // One-click unsubscribe (RFC 8058): mail apps POST to this URL.
        "List-Unsubscribe": `<${appUrl(
          `/api/email/unsubscribe?token=${encodeURIComponent(token)}`,
        )}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.status === "SENT") {
      entry.outcome = "sent";
      run.sent++;
    } else {
      entry.outcome = result.status === "FAILED" ? "failed" : "skipped";
      run.skipped++;
    }
    console.info(
      `Reminder ${decision.number} for ${profile.id}: ${entry.outcome}`,
    );
  }
  return run;
}
