import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function LinkQrBlock({ blockId }: BlockProps<"LINK_QR">) {
  return <BlockStub type="LINK_QR" blockId={blockId} />;
}
