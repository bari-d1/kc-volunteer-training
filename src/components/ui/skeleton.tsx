import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";

/** Placeholder block. Size it with width/height utilities. */
export function Skeleton({
  className,
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-sm bg-surface-2 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
