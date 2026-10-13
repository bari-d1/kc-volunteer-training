import Image from "next/image";
import { cn } from "@/lib/cn";
import logoBlack from "@/assets/brand/kc-logo-black.png";
import logoWhite from "@/assets/brand/kc-logo-white.png";

export type LogoProps = {
  /** white for dark backgrounds (the app), black for light ones. */
  variant?: "white" | "black";
  /** Set height with a class (e.g. h-10); width follows the logo's ratio. */
  className?: string;
  /** Load eagerly when the logo is above the fold. */
  priority?: boolean;
  /** Empty when a visible label already names the brand. */
  alt?: string;
};

/** The Kingdom Culture wordmark. */
export function Logo({
  variant = "white",
  className,
  priority,
  alt = "Kingdom Culture",
}: LogoProps) {
  return (
    <Image
      src={variant === "white" ? logoWhite : logoBlack}
      alt={alt}
      priority={priority}
      sizes="240px"
      className={cn("h-10 w-auto", className)}
    />
  );
}
