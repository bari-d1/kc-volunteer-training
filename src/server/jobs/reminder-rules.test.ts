import { describe, expect, it } from "vitest";
import { decideReminder, type ReminderInput } from "./reminder-rules";

const NOW = new Date("2026-10-20T17:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const volunteer = (overrides: Partial<ReminderInput> = {}): ReminderInput => ({
  completed: false,
  emailReminders: true,
  lastActivity: daysAgo(7),
  remindersSent: [],
  now: NOW,
  ...overrides,
});

describe("decideReminder", () => {
  it("sends nothing after 6 days without progress", () => {
    expect(decideReminder(volunteer({ lastActivity: daysAgo(6) }))).toEqual({
      send: false,
      reason: "recently-active",
    });
  });

  it("sends reminder 1 after 7 days", () => {
    expect(decideReminder(volunteer({ lastActivity: daysAgo(7) }))).toEqual({
      send: true,
      number: 1,
    });
  });

  it("waits until 21 days for reminder 2", () => {
    const firstAt = daysAgo(13); // sent on day 7 of a 20-day stretch
    expect(
      decideReminder(
        volunteer({ lastActivity: daysAgo(20), remindersSent: [firstAt] }),
      ),
    ).toEqual({ send: false, reason: "not-due-yet" });
  });

  it("sends reminder 2 after 21 days", () => {
    expect(
      decideReminder(
        volunteer({ lastActivity: daysAgo(21), remindersSent: [daysAgo(14)] }),
      ),
    ).toEqual({ send: true, number: 2 });
  });

  it("never sends a third reminder", () => {
    expect(
      decideReminder(
        volunteer({
          lastActivity: daysAgo(90),
          remindersSent: [daysAgo(83), daysAgo(69)],
        }),
      ),
    ).toEqual({ send: false, reason: "reminders-used" });
  });

  it("never sends two within 7 days", () => {
    expect(
      decideReminder(
        volunteer({ lastActivity: daysAgo(30), remindersSent: [daysAgo(6)] }),
      ),
    ).toEqual({ send: false, reason: "too-soon-since-last-reminder" });
  });

  it("sends nothing to volunteers who've finished", () => {
    expect(
      decideReminder(volunteer({ completed: true, lastActivity: daysAgo(30) })),
    ).toEqual({ send: false, reason: "completed" });
  });

  it("sends nothing to volunteers who unsubscribed", () => {
    expect(
      decideReminder(
        volunteer({ emailReminders: false, lastActivity: daysAgo(30) }),
      ),
    ).toEqual({ send: false, reason: "unsubscribed" });
  });

  it("starts again after any new progress", () => {
    const earlierReminders = [daysAgo(40), daysAgo(26)];
    // Progress 3 days ago: too recent for anything.
    expect(
      decideReminder(
        volunteer({
          lastActivity: daysAgo(3),
          remindersSent: earlierReminders,
        }),
      ),
    ).toEqual({ send: false, reason: "recently-active" });
    // A week after that progress, the old reminders no longer count.
    expect(
      decideReminder(
        volunteer({
          lastActivity: daysAgo(7),
          remindersSent: earlierReminders,
        }),
      ),
    ).toEqual({ send: true, number: 1 });
  });
});
