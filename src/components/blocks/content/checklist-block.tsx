import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function ChecklistBlock({ blockId }: BlockProps<"CHECKLIST">) {
  return <BlockStub type="CHECKLIST" blockId={blockId} />;
}
