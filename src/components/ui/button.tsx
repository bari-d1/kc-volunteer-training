import Link from "next/link";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-lime text-ink hover:bg-lime/85",
  secondary: "border-2 border-lime text-lime hover:bg-lime/10",
  ghost: "text-text hover:bg-surface-2",
  danger: "bg-danger text-ink hover:bg-danger/85",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-small",
  md: "h-11 px-6 text-body",
  lg: "h-14 px-8 text-body-lg",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction. */
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentPropsWithRef<"button">, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<ComponentPropsWithRef<typeof Link>, keyof CommonProps>;

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    className,
    children,
    ...rest
  } = props;
  const inactive = disabled || loading;

  const classes = cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-pill font-bold whitespace-nowrap transition-colors select-none",
    variantClasses[variant],
    sizeClasses[size],
    inactive && "pointer-events-none opacity-50",
    className,
  );

  const content = (
    <>
      {loading && <Spinner />}
      {children}
    </>
  );

  if (rest.href !== undefined) {
    const { href, ...linkProps } = rest as ButtonAsLink;

    // Links have no disabled state, so drop href and remove from tab order.
    if (inactive) {
      return (
        <a
          role="link"
          aria-disabled="true"
          aria-busy={loading || undefined}
          className={classes}
        >
          {content}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...linkProps}>
        {content}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = rest as ButtonAsButton;

  return (
    <button
      type={type}
      disabled={inactive}
      aria-busy={loading || undefined}
      className={classes}
      {...buttonProps}
    >
      {content}
    </button>
  );
}
