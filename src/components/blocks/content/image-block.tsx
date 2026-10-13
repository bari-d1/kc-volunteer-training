import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function ImageBlock({ blockId }: BlockProps<"IMAGE">) {
  return <BlockStub type="IMAGE" blockId={blockId} />;
}
