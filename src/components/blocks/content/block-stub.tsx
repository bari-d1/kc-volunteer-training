import type { BlockType } from "@/generated/prisma/client";

/** Temporary placeholder until each block gets its real design. */
export function BlockStub({
  type,
  blockId,
}: {
  type: BlockType;
  blockId: string;
}) {
  return (
    <div
      data-stub-block-id={blockId}
      className="rounded-md border-2 border-dashed border-surface-2 bg-surface px-4 py-6 text-center font-mono text-small text-muted"
    >
      {type}
    </div>
  );
}
