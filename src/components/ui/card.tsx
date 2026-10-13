import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CardProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  /** Rendered above the body, separated by a divider. */
  header?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  /** Adds hover and focus-within states. Put the link or button inside. */
  interactive?: boolean;
};

const paddingClasses = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  header,
  padding = "md",
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-surface shadow-card",
        interactive &&
          "transition-[background-color,translate] focus-within:bg-surface-2 hover:-translate-y-0.5 hover:bg-surface-2 motion-reduce:hover:translate-y-0",
        className,
      )}
      {...props}
    >
      {header && (
        <div
          className={cn("border-b border-surface-2", paddingClasses[padding])}
        >
          {header}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  );
}
