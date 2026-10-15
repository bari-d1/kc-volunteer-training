import { describe, expect, it } from "vitest";
import { needsHint } from "./narrator-hints";

describe("needsHint", () => {
  it("hints interactive blocks only", () => {
    expect(needsHint("FLIP_CARDS", { cards: [] })).toBe(true);
    expect(needsHint("TEXT", { markdown: "Hi" })).toBe(false);
  });

  it("skips a pyramid that has nothing to tap", () => {
    expect(needsHint("PYRAMID", { levels: [{ title: "Team Lead" }] })).toBe(
      false,
    );
    expect(
      needsHint("PYRAMID", {
        levels: [{ title: "Team Lead" }, { title: "Pillars", body: "…" }],
      }),
    ).toBe(true);
  });
});
