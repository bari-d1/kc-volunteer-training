/**
 * Sends reminder emails to volunteers who've gone quiet (the same job as
 * GET /api/cron/reminders).
 *
 * Usage: pnpm job:reminders [--dry-run]
 *   --dry-run  list who would get a reminder, and why; send nothing
 *
 * Set EMAIL_REDIRECT_TO in .env to send every email to yourself instead.
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { sendReminders } from "@/server/jobs/send-reminders";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const run = await sendReminders({ dryRun });
  const due = run.volunteers.filter((v) => v.decision.send);
  console.log(
    `${run.volunteers.length} volunteer(s) not finished with reminders on; ${due.length} due a reminder.`,
  );
  for (const v of run.volunteers) {
    const what = v.decision.send
      ? `reminder ${v.decision.number}${v.outcome ? ` (${v.outcome})` : ""}`
      : `nothing (${v.decision.reason})`;
    console.log(`  ${v.firstName} [${v.profileId}]: ${what}`);
  }
  console.log(
    dryRun
      ? "\nDry run: nothing sent."
      : `\nSent ${run.sent}, skipped ${run.skipped}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
