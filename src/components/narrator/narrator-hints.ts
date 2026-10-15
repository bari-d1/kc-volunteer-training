/**
 * Short "how to use this" hints for interactive blocks. A plain module
 * (not "use client") because the server-side BlockRenderer reads it.
 */
export const INTERACTIVE_HINTS = {
  FLIP_CARDS: "Tap a card to flip it.",
  TABS: "Tap each tab to explore.",
  TIMELINE: "Tap a year to see what happened.",
  PYRAMID: "Tap a level to learn more about it.",
  REFLECTION: "Have a think, then tap Compare.",
} as const;

export type HintedBlockType = keyof typeof INTERACTIVE_HINTS;

export const isHintedBlock = (type: string): type is HintedBlockType =>
  Object.hasOwn(INTERACTIVE_HINTS, type);

/**
 * Whether this block actually has something to tap. A pyramid whose levels
 * have no descriptions is a static diagram, so it gets no hint.
 */
export function needsHint(
  type: string,
  content: unknown,
): type is HintedBlockType {
  if (!isHintedBlock(type)) return false;
  if (type === "PYRAMID") {
    const { levels } = content as { levels: Array<{ body?: string }> };
    return levels.some((level) => level.body);
  }
  return true;
}
