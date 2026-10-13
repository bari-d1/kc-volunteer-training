"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { ColourToken } from "@/lib/schemas/common";
import { cn } from "@/lib/cn";
import type { BlockProps } from "../block-props";
import { Markdown } from "./markdown";

const activeColour: Record<ColourToken, string> = {
  lime: "border-lime",
  experience: "border-branch-experience",
  ministry: "border-branch-ministry",
  creative: "border-branch-creative",
  systems: "border-branch-systems",
};

const itemColour: Record<ColourToken, string> = {
  lime: "text-lime",
  experience: "text-branch-experience",
  ministry: "text-branch-ministry",
  creative: "text-branch-creative",
  systems: "text-branch-systems",
};

export function TabsBlock({ tabs }: BlockProps<"TABS">) {
  const baseId = useId();
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (index: number) => {
    setSelected(index);
    tabRefs.current[index]?.focus();
  };

  // Arrow keys move between tabs (and select them), Home/End jump to the ends.
  const onKeyDown = (event: KeyboardEvent) => {
    const last = tabs.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: selected === last ? 0 : selected + 1,
      ArrowLeft: selected === 0 ? last : selected - 1,
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      select(moves[event.key]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-surface-2"
      >
        {tabs.map((tab, index) => {
          const active = index === selected;
          return (
            <button
              key={index}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`${baseId}-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${baseId}-panel-${index}`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(index)}
              className={cn(
                "-mb-px shrink-0 border-b-4 px-4 py-3 text-small font-bold whitespace-nowrap uppercase transition-colors",
                active
                  ? cn("text-text", activeColour[tab.colour ?? "lime"])
                  : "border-transparent text-muted hover:text-text",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={index}
          id={`${baseId}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${index}`}
          tabIndex={0}
          hidden={index !== selected}
          className="flex flex-col gap-6 rounded-sm"
        >
          <Markdown>{tab.body}</Markdown>
          {tab.items && tab.items.length > 0 && (
            <ol className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {tab.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="flex items-baseline gap-3 border-t border-surface-2 pt-3"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "text-small font-extrabold",
                      itemColour[tab.colour ?? "lime"],
                    )}
                  >
                    /{itemIndex + 1}
                  </span>
                  <span className="text-body-lg font-bold">{item}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
