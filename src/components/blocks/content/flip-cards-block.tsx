"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { BlockProps } from "../block-props";

type Card = BlockProps<"FLIP_CARDS">["cards"][number];

const face =
  "absolute inset-0 flex flex-col justify-center gap-3 rounded-lg p-6 text-left";

function FlipCard({
  card,
  onFlip,
}: {
  card: Card;
  onFlip: (card: Card, flipped: boolean) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const reduced = useReducedMotion();

  // Scales with the card (container query) so words like EXCELLENCE fit.
  const front = (
    <span className="text-[min(2.5rem,10.5cqi)] leading-none font-extrabold tracking-[-0.01em] wrap-break-word text-lime uppercase">
      {card.front}
    </span>
  );
  const back = (
    <>
      <span className="text-body-lg text-text">{card.back}</span>
      {card.reference && (
        <span className="text-label text-lime">{card.reference}</span>
      )}
    </>
  );

  return (
    <button
      type="button"
      aria-pressed={flipped}
      onClick={() => {
        setFlipped(!flipped);
        onFlip(card, !flipped);
      }}
      className="group @container relative min-h-56 w-full rounded-lg perspective-distant"
    >
      <span className="sr-only">
        {flipped
          ? `${card.front}: ${card.back}${card.reference ? ` (${card.reference})` : ""}`
          : `${card.front} Show what it means.`}
      </span>
      {reduced ? (
        // Reduced motion: crossfade in place, no rotation.
        <span aria-hidden="true" className="absolute inset-0">
          <span
            className={cn(
              face,
              "bg-surface transition-opacity duration-200",
              flipped && "opacity-0",
            )}
          >
            {front}
          </span>
          <span
            className={cn(
              face,
              "bg-surface-2 transition-opacity duration-200",
              !flipped && "opacity-0",
            )}
          >
            {back}
          </span>
        </span>
      ) : (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 transform-3d"
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <span className={cn(face, "bg-surface backface-hidden")}>
            {front}
          </span>
          <span
            className={cn(face, "rotate-y-180 bg-surface-2 backface-hidden")}
          >
            {back}
          </span>
        </motion.span>
      )}
      <span
        aria-hidden="true"
        className="absolute right-4 bottom-4 text-label text-muted"
      >
        {flipped ? "Tap to flip back" : "Tap to flip"}
      </span>
    </button>
  );
}

export function FlipCardsBlock({ cards }: BlockProps<"FLIP_CARDS">) {
  const [announcement, setAnnouncement] = useState("");

  return (
    <div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <li key={index}>
            <FlipCard
              card={card}
              onFlip={(c, flipped) =>
                setAnnouncement(
                  flipped
                    ? `${c.front}: ${c.back}${c.reference ? ` ${c.reference}` : ""}`
                    : `${c.front}`,
                )
              }
            />
          </li>
        ))}
      </ul>
      {/* Reads the card's meaning aloud when it flips. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
