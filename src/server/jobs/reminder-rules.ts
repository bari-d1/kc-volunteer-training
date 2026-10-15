/**
 * When a volunteer who has stopped making progress gets a reminder email.
 * Pure, so the rules can be tested without a database.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days without progress before each reminder: the 1st and the 2nd. */
export const REMINDER_AFTER_DAYS = [7, 21] as const;
/** Never two reminders closer together than this. */
export const MIN_DAYS_BETWEEN_REMINDERS = 7;

export type ReminderInput = {
  /** Passed the final quiz (has a certificate). */
  completed: boolean;
  /** Profile.emailReminders. */
  emailReminders: boolean;
  /** Latest ModuleProgress.updatedAt, or Profile.createdAt if none. */
  lastActivity: Date;
  /** When earlier reminders were sent (EmailLog SENT rows). */
  remindersSent: Date[];
  now: Date;
};

export type ReminderDecision =
  | { send: true; number: 1 | 2 }
  | {
      send: false;
      reason:
        | "completed"
        | "unsubscribed"
        | "recently-active"
        | "too-soon-since-last-reminder"
        | "reminders-used"
        | "not-due-yet";
    };

/**
 * Up to two reminders per stretch of inactivity: the first after 7 days,
 * the second after 21, never within 7 days of another. Any new progress
 * starts a fresh stretch, so earlier reminders stop counting.
 */
export function decideReminder({
  completed,
  emailReminders,
  lastActivity,
  remindersSent,
  now,
}: ReminderInput): ReminderDecision {
  if (completed) return { send: false, reason: "completed" };
  if (!emailReminders) return { send: false, reason: "unsubscribed" };

  const daysInactive = (now.getTime() - lastActivity.getTime()) / DAY_MS;
  if (daysInactive < REMINDER_AFTER_DAYS[0]) {
    return { send: false, reason: "recently-active" };
  }

  const latest = Math.max(0, ...remindersSent.map((d) => d.getTime()));
  if (
    latest &&
    (now.getTime() - latest) / DAY_MS < MIN_DAYS_BETWEEN_REMINDERS
  ) {
    return { send: false, reason: "too-soon-since-last-reminder" };
  }

  const thisStretch = remindersSent.filter((d) => d > lastActivity).length;
  if (thisStretch >= REMINDER_AFTER_DAYS.length) {
    return { send: false, reason: "reminders-used" };
  }
  const number = (thisStretch + 1) as 1 | 2;
  if (daysInactive < REMINDER_AFTER_DAYS[number - 1]) {
    return { send: false, reason: "not-due-yet" };
  }
  return { send: true, number };
}
