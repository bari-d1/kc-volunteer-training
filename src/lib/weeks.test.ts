import { describe, expect, it } from "vitest";
import { formatChange } from "./stat-change";
import { weekStart } from "./weeks";

describe("weekStart", () => {
  it("finds Monday 00:00 UTC", () => {
    expect(weekStart(new Date("2026-10-15T23:00:00Z")).toISOString()).toBe(
      "2026-10-12T00:00:00.000Z",
    );
    expect(weekStart(new Date("2026-10-12T00:00:00Z")).toISOString()).toBe(
      "2026-10-12T00:00:00.000Z",
    );
    expect(weekStart(new Date("2026-10-18T12:00:00Z")).toISOString()).toBe(
      "2026-10-12T00:00:00.000Z",
    );
  });
});

describe("formatChange", () => {
  it("reads naturally", () => {
    expect(formatChange(3)).toBe("+3 this week");
    expect(formatChange(-1.5, " pts")).toBe("−1.5 pts this week");
    expect(formatChange(0)).toBe("No change this week");
    expect(formatChange(null)).toBeUndefined();
  });
});
