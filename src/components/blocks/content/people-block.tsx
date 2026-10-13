import type { BlockProps } from "../block-props";
import { BlockStub } from "./block-stub";

export function PeopleBlock({ blockId }: BlockProps<"PEOPLE">) {
  return <BlockStub type="PEOPLE" blockId={blockId} />;
}
