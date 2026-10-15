import { timingSafeEqual } from "node:crypto";
import { sendReminders } from "@/server/jobs/send-reminders";

/** Give a slow run (50 emails) time to finish on Vercel. */
export const maxDuration = 60;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Daily reminder run (vercel.json cron). Vercel sends
 * "Authorization: Bearer $CRON_SECRET"; anything else gets a 401.
 */
export async function GET(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sent, skipped } = await sendReminders();
  return Response.json({ sent, skipped });
}
