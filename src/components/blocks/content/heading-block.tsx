import { PillTag } from "@/components/ui/pill-tag";
import { cn } from "@/lib/cn";
import type { BlockProps } from "../block-props";

// The lesson title is the page's h1, so block headings start at h2.
const levels = {
  1: { Tag: "h2", className: "text-h1" },
  2: { Tag: "h3", className: "text-h2" },
  3: { Tag: "h4", className: "text-h3" },
} as const;

export function HeadingBlock({ text, level, pill }: BlockProps<"HEADING">) {
  const { Tag, className } = levels[level];
  return (
    <div className="flex flex-col gap-4">
      {pill && <PillTag>{pill}</PillTag>}
      <Tag className={cn(className, "font-extrabold uppercase")}>{text}</Tag>
    </div>
  );
}
