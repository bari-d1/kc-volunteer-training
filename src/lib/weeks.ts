const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday 00:00 UTC of the week containing `date`. */
export function weekStart(date: Date) {
  const day = (date.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      day * DAY_MS,
  );
}
