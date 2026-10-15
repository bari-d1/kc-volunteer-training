/** "+3 this week", "−1.5 pts this week", "No change this week". */
export function formatChange(
  change: number | null,
  unit: "" | " pts" = "",
): string | undefined {
  if (change == null) return undefined;
  if (change === 0) return "No change this week";
  const sign = change > 0 ? "+" : "−";
  return `${sign}${Math.abs(change)}${unit} this week`;
}
