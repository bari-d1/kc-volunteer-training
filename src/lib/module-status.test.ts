import { describe, expect, it } from "vitest";
import {
  nextAvailableModule,
  volunteerModuleStatus,
} from "@/lib/module-status";

describe("volunteerModuleStatus", () => {
  it.each([
    [{ status: "locked", started: false }, "locked"],
    [{ status: "locked", started: true }, "locked"],
    [{ status: "in-progress", started: false }, "available"],
    [{ status: "in-progress", started: true }, "in-progress"],
    [{ status: "completed", started: true }, "completed"],
    [{ status: "completed", started: false }, "completed"],
  ] as const)("%o → %s", (input, expected) => {
    expect(volunteerModuleStatus(input)).toBe(expected);
  });
});

describe("nextAvailableModule", () => {
  const m = (
    slug: string,
    status: "locked" | "available" | "in-progress" | "completed",
  ) => ({ slug, status });

  it("is the first unlocked, incomplete module", () => {
    expect(
      nextAvailableModule([
        m("a", "completed"),
        m("b", "available"),
        m("c", "locked"),
      ])?.slug,
    ).toBe("b");
    expect(
      nextAvailableModule([
        m("a", "completed"),
        m("b", "in-progress"),
        m("c", "locked"),
      ])?.slug,
    ).toBe("b");
  });

  it("starts at the first module for a new volunteer", () => {
    expect(
      nextAvailableModule([m("a", "available"), m("b", "locked")])?.slug,
    ).toBe("a");
  });

  it("skips completed modules wherever they are", () => {
    expect(
      nextAvailableModule([
        m("a", "completed"),
        m("b", "completed"),
        m("c", "available"),
      ])?.slug,
    ).toBe("c");
  });

  it("is null when everything is complete, or nothing is unlocked", () => {
    expect(
      nextAvailableModule([m("a", "completed"), m("b", "completed")]),
    ).toBeNull();
    expect(nextAvailableModule([m("a", "locked")])).toBeNull();
    expect(nextAvailableModule([])).toBeNull();
  });
});
