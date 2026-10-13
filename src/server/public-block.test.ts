import { describe, expect, it, vi } from "vitest";
import type { ParsedBlock } from "@/lib/schemas/blocks";

vi.mock("server-only", () => ({}));
const { toPublicBlock } = await import("./public-block");

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  order: 0,
  isPublished: true,
};

describe("toPublicBlock", () => {
  it("strips correctOptionId and explanation from knowledge checks", () => {
    const block: ParsedBlock = {
      ...base,
      type: "KNOWLEDGE_CHECK",
      content: {
        questions: [
          {
            prompt: "Who do you tell?",
            options: [
              { id: "dsl", text: "The DSL" },
              { id: "nobody", text: "Nobody" },
            ],
            correctOptionId: "dsl",
            explanation: "Always the DSL.",
          },
        ],
      },
    };

    const result = toPublicBlock(block);
    expect(result).toEqual({
      id: base.id,
      type: "KNOWLEDGE_CHECK",
      content: {
        questions: [
          {
            prompt: "Who do you tell?",
            options: [
              { id: "dsl", text: "The DSL" },
              { id: "nobody", text: "Nobody" },
            ],
          },
        ],
      },
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain("correctOptionId");
    expect(json).not.toContain("Always the DSL.");
  });

  it("passes other blocks through unchanged", () => {
    const block: ParsedBlock = {
      ...base,
      type: "TEXT",
      content: { markdown: "Hi" },
    };
    expect(toPublicBlock(block)).toEqual({
      id: base.id,
      type: "TEXT",
      content: { markdown: "Hi" },
    });
  });
});
