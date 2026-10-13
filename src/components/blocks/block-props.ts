import type { BlockType } from "@/generated/prisma/client";
import type { VolunteerBlockContent } from "@/lib/schemas/blocks";

/** Props for a block component: its typed content plus where it lives. */
export type BlockProps<T extends BlockType> = VolunteerBlockContent<T> & {
  blockId: string;
  moduleId: string;
};
