"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import type { BlockProps } from "../block-props";

/** Any number of items can be open at once. */
export function AccordionBlock({ items }: BlockProps<"ACCORDION">) {
  const baseId = useId();
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());

  const toggle = (index: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="divide-y divide-surface-2 border-y border-surface-2">
      {items.map((item, index) => {
        const expanded = open.has(index);
        const buttonId = `${baseId}-button-${index}`;
        const panelId = `${baseId}-panel-${index}`;
        return (
          <div key={index}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left text-body-lg font-bold transition-colors hover:text-lime"
              >
                {item.title}
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-pill border-2 border-surface-2 text-lime transition-transform motion-reduce:transition-none",
                    expanded && "rotate-45",
                  )}
                >
                  {/* An SVG, not a "+" character: the glyph sits below centre. */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M7 1.5v11M1.5 7h11" />
                  </svg>
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <p className="pb-5 text-body text-muted">{item.body}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
