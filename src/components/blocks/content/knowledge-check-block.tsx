import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function KnowledgeCheckBlock({
  blockId,
}: BlockProps<"KNOWLEDGE_CHECK">) {
  return <BlockStub type="KNOWLEDGE_CHECK" blockId={blockId} />;
}
