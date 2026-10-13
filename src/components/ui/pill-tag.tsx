import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";

export type Branch = "experience" | "ministry" | "creative" | "systems";

export type PillTagProps = ComponentPropsWithRef<"span"> & {
  /** outline: lime outline on dark. filled: ink pill for lime backgrounds. */
  variant?: "outline" | "filled";
  /** Swaps lime for a branch colour. */
  branch?: Branch;
};

const outlineBranch: Record<Branch, string> = {
  experience: "border-branch-experience text-branch-experience",
  ministry: "border-branch-ministry text-branch-ministry",
  creative: "border-branch-creative text-branch-creative",
  systems: "border-branch-systems text-branch-systems",
};

const filledBranch: Record<Branch, string> = {
  experience: "text-branch-experience",
  ministry: "text-branch-ministry",
  creative: "text-branch-creative",
  systems: "text-branch-systems",
};

export function PillTag({
  variant = "outline",
  branch,
  className,
  ...props
}: PillTagProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-pill px-3.5 py-2 text-label",
        variant === "outline" &&
          cn(
            "border-2",
            branch ? outlineBranch[branch] : "border-lime text-lime",
          ),
        variant === "filled" &&
          cn("bg-ink", branch ? filledBranch[branch] : "text-lime"),
        className,
      )}
      {...props}
    />
  );
}
