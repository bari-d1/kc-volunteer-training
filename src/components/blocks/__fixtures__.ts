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
        front: "Kingdom.",
        back: "We seek God's kingdom first, in every room we serve.",
        reference: "Matthew 6:33",
      },
      {
        front: "Family.",
        back: "We belong to each other. Nobody serves alone.",
        reference: "Ephesians 2:19",
      },
      {
        front: "Excellence.",
        back: "We give our best because God gave His best.",
        reference: "Colossians 3:23",
      },
      {
        front: "Honour.",
        back: "We treat every person as someone God values.",
        reference: "Romans 12:10",
      },
      {
        front: "Generosity.",
        back: "We give our time, gifts and resources freely.",
        reference: "2 Corinthians 9:7",
      },
      {
        front: "Faith.",
        back: "We trust God for more than we can see.",
        reference: "Hebrews 11:6",
      },
    ],
  },
  ACCORDION: {
    items: [
      {
        title: "The Bible",
        body: "We believe the Bible is the inspired Word of God and our final authority for faith and life.",
      },
      {
        title: "God",
        body: "We believe in one God, eternally existing as Father, Son and Holy Spirit.",
      },
      {
        title: "Jesus Christ",
        body: "We believe Jesus is the Son of God, who died for our sins and rose again.",
      },
      {
        title: "Salvation",
        body: "We believe salvation is a gift of God's grace, received through faith in Jesus.",
      },
      {
        title: "The Holy Spirit",
        body: "We believe the Holy Spirit lives in every believer and empowers us to serve.",
      },
      {
        title: "The Church",
        body: "We believe the Church is God's family, called to worship, grow and reach others.",
      },
    ],
  },
  TABS: {
    tabs: [
      {
        label: "Experience",
        colour: "experience",
        body: "**First impressions and Sunday flow.** From the car park to the coffee, Experience makes everyone feel at home.",
        items: [
          "Welcome & Hosting",
          "Ushering",
          "Hospitality",
          "Service Management",
        ],
      },
      {
        label: "Ministry",
        colour: "ministry",
        body: "**Prayer, care and the next generation.** Ministry looks after people's hearts.",
        items: ["Prayer", "Kids", "Youth", "Pastoral Care"],
      },
      {
        label: "Creative",
        colour: "creative",
        body: "**Worship, media and design.** Creative helps people encounter God and tells KC's story.",
        items: ["Worship", "Media & Photography", "Design", "Social Media"],
      },
      {
        label: "Systems",
        colour: "systems",
        body: "**Tech and everything behind the scenes.** Systems keeps Sundays running and online.",
        items: ["Tech & Production", "Livestream", "Data & Admin"],
      },
    ],
  },
  TIMELINE: {
    events: [
      {
        year: "2015",
        title: "A new beginning",
        body: "Kingdom Culture starts as a young adults' gathering at Jubilee Church Manchester.",
      },
      {
        year: "2017",
        title: "Sundays together",
        body: "Monthly gatherings become weekly Sunday services.",
      },
      {
        year: "2019",
        title: "Building teams",
        body: "The first volunteer teams form around welcome, worship and tech.",
      },
      {
        year: "2020",
        title: "Church online",
        body: "Services move online and the livestream team is born.",
      },
      {
        year: "2022",
        title: "Four branches",
        body: "Teams are organised into Experience, Ministry, Creative and Systems.",
      },
      {
        year: "2025",
        title: "One family",
        body: "Hundreds of volunteers, one vision. And now you.",
      },
    ],
  },
  PYRAMID: {
    levels: [
      {
        title: "Senior Pastors",
        body: "Set the vision and lead the church family.",
      },
      {
        title: "Leadership Team",
        body: "Pastors and directors who turn vision into plans.",
      },
      {
        title: "Branch Leads",
        body: "Lead Experience, Ministry, Creative and Systems.",
      },
      {
        title: "Team Leads",
        body: "Run each team week to week and look after their volunteers.",
      },
      { title: "Volunteers", body: "You. The heart of every Sunday." },
    ],
  },
  PEOPLE: {
    people: [
      {
        name: "Experience Lead",
        role: "Branch Lead, Experience",
        ringColour: "experience",
      },
      {
        name: "Ministry Lead",
        role: "Branch Lead, Ministry",
        ringColour: "ministry",
      },
      {
        name: "Creative Lead",
        role: "Branch Lead, Creative",
        ringColour: "creative",
      },
      {
        name: "Systems Lead",
        role: "Branch Lead, Systems",
        ringColour: "systems",
      },
    ],
  },
  REFLECTION: {
    prompt: "What do you think is required to serve?",
    revealTitle: "A willing heart",
    revealBody:
      "You don't need experience or a title. Serving starts with availability and a heart to love people. Skills can be taught; we'll train you.",
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
