import type { ComponentType } from "react";
import type { BlockType } from "@/generated/prisma/client";
import type { BlockProps } from "./block-props";
import { HeadingBlock } from "./content/heading-block";
import { TextBlock } from "./content/text-block";
import { ImageBlock } from "./content/image-block";
import { VideoBlock } from "./content/video-block";
import { FlipCardsBlock } from "./content/flip-cards-block";
import { AccordionBlock } from "./content/accordion-block";
import { TabsBlock } from "./content/tabs-block";
import { TimelineBlock } from "./content/timeline-block";
import { PyramidBlock } from "./content/pyramid-block";
import { PeopleBlock } from "./content/people-block";
import { ReflectionBlock } from "./content/reflection-block";
import { ChecklistBlock } from "./content/checklist-block";
import { ContactBlock } from "./content/contact-block";
import { LinkQrBlock } from "./content/link-qr-block";
import { KnowledgeCheckBlock } from "./content/knowledge-check-block";
import { NarratorCalloutBlock } from "./content/narrator-callout-block";

/**
 * One component per BlockType. Typed against Prisma's enum, so adding a
 * BlockType without a component here fails the TypeScript build.
 */
export const blockRegistry = {
  HEADING: HeadingBlock,
  TEXT: TextBlock,
  IMAGE: ImageBlock,
  VIDEO: VideoBlock,
  FLIP_CARDS: FlipCardsBlock,
  ACCORDION: AccordionBlock,
  TABS: TabsBlock,
  TIMELINE: TimelineBlock,
  PYRAMID: PyramidBlock,
  PEOPLE: PeopleBlock,
  REFLECTION: ReflectionBlock,
  CHECKLIST: ChecklistBlock,
  CONTACT: ContactBlock,
  LINK_QR: LinkQrBlock,
  KNOWLEDGE_CHECK: KnowledgeCheckBlock,
  NARRATOR_CALLOUT: NarratorCalloutBlock,
} satisfies { [T in BlockType]: ComponentType<BlockProps<T>> };
