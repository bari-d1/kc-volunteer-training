import type { BlockProps } from "../block-props";
import { Markdown } from "./markdown";

export function TextBlock({ markdown }: BlockProps<"TEXT">) {
  return <Markdown>{markdown}</Markdown>;
}
