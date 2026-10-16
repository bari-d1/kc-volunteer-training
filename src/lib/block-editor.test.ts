import { describe, expect, it } from "vitest";
import {
  BLOCK_INFO,
  BLOCK_TYPES,
  summariseBlock,
  validateBlockContent,
} from "./block-editor";

describe("block editor helpers", () => {
  it("covers all 16 block types with valid starter content", () => {
    expect(BLOCK_TYPES).toHaveLength(16);
    for (const type of BLOCK_TYPES) {
      expect(
        validateBlockContent(type, BLOCK_INFO[type].starter),
        type,
      ).toEqual({
        valid: true,
        errors: {},
      });
      expect(summariseBlock(type, BLOCK_INFO[type].starter), type).not.toBe("");
    }
  });

  it("keys errors by the field's path", () => {
    const result = validateBlockContent("FLIP_CARDS", {
      cards: [{ front: "Kingdom", back: "" }],
    });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors)).toEqual(["cards.0.back"]);

    expect(
      validateBlockContent("KNOWLEDGE_CHECK", {
        questions: [
          {
            prompt: "Q?",
            options: [
              { id: "a", text: "A" },
              { id: "b", text: "B" },
            ],
            correctOptionId: "z",
            explanation: "Why",
          },
        ],
      }).errors,
    ).toHaveProperty("questions.0.correctOptionId");
  });

  it("summarises blocks in one line", () => {
    expect(
      summariseBlock("TEXT", {
        markdown:
          "**Who we are**\n\nThe young adult expression of Jubilee Church Manchester",
      }),
    ).toBe("Who we are The young adult expression of Jubilee Church Man…");
    expect(
      summariseBlock("FLIP_CARDS", {
        cards: [{ front: "Kingdom" }, { front: "Excellence" }],
      }),
    ).toBe("2 cards: Kingdom");
    expect(summariseBlock("PEOPLE", { people: [{}, {}] })).toBe("2 people");
  });
});
