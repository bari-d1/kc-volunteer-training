import { describe, expect, it } from "vitest";
import { buildDashboard } from "@/lib/dashboard";

const mod = (
  slug: string,
  status: "locked" | "in-progress" | "completed",
  progress: boolean = status === "completed",
) => ({
  id: slug,
  slug,
  title: slug,
  summary: "",
  status,
  progress: progress
    ? { completedAt: status === "completed" ? new Date() : null }
    : null,
});

describe("buildDashboard", () => {
  it("starts with only the first module available", () => {
    const d = buildDashboard([
      mod("a", "in-progress"),
      mod("b", "locked"),
      mod("c", "locked"),
    ]);
    expect(d.cards.map((c) => [c.number, c.status])).toEqual([
      [1, "available"],
      [2, "locked"],
      [3, "locked"],
    ]);
    expect(d.next?.slug).toBe("a");
    expect(d.started).toBe(false);
    expect(d.percent).toBe(0);
  });

  it("marks an opened module in progress and continues there", () => {
    const d = buildDashboard([
      mod("a", "completed"),
      mod("b", "in-progress", true),
      mod("c", "locked"),
    ]);
    expect(d.cards.map((c) => c.status)).toEqual([
      "completed",
      "in-progress",
      "locked",
    ]);
    expect(d.next?.slug).toBe("b");
    expect(d.started).toBe(true);
    expect(d.percent).toBe(33);
  });

  it("counts as started once a module is complete even if the next is untouched", () => {
    const d = buildDashboard([mod("a", "completed"), mod("b", "in-progress")]);
    expect(d.cards[1].status).toBe("available");
    expect(d.started).toBe(true);
    expect(d.next?.slug).toBe("b");
  });

  it("detects completion and points at the final module", () => {
    const d = buildDashboard([
      mod("a", "completed"),
      mod("family", "completed"),
    ]);
    expect(d.allComplete).toBe(true);
    expect(d.next).toBeNull();
    expect(d.percent).toBe(100);
    expect(d.completionModule?.slug).toBe("family");
  });

  it("handles a course with no modules", () => {
    const d = buildDashboard([]);
    expect(d).toMatchObject({
      total: 0,
      percent: 0,
      next: null,
      allComplete: false,
    });
  });
});
