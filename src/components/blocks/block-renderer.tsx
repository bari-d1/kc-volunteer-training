import type { ComponentType } from "react";
import { NarratorHint } from "@/components/narrator/narrator-hint";
import { isHintedBlock } from "@/components/narrator/narrator-hints";
import { Reveal } from "@/components/ui/reveal";
import {
  VolunteerBlockSchema,
  type VolunteerBlock,
} from "@/lib/schemas/blocks";
import { BlockErrorBoundary } from "./block-error-boundary";
import { blockRegistry } from "./block-registry";
import { InvalidBlock } from "./invalid-block";

export type BlockRendererProps = {
  /** Blocks in display order, as returned by getModuleForVolunteer. */
  blocks: readonly VolunteerBlock[];
  moduleId: string;
  /** Profile.hideNarrator: drops narrator callouts entirely. */
  hideNarrator?: boolean;
};

/**
 * Renders lesson blocks in order through the block registry, each wrapped in
 * Reveal. Blocks are re-checked at runtime: anything unknown or invalid is
 * logged and replaced by a dev-only warning (nothing in production).
 */
export function BlockRenderer({
  blocks,
  moduleId,
  hideNarrator = false,
}: BlockRendererProps) {
  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block, index) => {
        const raw = block as { id?: unknown; type?: unknown };
        const blockId = typeof raw.id === "string" ? raw.id : `index-${index}`;
        const type = typeof raw.type === "string" ? raw.type : "unknown";

        const parsed = VolunteerBlockSchema.safeParse(block);
        if (!parsed.success) {
          const reason = parsed.error.issues
            .map(
              (issue) =>
                `${issue.path.join(".") || "(root)"}: ${issue.message}`,
            )
            .join("; ");
          console.error(`Block ${blockId} (${type}) is invalid: ${reason}`);
          return (
            <InvalidBlock
              key={blockId}
              blockId={blockId}
              type={type}
              reason={reason}
            />
          );
        }

        const { id, type: blockType, content } = parsed.data;
        if (hideNarrator && blockType === "NARRATOR_CALLOUT") return null;
        // The schema guarantees content matches the registry entry for its type.
        const Component = blockRegistry[blockType] as ComponentType<
          Record<string, unknown>
        >;
        return (
          <Reveal
            key={id}
            data-block-type={blockType}
            data-block-id={id}
            data-block-order={parsed.data.order}
          >
            <BlockErrorBoundary blockId={id} type={blockType}>
              {isHintedBlock(blockType) &&
              (blocks[index - 1] as { type?: string } | undefined)?.type !==
                "NARRATOR_CALLOUT" ? (
                <NarratorHint blockId={id} type={blockType}>
                  <Component {...content} blockId={id} moduleId={moduleId} />
                </NarratorHint>
              ) : (
                <Component {...content} blockId={id} moduleId={moduleId} />
              )}
            </BlockErrorBoundary>
          </Reveal>
        );
      })}
    </div>
  );
}
