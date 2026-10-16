import type { BlockType } from "@/generated/prisma/client";
import { blockContentSchemas } from "@/lib/schemas/blocks";

type BlockInfo = {
  label: string;
  /** Two-letter code shown as the block's icon in the editor. */
  icon: string;
  description: string;
  /** Valid starter content for a new block. */
  starter: unknown;
};

/** Every block type, in the order the "Add block" menu lists them. */
export const BLOCK_INFO: Record<BlockType, BlockInfo> = {
  HEADING: {
    label: "Heading",
    icon: "H",
    description: "A section title, with an optional pill tag.",
    starter: { text: "New heading", level: 2 },
  },
  TEXT: {
    label: "Text",
    icon: "Tx",
    description: "Paragraphs and lists, written in Markdown.",
    starter: { markdown: "Write something here." },
  },
  IMAGE: {
    label: "Image",
    icon: "Im",
    description: "A photo with alt text and a caption.",
    starter: { url: "/fixtures/volunteers.jpg", alt: "Volunteers serving" },
  },
  VIDEO: {
    label: "Video",
    icon: "Vd",
    description: "A video file, with captions.",
    starter: { url: "https://example.org/video.mp4" },
  },
  FLIP_CARDS: {
    label: "Flip cards",
    icon: "Fc",
    description: "Cards that flip to reveal more, e.g. values.",
    starter: { cards: [{ front: "Front", back: "Back" }] },
  },
  ACCORDION: {
    label: "Accordion",
    icon: "Ac",
    description: "Expandable items, e.g. beliefs or FAQs.",
    starter: { items: [{ title: "Item title", body: "Item body" }] },
  },
  TABS: {
    label: "Tabs",
    icon: "Tb",
    description: "Tabs in branch colours, each with a list.",
    starter: { tabs: [{ label: "Tab", body: "Tab body" }] },
  },
  TIMELINE: {
    label: "Timeline",
    icon: "Tl",
    description: "Dated events in order.",
    starter: { events: [{ year: "2026", title: "Event" }] },
  },
  PYRAMID: {
    label: "Pyramid",
    icon: "Py",
    description: "Levels from top to bottom, e.g. the KC structure.",
    starter: { levels: [{ title: "Top level" }, { title: "Next level" }] },
  },
  PEOPLE: {
    label: "People",
    icon: "Pp",
    description: "People with photos and roles.",
    starter: { people: [{ name: "Name", role: "Role" }] },
  },
  REFLECTION: {
    label: "Reflection",
    icon: "Rf",
    description: "A question to answer, then KC's answer.",
    starter: {
      prompt: "What do you think?",
      revealTitle: "KC's answer",
      revealBody: "The answer.",
    },
  },
  CHECKLIST: {
    label: "Checklist",
    icon: "Ck",
    description: "Items volunteers can tick off.",
    starter: { items: ["First item"] },
  },
  CONTACT: {
    label: "Contact",
    icon: "Ct",
    description: "Contact people, email and phone numbers.",
    starter: {
      title: "Who to contact",
      contacts: [{ label: "Lead", name: "Name" }],
    },
  },
  LINK_QR: {
    label: "Link and QR code",
    icon: "Qr",
    description: "A button and a QR code for a link.",
    starter: { label: "Open the link", url: "https://example.org" },
  },
  KNOWLEDGE_CHECK: {
    label: "Knowledge check",
    icon: "Kc",
    description: "Questions volunteers must answer correctly.",
    starter: {
      questions: [
        {
          prompt: "Question?",
          options: [
            { id: "a", text: "Right answer" },
            { id: "b", text: "Wrong answer" },
          ],
          correctOptionId: "a",
          explanation: "Why it's right.",
        },
      ],
    },
  },
  NARRATOR_CALLOUT: {
    label: "Narrator callout",
    icon: "Nr",
    description: "Something the guide says when this point is reached.",
    starter: { state: "point", text: "Something the guide says." },
  },
};

export const BLOCK_TYPES = Object.keys(BLOCK_INFO) as BlockType[];

/** Every block field's error, keyed by dotted path, or {} when valid. */
export function validateBlockContent(type: BlockType, content: unknown) {
  const result = blockContentSchemas[type].safeParse(content);
  if (result.success) return { valid: true as const, errors: {} };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    errors[issue.path.map(String).join(".") || "_form"] ??= issue.message;
  }
  return { valid: false as const, errors };
}

const GROUP_LABELS: Record<string, string> = {
  CHURCH_FAMILY: "church family",
  BRANCH_LEAD: "branch leads",
  TEAM_LEAD: "team leads",
};

const clip = (text: string, length = 60) => {
  const flat = text
    .replace(/\s+/g, " ")
    .replace(/[#*_>`[\]]/g, "")
    .trim();
  return flat.length > length ? `${flat.slice(0, length - 1)}…` : flat;
};
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** One line describing a block in the editor's list. */
export function summariseBlock(type: BlockType, content: unknown): string {
  const c = (content ?? {}) as Record<string, unknown>;
  const list = (key: string) =>
    (Array.isArray(c[key]) ? c[key] : []) as unknown[];
  const first = (key: string, field: string) =>
    String(
      (list(key)[0] as Record<string, unknown> | undefined)?.[field] ?? "",
    );
  switch (type) {
    case "HEADING":
      return clip(String(c.text ?? ""));
    case "TEXT":
      return clip(String(c.markdown ?? ""));
    case "IMAGE":
      return clip(String(c.alt || c.url || "Image"));
    case "VIDEO":
      return clip(String(c.url ?? ""));
    case "FLIP_CARDS":
      return `${count(list("cards").length, "card")}: ${clip(first("cards", "front"), 40)}`;
    case "ACCORDION":
      return `${count(list("items").length, "item")}: ${clip(first("items", "title"), 40)}`;
    case "TABS":
      return `${count(list("tabs").length, "tab")}: ${clip(first("tabs", "label"), 40)}`;
    case "TIMELINE":
      return `${count(list("events").length, "event")}, from ${first("events", "year")}`;
    case "PYRAMID":
      return `${count(list("levels").length, "level")}: ${clip(first("levels", "title"), 40)}`;
    case "PEOPLE": {
      const group = (c.source as { group?: string } | undefined)?.group;
      if (group) return `Auto: ${GROUP_LABELS[group] ?? group}`;
      return count(list("people").length, "person").replace(
        "persons",
        "people",
      );
    }
    case "REFLECTION":
      return clip(String(c.prompt ?? ""));
    case "CHECKLIST":
      return `${count(list("items").length, "item")}: ${clip(String(list("items")[0] ?? ""), 40)}`;
    case "CONTACT":
      return `${clip(String(c.title ?? ""), 45)}${c.source ? " (from Settings)" : ""}`;
    case "LINK_QR":
      return `${clip(String(c.label ?? ""), 45)}${c.source ? " (from Settings)" : ""}`;
    case "KNOWLEDGE_CHECK":
      return count(list("questions").length, "question");
    case "NARRATOR_CALLOUT":
      return `${String(c.state ?? "")}: ${clip(String(c.text ?? ""), 50)}`;
  }
}
