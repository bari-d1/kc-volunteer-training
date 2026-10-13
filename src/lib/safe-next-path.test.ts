import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-next-path";

describe("safeNextPath", () => {
  it.each([
    ["/course", "/course"],
    ["/course/about-kc?step=2#top", "/course/about-kc?step=2#top"],
    ["/onboarding", "/onboarding"],
  ])("keeps same-site path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    [null],
    [""],
    ["course"],
    ["https://evil.example.com"],
    ["//evil.example.com"],
    ["/\\evil.example.com"],
    ["javascript:alert(1)"],
  ])("falls back for %j", (input) => {
    expect(safeNextPath(input)).toBe("/course");
  });

  it("uses a custom fallback", () => {
    expect(safeNextPath(undefined, "/onboarding")).toBe("/onboarding");
  });
});
