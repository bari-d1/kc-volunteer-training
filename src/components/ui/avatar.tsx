"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Branch } from "@/components/ui/pill-tag";

export type AvatarProps = {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  /** Coloured ring, e.g. a leader's branch. */
  ring?: Branch | "lime";
  className?: string;
};

const sizeClasses = {
  sm: "size-8 text-[0.75rem]",
  md: "size-12 text-small",
  lg: "size-20 text-body-lg",
};

const ringClasses: Record<NonNullable<AvatarProps["ring"]>, string> = {
  lime: "ring-lime",
  experience: "ring-branch-experience",
  ministry: "ring-branch-ministry",
  creative: "ring-branch-creative",
  systems: "ring-branch-systems",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = "md",
  ring,
  className,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-pill bg-surface-2 font-extrabold text-text",
        sizeClasses[size],
        ring && cn("ring-3 ring-offset-2 ring-offset-bg", ringClasses[ring]),
        className,
      )}
    >
      {showImage ? (
        // Plain img: avatars are small, fixed-size and may come from any host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span role="img" aria-label={name}>
          <span aria-hidden="true">{initials(name)}</span>
        </span>
      )}
    </span>
  );
}
