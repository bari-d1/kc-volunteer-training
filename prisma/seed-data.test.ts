import { describe, expect, it } from "vitest";
import {
  branches,
  modules,
  quizQuestions,
  validateSeedData,
} from "./seed-data";

describe("seed data", () => {
  it("passes the app's Zod schemas", () => {
    expect(() => validateSeedData()).not.toThrow();
  });

  it("has the 12 modules in order, each with content and the narrator", () => {
    expect(modules.map((m) => m.title)).toEqual([
      "Welcome to the Spiritual Costco",
      "About KC",
      "Our Values",
      "Our Church Family",
      "What We Believe",
      "How We're Organised",
      "Expectations",
      "Giving",
      "Safeguarding",
      "Branches and Teams",
      "Final Quiz",
      "You're Part of the Family",
    ]);
    for (const m of modules) {
      expect(m.blocks.length, m.slug).toBeGreaterThanOrEqual(2);
      expect(m.narratorIntro, m.slug).toBeTruthy();
      const callouts = m.blocks.filter((b) => b.type === "NARRATOR_CALLOUT");
      expect(callouts.length, m.slug).toBeGreaterThanOrEqual(1);
      expect(callouts.length, m.slug).toBeLessThanOrEqual(3);
    }
    expect(new Set(modules.map((m) => m.slug)).size).toBe(12);
  });

  it("has the four branch colours", () => {
    expect(Object.fromEntries(branches.map((b) => [b.code, b.colour]))).toEqual(
      {
        EXPERIENCE: "#D9FF3D",
        MINISTRY: "#FF5FC8",
        CREATIVE: "#FF7A1A",
        SYSTEMS: "#33D6F5",
      },
    );
  });

  it("has enough quiz questions for an attempt, one required", () => {
    expect(quizQuestions.length).toBeGreaterThanOrEqual(10);
    expect(quizQuestions.filter((q) => q.isRequired)).toHaveLength(1);
    expect(quizQuestions.map((q) => q.order)).toEqual(
      quizQuestions.map((_, i) => i),
    );
  });

  it("fails loudly when a block is invalid", () => {
    const block = modules[0].blocks.find((b) => b.type === "NARRATOR_CALLOUT")!;
    const index = modules[0].blocks.indexOf(block);
    const original = block.content;
    block.content = { state: "dance" };
    try {
      expect(() => validateSeedData()).toThrow(
        new RegExp(
          `Module welcome block ${index} \\(NARRATOR_CALLOUT\\) content\\.state`,
        ),
      );
    } finally {
      block.content = original;
    }
  });
});
