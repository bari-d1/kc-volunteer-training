import { z } from "zod";
import type { Block, BlockType } from "@/generated/prisma/client";
import {
  ColourTokenSchema,
  HttpUrlSchema,
  NonEmptyString,
  PhoneSchema,
  UrlOrPathSchema,
} from "./common";
import { checkAnswerKey, QuizOptionSchema } from "./quiz";

// ─── Content schemas, one per BlockType ─────────────────────────────────────

export const HeadingContentSchema = z.object({
  text: NonEmptyString,
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** Small pill tag shown above the heading, e.g. "OUR VALUES". */
  pill: NonEmptyString.optional(),
});

export const TextContentSchema = z.object({
  markdown: NonEmptyString,
});

export const ImageContentSchema = z.object({
  url: UrlOrPathSchema,
  /** Required for accessibility; use "" only for purely decorative images. */
  alt: z.string().trim(),
  caption: NonEmptyString.optional(),
});

export const VideoContentSchema = z.object({
  url: UrlOrPathSchema,
  captionsUrl: UrlOrPathSchema.optional(),
  poster: UrlOrPathSchema.optional(),
});

export const FlipCardsContentSchema = z.object({
  cards: z
    .array(
      z.object({
        front: NonEmptyString,
        back: NonEmptyString,
        /** e.g. a scripture reference. */
        reference: NonEmptyString.optional(),
      }),
    )
    .min(1),
});

export const AccordionContentSchema = z.object({
  items: z
    .array(z.object({ title: NonEmptyString, body: NonEmptyString }))
    .min(1),
});

export const TabsContentSchema = z.object({
  tabs: z
    .array(
      z.object({
        label: NonEmptyString,
        colour: ColourTokenSchema.optional(),
        body: NonEmptyString,
        items: z.array(NonEmptyString).optional(),
      }),
    )
    .min(1),
});

export const TimelineContentSchema = z.object({
  events: z
    .array(
      z.object({
        /** String so ranges like "2019–2021" or "Today" work. */
        year: NonEmptyString,
        title: NonEmptyString,
        body: NonEmptyString.optional(),
      }),
    )
    .min(1),
});

export const PyramidContentSchema = z.object({
  /** Top of the pyramid first. */
  levels: z
    .array(z.object({ title: NonEmptyString, body: NonEmptyString.optional() }))
    .min(1),
});

export const PeopleContentSchema = z.object({
  people: z
    .array(
      z.object({
        name: NonEmptyString,
        role: NonEmptyString,
        photoUrl: UrlOrPathSchema.optional(),
        ringColour: ColourTokenSchema.optional(),
      }),
    )
    .min(1),
});

export const ReflectionContentSchema = z.object({
  prompt: NonEmptyString,
  revealTitle: NonEmptyString,
  revealBody: NonEmptyString,
});

export const ChecklistContentSchema = z.object({
  title: NonEmptyString.optional(),
  items: z.array(NonEmptyString).min(1),
});

export const ContactPersonSchema = z.object({
  /** e.g. "Designated Safeguarding Lead". */
  label: NonEmptyString,
  name: NonEmptyString,
  phone: PhoneSchema.optional(),
});
export type ContactPerson = z.infer<typeof ContactPersonSchema>;

export const ContactContentSchema = z.object({
  title: NonEmptyString,
  email: z.email().optional(),
  contacts: z.array(ContactPersonSchema).min(1),
});

export const LinkQrContentSchema = z.object({
  label: NonEmptyString,
  /** Absolute so the QR code works when scanned. */
  url: HttpUrlSchema,
  description: NonEmptyString.optional(),
});

export const KnowledgeCheckContentSchema = z.object({
  questions: z
    .array(
      z
        .object({
          prompt: NonEmptyString,
          options: z.array(QuizOptionSchema).min(2),
          correctOptionId: NonEmptyString,
          explanation: NonEmptyString,
        })
        .superRefine(checkAnswerKey),
    )
    .min(1),
});

export const NarratorStateSchema = z.enum([
  "wave",
  "point",
  "think",
  "celebrate",
  "encourage",
]);
export type NarratorState = z.infer<typeof NarratorStateSchema>;

export const NarratorCalloutContentSchema = z.object({
  state: NarratorStateSchema,
  text: NonEmptyString,
});

/**
 * Content schema per BlockType. Typed against Prisma's enum, so adding a
 * BlockType to schema.prisma fails typecheck until it has a schema here.
 */
export const blockContentSchemas = {
  HEADING: HeadingContentSchema,
  TEXT: TextContentSchema,
  IMAGE: ImageContentSchema,
  VIDEO: VideoContentSchema,
  FLIP_CARDS: FlipCardsContentSchema,
  ACCORDION: AccordionContentSchema,
  TABS: TabsContentSchema,
  TIMELINE: TimelineContentSchema,
  PYRAMID: PyramidContentSchema,
  PEOPLE: PeopleContentSchema,
  REFLECTION: ReflectionContentSchema,
  CHECKLIST: ChecklistContentSchema,
  CONTACT: ContactContentSchema,
  LINK_QR: LinkQrContentSchema,
  KNOWLEDGE_CHECK: KnowledgeCheckContentSchema,
  NARRATOR_CALLOUT: NarratorCalloutContentSchema,
} as const satisfies Record<BlockType, z.ZodType>;

export type BlockContent<T extends BlockType> = z.infer<
  (typeof blockContentSchemas)[T]
>;

// ─── Discriminated union ────────────────────────────────────────────────────

const block = <T extends BlockType>(type: T) =>
  z.object({ type: z.literal(type), content: blockContentSchemas[type] });

export const BlockSchema = z.discriminatedUnion("type", [
  block("HEADING"),
  block("TEXT"),
  block("IMAGE"),
  block("VIDEO"),
  block("FLIP_CARDS"),
  block("ACCORDION"),
  block("TABS"),
  block("TIMELINE"),
  block("PYRAMID"),
  block("PEOPLE"),
  block("REFLECTION"),
  block("CHECKLIST"),
  block("CONTACT"),
  block("LINK_QR"),
  block("KNOWLEDGE_CHECK"),
  block("NARRATOR_CALLOUT"),
]);
export type BlockData = z.infer<typeof BlockSchema>;

// Fails typecheck if the union misses a BlockType.
type MissingFromUnion = Exclude<BlockType, BlockData["type"]>;
const unionIsComplete: [MissingFromUnion] extends [never] ? true : never = true;
void unionIsComplete;

// ─── Parsing database rows ──────────────────────────────────────────────────

export type ParsedBlock = BlockData &
  Pick<Block, "id" | "order" | "isPublished">;

export class BlockValidationError extends Error {
  constructor(
    readonly blockId: string,
    readonly blockType: string,
    readonly issues: z.core.$ZodIssue[],
  ) {
    const details = issues
      .map((issue) => {
        const path = issue.path.length ? issue.path.join(".") : "(root)";
        return `${path}: ${issue.message}`;
      })
      .join("; ");
    super(`Block ${blockId} (${blockType}) has invalid content: ${details}`);
    this.name = "BlockValidationError";
  }
}

/** Validates a Block row's content against its type. Throws BlockValidationError. */
export function parseBlock(
  row: Pick<Block, "id" | "type" | "content" | "order" | "isPublished">,
): ParsedBlock {
  const result = BlockSchema.safeParse({
    type: row.type,
    content: row.content,
  });
  if (!result.success) {
    throw new BlockValidationError(row.id, row.type, result.error.issues);
  }
  return {
    ...result.data,
    id: row.id,
    order: row.order,
    isPublished: row.isPublished,
  };
}

// ─── Volunteer view ─────────────────────────────────────────────────────────

/** Knowledge check as sent to volunteers: no answer key or explanations. */
export const PublicKnowledgeCheckContentSchema = z.object({
  questions: z
    .array(
      z.object({
        prompt: NonEmptyString,
        options: z.array(QuizOptionSchema).min(2),
      }),
    )
    .min(1),
});

/** Same as blockContentSchemas, but safe to send to the browser. */
export const volunteerBlockContentSchemas = {
  ...blockContentSchemas,
  KNOWLEDGE_CHECK: PublicKnowledgeCheckContentSchema,
} as const satisfies Record<BlockType, z.ZodType>;

export type VolunteerBlockContent<T extends BlockType> = z.infer<
  (typeof volunteerBlockContentSchemas)[T]
>;

const volunteerBlock = <T extends BlockType>(type: T) =>
  z.object({
    id: z.string(),
    type: z.literal(type),
    content: volunteerBlockContentSchemas[type],
    /** Position in the module, used for progress tracking. */
    order: z.number().int().optional(),
  });

export const VolunteerBlockSchema = z.discriminatedUnion("type", [
  volunteerBlock("HEADING"),
  volunteerBlock("TEXT"),
  volunteerBlock("IMAGE"),
  volunteerBlock("VIDEO"),
  volunteerBlock("FLIP_CARDS"),
  volunteerBlock("ACCORDION"),
  volunteerBlock("TABS"),
  volunteerBlock("TIMELINE"),
  volunteerBlock("PYRAMID"),
  volunteerBlock("PEOPLE"),
  volunteerBlock("REFLECTION"),
  volunteerBlock("CHECKLIST"),
  volunteerBlock("CONTACT"),
  volunteerBlock("LINK_QR"),
  volunteerBlock("KNOWLEDGE_CHECK"),
  volunteerBlock("NARRATOR_CALLOUT"),
]);
export type VolunteerBlock = z.infer<typeof VolunteerBlockSchema>;

type MissingFromVolunteerUnion = Exclude<BlockType, VolunteerBlock["type"]>;
const volunteerUnionIsComplete: [MissingFromVolunteerUnion] extends [never]
  ? true
  : never = true;
void volunteerUnionIsComplete;

/**
 * The browser-safe version of a parsed block. Unknown keys are stripped, so
 * knowledge-check answers and explanations never leave the server.
 */
export function toVolunteerBlock(
  block: BlockData & { id: string; order?: number },
): VolunteerBlock {
  return VolunteerBlockSchema.parse({
    id: block.id,
    type: block.type,
    content: block.content,
    order: block.order,
  });
}
