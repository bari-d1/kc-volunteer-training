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
    markdown: [
      "At KC we serve because **we've been served first**. Everything you do on a Sunday, from opening the doors to running the sound desk, helps someone meet Jesus.",
      "",
      "As a volunteer you will:",
      "",
      "- Arrive ready to serve, *not just to attend*",
      "- Look out for new faces and make them feel at home",
      "- Pray for the people you serve alongside",
      "",
      "Read more on the [Jubilee Church Manchester website](https://example.org/jubilee) or in our [privacy notice](/privacy).",
    ].join("\n"),
  },
  IMAGE: {
    url: "/fixtures/volunteers.jpg",
    alt: "Volunteers and congregation silhouetted against stage lights during a Sunday service",
    caption: "Sunday service at KC (placeholder photo)",
  },
  VIDEO: { url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ" },
  FLIP_CARDS: {
    cards: [
      {
        front: "Honour",
        back: "We treat everyone as someone God values.",
        reference: "Romans 12:10",
      },
      {
        front: "Excellence",
        back: "We give our best because God gave His best.",
      },
      { front: "Family", back: "We belong to each other, not just to a rota." },
    ],
  },
  ACCORDION: {
    items: [
      {
        title: "What is a branch?",
        body: "One of our four areas of serving: Experience, Ministry, Creative and Systems.",
      },
      {
        title: "Can I serve in more than one team?",
        body: "Yes. Talk to your branch lead once you've settled into your first team.",
      },
    ],
  },
  TABS: {
    tabs: [
      {
        label: "Experience",
        colour: "experience",
        body: "First impressions and Sunday flow.",
        items: ["Welcome & Hosting", "Ushering", "Hospitality"],
      },
      {
        label: "Ministry",
        colour: "ministry",
        body: "Prayer, care and kids.",
        items: ["Prayer", "Kids", "Pastoral Care"],
      },
      {
        label: "Creative",
        colour: "creative",
        body: "Worship, media and design.",
        items: ["Worship", "Media & Photography", "Design"],
      },
      {
        label: "Systems",
        colour: "systems",
        body: "Tech and everything behind the scenes.",
        items: ["Tech & Production", "Livestream", "Data & Admin"],
      },
    ],
  },
  TIMELINE: {
    events: [
      {
        year: "Year 1",
        title: "KC begins",
        body: "A small group with a big vision for Manchester.",
      },
      {
        year: "Today",
        title: "One family",
        body: "Volunteers across four branches.",
      },
    ],
  },
  PYRAMID: {
    levels: [
      { title: "Jesus", body: "At the centre of everything." },
      { title: "Leadership", body: "Pastors and branch leads." },
      { title: "Teams", body: "Where you serve week to week." },
    ],
  },
  PEOPLE: {
    people: [
      { name: "Pastor Placeholder", role: "Senior Pastor", ringColour: "lime" },
      {
        name: "Creative Lead",
        role: "Branch Lead, Creative",
        ringColour: "creative",
      },
    ],
  },
  REFLECTION: {
    prompt: "Why do you want to serve at KC?",
    revealTitle: "Something to think about",
    revealBody: "Knowing your why keeps you going on the hard Sundays.",
  },
  CHECKLIST: {
    title: "Before you serve",
    items: [
      "Arrive 30 minutes before the service starts",
      "Check in with your team lead",
      "Pray together as a team",
      "Wear your volunteer lanyard",
    ],
  },
  CONTACT: {
    title: "Safeguarding contacts",
    email: "safeguarding@example.org",
    contacts: [
      {
        label: "DSL",
        name: "Designated Safeguarding Lead (placeholder)",
        phone: "07700 900001",
      },
      {
        label: "Deputy DSL",
        name: "Deputy Safeguarding Lead (placeholder)",
        phone: "07700 900002",
      },
    ],
  },
  LINK_QR: {
    label: "Join the volunteers' WhatsApp group",
    url: "https://chat.whatsapp.com/KCVolunteersPlaceholder",
    description:
      "Rota updates, prayer requests and last-minute cover. Placeholder link.",
  },
  KNOWLEDGE_CHECK: {
    questions: [
      {
        prompt: "A child tells you something worrying. Who do you tell?",
        options: [
          { id: "dsl", text: "The Designated Safeguarding Lead" },
          { id: "nobody", text: "Nobody, to respect their privacy" },
        ],
        correctOptionId: "dsl",
        explanation: "Always pass concerns to the DSL straight away.",
      },
    ],
  },
  NARRATOR_CALLOUT: {
    state: "wave",
    text: "Hi! I'll walk with you through your onboarding.",
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
