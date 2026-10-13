/**
 * Sample data for local development and first deploys. Placeholder content
 * only; real course content arrives in Phase 9.
 */
import { randomUUID } from "node:crypto";
import type {
  BlockType,
  BranchCode,
  LeaderGroup,
} from "@/generated/prisma/client";
import { BlockSchema } from "@/lib/schemas/blocks";
import { QuizQuestionSchema } from "@/lib/schemas/quiz";
import {
  siteSettingSchemas,
  type SiteSettingKey,
} from "@/lib/schemas/site-settings";

type SeedBlock = { type: BlockType; content: unknown };

export const course = {
  slug: "volunteers-onboarding",
  title: "Volunteers' Onboarding",
  description:
    "Everything you need to start serving with Kingdom Culture: who we are, what we believe and how we work together.",
  isPublished: true,
  order: 0,
};

export const modules: Array<{
  slug: string;
  title: string;
  summary: string;
  requiresCheck?: boolean;
  narratorIntro?: string;
  blocks: SeedBlock[];
}> = [
  {
    slug: "welcome",
    title: "Welcome to the Spiritual Costco",
    summary: "What to expect from your onboarding.",
    narratorIntro: "Hey! I'll be walking with you through your onboarding.",
    blocks: [
      {
        type: "NARRATOR_CALLOUT",
        content: {
          state: "wave",
          text: "Welcome to KC! Let's get you started.",
        },
      },
      {
        type: "TEXT",
        content: {
          markdown:
            "Sample content: a short welcome to the KC volunteer family.",
        },
      },
    ],
  },
  {
    slug: "about-kc",
    title: "About KC",
    summary: "Our story so far.",
    blocks: [
      {
        type: "TIMELINE",
        content: {
          events: [
            { year: "Year 1", title: "KC begins", body: "Sample milestone." },
            { year: "Today", title: "One family", body: "Sample milestone." },
          ],
        },
      },
    ],
  },
  {
    slug: "our-values",
    title: "Our Values",
    summary: "The values that shape how we serve.",
    blocks: [
      {
        type: "HEADING",
        content: { text: "Our Values", level: 1, pill: "OUR VALUES" },
      },
      {
        type: "FLIP_CARDS",
        content: {
          cards: [
            {
              front: "Honour",
              back: "Sample description of this value.",
              reference: "Romans 12:10",
            },
            { front: "Excellence", back: "Sample description of this value." },
            { front: "Family", back: "Sample description of this value." },
          ],
        },
      },
    ],
  },
  {
    slug: "our-church-family",
    title: "Our Church Family",
    summary: "Meet the people who lead KC.",
    blocks: [
      {
        type: "PEOPLE",
        content: {
          people: [
            {
              name: "Pastor Placeholder",
              role: "Senior Pastor",
              ringColour: "lime",
            },
            {
              name: "Leader Placeholder",
              role: "Associate Pastor",
              ringColour: "lime",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "what-we-believe",
    title: "What We Believe",
    summary: "The core beliefs of our church.",
    blocks: [
      {
        type: "ACCORDION",
        content: {
          items: [
            { title: "Sample belief one", body: "Placeholder explanation." },
            { title: "Sample belief two", body: "Placeholder explanation." },
          ],
        },
      },
      {
        type: "REFLECTION",
        content: {
          prompt: "Which of these beliefs means the most to you, and why?",
          revealTitle: "Something to think about",
          revealBody: "Sample reflection answer.",
        },
      },
    ],
  },
  {
    slug: "how-were-organised",
    title: "How We're Organised",
    summary: "How KC is structured.",
    blocks: [
      {
        type: "PYRAMID",
        content: {
          levels: [
            { title: "Jesus", body: "At the centre of everything." },
            { title: "Leadership", body: "Sample description." },
            { title: "Branches", body: "Sample description." },
            { title: "Teams", body: "Sample description." },
          ],
        },
      },
    ],
  },
  {
    slug: "expectations",
    title: "Expectations",
    summary: "What we ask of every volunteer.",
    blocks: [
      {
        type: "CHECKLIST",
        content: {
          title: "Before you serve",
          items: [
            "Arrive 30 minutes early",
            "Check in with your team lead",
            "Pray together",
          ],
        },
      },
    ],
  },
  {
    slug: "giving",
    title: "Giving",
    summary: "Why and how we give.",
    blocks: [
      {
        type: "HEADING",
        content: { text: "Giving", level: 1, pill: "GENEROSITY" },
      },
      {
        type: "LINK_QR",
        content: {
          label: "Give online",
          url: "https://example.org/give",
          description: "Placeholder giving link.",
        },
      },
    ],
  },
  {
    slug: "safeguarding",
    title: "Safeguarding",
    summary: "Keeping everyone safe. Includes a short check.",
    requiresCheck: true,
    blocks: [
      {
        type: "CONTACT",
        content: {
          title: "Who to talk to",
          email: "safeguarding@example.org",
          contacts: [
            {
              label: "Designated Safeguarding Lead",
              name: "Placeholder Name",
              phone: "+44 7700 900001",
            },
          ],
        },
      },
      {
        type: "KNOWLEDGE_CHECK",
        content: {
          questions: [
            {
              prompt: "A child tells you something worrying. What do you do?",
              options: [
                {
                  id: "dsl",
                  text: "Tell the Designated Safeguarding Lead straight away",
                },
                { id: "keep", text: "Keep it to yourself" },
                { id: "investigate", text: "Investigate it yourself" },
              ],
              correctOptionId: "dsl",
              explanation:
                "Always pass concerns to the Designated Safeguarding Lead.",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "branches-and-teams",
    title: "Branches and Teams",
    summary: "Find where you fit.",
    blocks: [
      {
        type: "TABS",
        content: {
          tabs: [
            {
              label: "Experience",
              colour: "experience",
              body: "Sample description.",
              items: ["Welcome & Hosting", "Ushering"],
            },
            {
              label: "Ministry",
              colour: "ministry",
              body: "Sample description.",
              items: ["Prayer", "Kids"],
            },
            {
              label: "Creative",
              colour: "creative",
              body: "Sample description.",
              items: ["Worship", "Media"],
            },
            {
              label: "Systems",
              colour: "systems",
              body: "Sample description.",
              items: ["Tech", "Data"],
            },
          ],
        },
      },
    ],
  },
  {
    slug: "final-quiz",
    title: "Final Quiz",
    summary: "Check what you've learned.",
    blocks: [
      {
        type: "NARRATOR_CALLOUT",
        content: {
          state: "encourage",
          text: "You've got this! Take the final quiz when you're ready.",
        },
      },
    ],
  },
  {
    slug: "part-of-the-family",
    title: "You're Part of the Family",
    summary: "You've finished. What's next.",
    blocks: [
      {
        type: "NARRATOR_CALLOUT",
        content: {
          state: "celebrate",
          text: "You did it! Welcome to the family.",
        },
      },
      {
        type: "LINK_QR",
        content: {
          label: "Join the volunteers' WhatsApp group",
          url: "https://chat.whatsapp.com/placeholder",
        },
      },
    ],
  },
];

export const branches: Array<{
  code: BranchCode;
  name: string;
  description: string;
  colour: string;
  teams: string[];
}> = [
  {
    code: "EXPERIENCE",
    name: "Experience",
    description: "Welcoming people and making Sundays run smoothly.",
    colour: "#D9FF3D",
    teams: ["Welcome & Hosting", "Ushering", "Hospitality"],
  },
  {
    code: "MINISTRY",
    name: "Ministry",
    description: "Prayer, pastoral care and children's ministry.",
    colour: "#FF5FC8",
    teams: ["Prayer", "Kids", "Pastoral Care"],
  },
  {
    code: "CREATIVE",
    name: "Creative",
    description: "Worship, media and design.",
    colour: "#FF7A1A",
    teams: ["Worship", "Media & Photography", "Design"],
  },
  {
    code: "SYSTEMS",
    name: "Systems",
    description: "Tech, production and the systems behind the scenes.",
    colour: "#33D6F5",
    teams: ["Tech & Production", "Livestream", "Data & Admin"],
  },
];

export const leaders: Array<{
  name: string;
  role: string;
  group: LeaderGroup;
  branch?: BranchCode;
}> = [
  { name: "Pastor Placeholder", role: "Senior Pastor", group: "CHURCH_FAMILY" },
  {
    name: "Leader Placeholder",
    role: "Associate Pastor",
    group: "CHURCH_FAMILY",
  },
  {
    name: "Experience Lead",
    role: "Branch Lead",
    group: "BRANCH_LEAD",
    branch: "EXPERIENCE",
  },
  {
    name: "Ministry Lead",
    role: "Branch Lead",
    group: "BRANCH_LEAD",
    branch: "MINISTRY",
  },
  {
    name: "Creative Lead",
    role: "Branch Lead",
    group: "BRANCH_LEAD",
    branch: "CREATIVE",
  },
  {
    name: "Systems Lead",
    role: "Branch Lead",
    group: "BRANCH_LEAD",
    branch: "SYSTEMS",
  },
  {
    name: "Hosting Team Lead",
    role: "Team Lead, Welcome & Hosting",
    group: "TEAM_LEAD",
    branch: "EXPERIENCE",
  },
  {
    name: "Worship Team Lead",
    role: "Team Lead, Worship",
    group: "TEAM_LEAD",
    branch: "CREATIVE",
  },
  {
    name: "Tech Team Lead",
    role: "Team Lead, Tech & Production",
    group: "TEAM_LEAD",
    branch: "SYSTEMS",
  },
];

export const siteSettings: { [K in SiteSettingKey]: unknown } = {
  quiz: { passMark: 80, questionsPerAttempt: 10 },
  safeguarding: {
    email: "safeguarding@example.org",
    contacts: [
      {
        label: "Designated Safeguarding Lead",
        name: "Placeholder Name",
        phone: "+44 7700 900001",
      },
      {
        label: "Deputy Safeguarding Lead",
        name: "Placeholder Name",
        phone: "+44 7700 900002",
      },
    ],
  },
  links: {
    incidentFormUrl: "https://example.org/safeguarding-incident-form",
    whatsappUrl: "https://chat.whatsapp.com/placeholder",
  },
};

const yesNo = [
  { id: "a", text: "True" },
  { id: "b", text: "False" },
];

export const quizQuestions = [
  {
    prompt: "Who should you tell if you have a safeguarding concern?",
    options: [
      { id: "a", text: "The Designated Safeguarding Lead" },
      { id: "b", text: "Nobody" },
      { id: "c", text: "Post about it online" },
    ],
    correctOptionId: "a",
    explanation:
      "Always report safeguarding concerns to the Designated Safeguarding Lead.",
    isRequired: true,
    order: 0,
  },
  {
    prompt: "How early should you arrive before serving?",
    options: [
      { id: "a", text: "30 minutes" },
      { id: "b", text: "Just in time" },
      { id: "c", text: "After the service starts" },
    ],
    correctOptionId: "a",
    explanation:
      "Arriving 30 minutes early gives time to set up and pray together.",
    order: 1,
  },
  {
    prompt: "KC has four branches: Experience, Ministry, Creative and Systems.",
    options: yesNo,
    correctOptionId: "a",
    explanation: "Those are the four branches.",
    order: 2,
  },
  {
    prompt: "Which branch looks after worship and media?",
    options: [
      { id: "a", text: "Experience" },
      { id: "b", text: "Creative" },
      { id: "c", text: "Systems" },
    ],
    correctOptionId: "b",
    explanation: "Worship and media sit in the Creative branch.",
    order: 3,
  },
  {
    prompt: "You should check in with your team lead when you arrive.",
    options: yesNo,
    correctOptionId: "a",
    explanation: "Checking in helps your team lead plan the day.",
    order: 4,
  },
];

/**
 * Validates every block, setting and quiz question against the app's Zod
 * schemas. Throws one error listing every problem, before anything is written.
 */
export function validateSeedData() {
  const problems: string[] = [];
  const check = (
    label: string,
    result: {
      success: boolean;
      error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
    },
  ) => {
    if (result.success) return;
    for (const issue of result.error!.issues) {
      problems.push(
        `${label} ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      );
    }
  };

  for (const seedModule of modules) {
    if (seedModule.blocks.length === 0)
      problems.push(`Module ${seedModule.slug} has no blocks`);
    seedModule.blocks.forEach((block, index) =>
      check(
        `Module ${seedModule.slug} block ${index} (${block.type})`,
        BlockSchema.safeParse(block),
      ),
    );
  }
  for (const [key, value] of Object.entries(siteSettings) as Array<
    [SiteSettingKey, unknown]
  >) {
    check(`SiteSetting ${key}`, siteSettingSchemas[key].safeParse(value));
  }
  quizQuestions.forEach((question, index) =>
    check(
      `Quiz question ${index}`,
      QuizQuestionSchema.safeParse({ id: randomUUID(), ...question }),
    ),
  );
  if (quizQuestions.filter((q) => q.isRequired).length !== 1) {
    problems.push("Expected exactly one required quiz question");
  }

  if (problems.length > 0) {
    throw new Error(`Seed data is invalid:\n  - ${problems.join("\n  - ")}`);
  }
}
