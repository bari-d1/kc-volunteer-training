import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("makes readable URL slugs", () => {
    expect(slugify("How We're Organised")).toBe("how-were-organised");
    expect(slugify("Branches & Teams")).toBe("branches-and-teams");
    expect(slugify("  Café — Welcome!  ")).toBe("cafe-welcome");
    expect(slugify("Final Quiz 2")).toBe("final-quiz-2");
  });
});
