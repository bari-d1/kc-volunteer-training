import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function TabsBlock({ blockId }: BlockProps<"TABS">) {
  return <BlockStub type="TABS" blockId={blockId} />;
}
