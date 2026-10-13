import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function TimelineBlock({ blockId }: BlockProps<"TIMELINE">) {
  return <BlockStub type="TIMELINE" blockId={blockId} />;
}
