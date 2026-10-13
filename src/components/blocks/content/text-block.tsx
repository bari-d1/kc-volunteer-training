import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function TextBlock({ blockId }: BlockProps<"TEXT">) {
  return <BlockStub type="TEXT" blockId={blockId} />;
}
