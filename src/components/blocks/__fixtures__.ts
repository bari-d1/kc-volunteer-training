/**
 * One sample of every block type, for /preview/blocks and tests. Validated
 * against the Zod schemas on import, so a bad fixture fails loudly.
 */
import type { BlockType } from "@/generated/prisma/client";
import {
  BlockSchema,
  toVolunteerBlock,
  type BlockData,
  type VolunteerBlock,
} from "@/lib/schemas/blocks";

export const FIXTURE_MODULE_ID = "00000000-0000-4000-8000-00000000f1c0";

const samples: {
  [T in BlockType]: Extract<BlockData, { type: T }>["content"];
} = {
  HEADING: { text: "Our Values", level: 1, pill: "OUR VALUES" },
  TEXT: {
    markdown:
      "We're **one family**, serving together. [Find out more](/privacy).",
  },
  IMAGE: {
    url: "/og-sample.jpg",
    alt: "Volunteers at a Sunday service",
    caption: "Sunday at KC",
  },
  VIDEO: {
    url: "https://example.org/welcome.mp4",
    captionsUrl: "https://example.org/welcome.vtt",
  },
  FLIP_CARDS: {
    cards: [
      {
        front: "Honour",
        back: "We value every person.",
        reference: "Romans 12:10",
      },
      { front: "Excellence", back: "We give our best." },
    ],
  },
  ACCORDION: {
    items: [
      { title: "Who leads KC?", body: "Our pastors and branch leads." },
      { title: "When do we meet?", body: "Sundays and midweek." },
    ],
  },
  TABS: {
    tabs: [
      {
        label: "Experience",
        colour: "experience",
        body: "Welcome and hosting.",
        items: ["Welcome", "Ushering"],
      },
      { label: "Ministry", colour: "ministry", body: "Prayer and care." },
    ],
  },
  TIMELINE: {
    events: [
      {
        year: "2012",
        title: "KC begins",
        body: "A small group with a big vision.",
      },
      { year: "Today", title: "One family" },
    ],
  },
  PYRAMID: {
    levels: [
      { title: "Jesus" },
      { title: "Leadership" },
      { title: "Teams", body: "Where you serve." },
    ],
  },
  PEOPLE: {
    people: [
      { name: "Ada Okafor", role: "Senior Pastor", ringColour: "lime" },
      { name: "Sam Lee", role: "Creative Lead", ringColour: "creative" },
    ],
  },
  REFLECTION: {
    prompt: "Why do you want to serve?",
    revealTitle: "Something to think about",
    revealBody: "Serving starts with knowing why.",
  },
  CHECKLIST: {
    title: "Before Sunday",
    items: ["Arrive 30 minutes early", "Check in with your lead"],
  },
  CONTACT: {
    title: "Safeguarding",
    email: "safeguarding@example.org",
    contacts: [
      {
        label: "Designated Safeguarding Lead",
        name: "Grace Mensah",
        phone: "+44 7700 900001",
      },
    ],
  },
  LINK_QR: {
    label: "Join the WhatsApp group",
    url: "https://chat.whatsapp.com/example",
    description: "Scan or tap to join.",
  },
  KNOWLEDGE_CHECK: {
    questions: [
      {
        prompt: "Who do you tell about a safeguarding concern?",
        options: [
          { id: "dsl", text: "The Designated Safeguarding Lead" },
          { id: "nobody", text: "Nobody" },
        ],
        correctOptionId: "dsl",
        explanation: "Always the DSL.",
      },
    ],
  },
  NARRATOR_CALLOUT: {
    state: "wave",
    text: "Hi! I'll guide you through each block.",
  },
};

/** Full blocks (with answer keys), validated against BlockSchema. */
export const fixtureBlocks: Array<BlockData & { id: string }> = Object.entries(
  samples,
).map(([type, content], index) => {
  const parsed = BlockSchema.safeParse({ type, content });
  if (!parsed.success) {
    throw new Error(`Invalid ${type} fixture: ${parsed.error.message}`);
  }
  return {
    ...parsed.data,
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  };
});

/** What the renderer actually receives: answers stripped. */
export const fixtureVolunteerBlocks: VolunteerBlock[] =
  fixtureBlocks.map(toVolunteerBlock);

/** Deliberately broken blocks, to preview the dev-only warning. */
export const invalidFixtureBlocks = [
  { id: "invalid-content", type: "HEADING", content: { text: "", level: 7 } },
  { id: "unknown-type", type: "CAROUSEL", content: {} },
] as unknown as VolunteerBlock[];
