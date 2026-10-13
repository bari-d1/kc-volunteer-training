import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function NarratorCalloutBlock({
  blockId,
}: BlockProps<"NARRATOR_CALLOUT">) {
  return <BlockStub type="NARRATOR_CALLOUT" blockId={blockId} />;
}
