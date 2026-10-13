import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function VideoBlock({ blockId }: BlockProps<"VIDEO">) {
  return <BlockStub type="VIDEO" blockId={blockId} />;
}
