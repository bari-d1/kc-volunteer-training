import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function AccordionBlock({ blockId }: BlockProps<"ACCORDION">) {
  return <BlockStub type="ACCORDION" blockId={blockId} />;
}
