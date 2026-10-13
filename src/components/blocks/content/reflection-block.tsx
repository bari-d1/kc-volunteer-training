import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function ReflectionBlock({ blockId }: BlockProps<"REFLECTION">) {
  return <BlockStub type="REFLECTION" blockId={blockId} />;
}
