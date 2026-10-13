import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function FlipCardsBlock({ blockId }: BlockProps<"FLIP_CARDS">) {
  return <BlockStub type="FLIP_CARDS" blockId={blockId} />;
}
