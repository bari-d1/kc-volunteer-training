import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function ContactBlock({ blockId }: BlockProps<"CONTACT">) {
  return <BlockStub type="CONTACT" blockId={blockId} />;
}
