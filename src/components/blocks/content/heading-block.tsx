import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function HeadingBlock({ blockId }: BlockProps<"HEADING">) {
  return <BlockStub type="HEADING" blockId={blockId} />;
}
