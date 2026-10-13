import { describe, expect, it } from "vitest";
import type { BlockType } from "@/generated/prisma/client";
import {
  BlockSchema,
  BlockValidationError,
  blockContentSchemas,
  parseBlock,
} from "@/lib/schemas";

type Case = {
  valid: unknown[];
  /** Invalid content paired with the issue path we expect Zod to report. */
  invalid: Array<[content: unknown, path: string]>;
};

const options = [
  { id: "a", text: "Yes" },
  { id: "b", text: "No" },
];

const cases: Record<BlockType, Case> = {
  HEADING: {
    valid: [
      { text: "Our Values", level: 1 },
      { text: "Our Values", level: 2, pill: "OUR VALUES" },
    ],
    invalid: [
      [{ text: "Our Values", level: 4 }, "level"],
      [{ text: "  ", level: 1 }, "text"],
    ],
  },
  TEXT: {
    valid: [{ markdown: "Welcome to **KC**." }],
    invalid: [
      [{ markdown: "" }, "markdown"],
      [{ text: "wrong key" }, "markdown"],
    ],
  },
  IMAGE: {
    valid: [
      {
        url: "https://cdn.example.com/a.jpg",
        alt: "Volunteers at Sunday service",
      },
      { url: "/images/team.jpg", alt: "", caption: "Decorative" },
    ],
    invalid: [
      [{ url: "javascript:alert(1)", alt: "x" }, "url"],
      [{ url: "//evil.com/a.jpg", alt: "x" }, "url"],
      [{ url: "/a.jpg" }, "alt"],
    ],
  },
  VIDEO: {
    valid: [
      { url: "https://video.example.com/welcome.mp4" },
      {
        url: "/videos/welcome.mp4",
        captionsUrl: "/videos/welcome.vtt",
        poster: "/videos/welcome.jpg",
      },
    ],
    invalid: [
      [{ url: "ftp://example.com/a.mp4" }, "url"],
      [{ url: "/a.mp4", captionsUrl: "not a url" }, "captionsUrl"],
    ],
  },
  FLIP_CARDS: {
    valid: [
      {
        cards: [
          {
            front: "Honour",
            back: "We value people",
            reference: "Romans 12:10",
          },
          { front: "Excellence", back: "We give our best" },
        ],
      },
    ],
    invalid: [
      [{ cards: [] }, "cards"],
      [{ cards: [{ front: "Honour" }] }, "cards.0.back"],
    ],
  },
  ACCORDION: {
    valid: [{ items: [{ title: "Who leads KC?", body: "Our pastors." }] }],
    invalid: [
      [{ items: [] }, "items"],
      [{ items: [{ title: "", body: "x" }] }, "items.0.title"],
    ],
  },
  TABS: {
    valid: [
      {
        tabs: [
          {
            label: "Experience",
            colour: "experience",
            body: "Hosting",
            items: ["Welcome"],
          },
          { label: "Systems", body: "Tech and ops" },
        ],
      },
    ],
    invalid: [
      [
        { tabs: [{ label: "X", colour: "#FF0000", body: "y" }] },
        "tabs.0.colour",
      ],
      [{ tabs: [{ label: "X", body: "y", items: [""] }] }, "tabs.0.items.0"],
    ],
  },
  TIMELINE: {
    valid: [
      {
        events: [
          { year: "2012", title: "KC begins" },
          { year: "Today", title: "One family", body: "Across the city" },
        ],
      },
    ],
    invalid: [
      [{ events: [{ year: 2012, title: "KC begins" }] }, "events.0.year"],
      [{ events: [] }, "events"],
    ],
  },
  PYRAMID: {
    valid: [
      { levels: [{ title: "Jesus" }, { title: "Church", body: "Family" }] },
    ],
    invalid: [
      [{ levels: [] }, "levels"],
      [{ levels: [{ body: "No title" }] }, "levels.0.title"],
    ],
  },
  PEOPLE: {
    valid: [
      {
        people: [
          { name: "Ada Okafor", role: "Lead Pastor" },
          {
            name: "Sam Lee",
            role: "Creative Lead",
            photoUrl: "/people/sam.jpg",
            ringColour: "creative",
          },
        ],
      },
    ],
    invalid: [
      [{ people: [{ name: "Ada" }] }, "people.0.role"],
      [
        { people: [{ name: "A", role: "B", ringColour: "pink" }] },
        "people.0.ringColour",
      ],
    ],
  },
  REFLECTION: {
    valid: [
      {
        prompt: "Why serve?",
        revealTitle: "Because…",
        revealBody: "We love people.",
      },
    ],
    invalid: [
      [{ prompt: "Why serve?", revealTitle: "Because…" }, "revealBody"],
      [{ prompt: "", revealTitle: "a", revealBody: "b" }, "prompt"],
    ],
  },
  CHECKLIST: {
    valid: [
      { items: ["Arrive 30 minutes early"] },
      { title: "Before Sunday", items: ["Pray"] },
    ],
    invalid: [
      [{ items: [] }, "items"],
      [{ items: ["ok", 3] }, "items.1"],
    ],
  },
  CONTACT: {
    valid: [
      {
        title: "Safeguarding",
        email: "safeguarding@example.com",
        contacts: [
          { label: "DSL", name: "Grace Mensah", phone: "+44 7700 900123" },
        ],
      },
    ],
    invalid: [
      [
        {
          title: "X",
          email: "not-an-email",
          contacts: [{ label: "a", name: "b" }],
        },
        "email",
      ],
      [
        { title: "X", contacts: [{ label: "a", name: "b", phone: "call me" }] },
        "contacts.0.phone",
      ],
      [{ title: "X", contacts: [] }, "contacts"],
    ],
  },
  LINK_QR: {
    valid: [
      {
        label: "Join the WhatsApp group",
        url: "https://chat.whatsapp.com/abc",
      },
    ],
    invalid: [
      [{ label: "Relative", url: "/join" }, "url"],
      [{ url: "https://example.com" }, "label"],
    ],
  },
  KNOWLEDGE_CHECK: {
    valid: [
      {
        questions: [
          {
            prompt: "Is KC a family?",
            options,
            correctOptionId: "a",
            explanation: "Yes!",
          },
        ],
      },
    ],
    invalid: [
      [
        {
          questions: [
            { prompt: "Q", options, correctOptionId: "z", explanation: "E" },
          ],
        },
        "questions.0.correctOptionId",
      ],
      [
        {
          questions: [
            {
              prompt: "Q",
              options: [
                { id: "a", text: "1" },
                { id: "a", text: "2" },
              ],
              correctOptionId: "a",
              explanation: "E",
            },
          ],
        },
        "questions.0.options.1.id",
      ],
      [
        {
          questions: [
            {
              prompt: "Q",
              options: [options[0]],
              correctOptionId: "a",
              explanation: "E",
            },
          ],
        },
        "questions.0.options",
      ],
    ],
  },
  NARRATOR_CALLOUT: {
    valid: [
      { state: "wave", text: "Hi! I'm here to guide you." },
      { state: "celebrate", text: "You did it!" },
    ],
    invalid: [
      [{ state: "dance", text: "Hi" }, "state"],
      [{ state: "wave" }, "text"],
    ],
  },
};

describe("block content schemas", () => {
  it("has test cases for every block type", () => {
    expect(Object.keys(cases).sort()).toEqual(
      Object.keys(blockContentSchemas).sort(),
    );
  });

  describe.each(Object.entries(cases) as Array<[BlockType, Case]>)(
    "%s",
    (type, { valid, invalid }) => {
      it.each(valid.map((content) => [content]))("accepts %j", (content) => {
        const result = BlockSchema.safeParse({ type, content });
        expect(result.error?.issues).toBeUndefined();
      });

      it.each(invalid)("rejects %j at %s", (content, path) => {
        const result = BlockSchema.safeParse({ type, content });
        expect(result.success).toBe(false);
        const paths = result.error!.issues.map((issue) => issue.path.join("."));
        expect(paths).toContain(`content.${path}`);
      });
    },
  );
});

describe("BlockSchema", () => {
  it("rejects content that belongs to a different type", () => {
    const result = BlockSchema.safeParse({
      type: "HEADING",
      content: { markdown: "Hi" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown block types", () => {
    const result = BlockSchema.safeParse({ type: "CAROUSEL", content: {} });
    expect(result.success).toBe(false);
  });

  it("strips unknown content keys", () => {
    const result = BlockSchema.parse({
      type: "TEXT",
      content: { markdown: "Hi", legacy: true },
    });
    expect(result.content).toEqual({ markdown: "Hi" });
  });
});

describe("parseBlock", () => {
  const row = {
    id: "11111111-1111-4111-8111-111111111111",
    order: 3,
    isPublished: true,
  };

  it("returns a typed block for a valid row", () => {
    const block = parseBlock({
      ...row,
      type: "HEADING",
      content: { text: "Our Values", level: 2, pill: "OUR VALUES" },
    });

    expect(block).toEqual({
      ...row,
      type: "HEADING",
      content: { text: "Our Values", level: 2, pill: "OUR VALUES" },
    });
    if (block.type === "HEADING") {
      // Narrowed by the discriminant: level is 1 | 2 | 3.
      const level: 1 | 2 | 3 = block.content.level;
      expect(level).toBe(2);
    }
  });

  it("throws a BlockValidationError naming the block, type and field", () => {
    const invalid = {
      ...row,
      type: "FLIP_CARDS" as const,
      content: { cards: [{ front: "Honour" }] },
    };

    expect(() => parseBlock(invalid)).toThrow(BlockValidationError);
    expect(() => parseBlock(invalid)).toThrow(
      /Block 11111111-1111-4111-8111-111111111111 \(FLIP_CARDS\) has invalid content: content\.cards\.0\.back: /,
    );
  });

  it("throws when content is null", () => {
    expect(() => parseBlock({ ...row, type: "TEXT", content: null })).toThrow(
      BlockValidationError,
    );
  });
});
