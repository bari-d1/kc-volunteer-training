import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function PyramidBlock({ blockId }: BlockProps<"PYRAMID">) {
  return <BlockStub type="PYRAMID" blockId={blockId} />;
}
