// The button of the design system, and ButtonLink: a link that looks the same.
//
// variant: "primary" (one per view, Signal Cyan), "secondary" (outlined), "ghost"
//          (text only), "danger" (deletes something, always behind a ConfirmDialog).
// size:    "md" 48 px (default), "sm" 44 px (dense tables), "lg" 56 px,
//          "xl" 64 px and bigger text (the older person's screens).
// loading: shows a small spinner and blocks a second press.
// In React 19 `ref` is a normal prop, so a parent can focus the button.

import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, Ref } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const BASE =
  "pressable inline-flex items-center justify-center gap-2 rounded-md border font-semibold " +
  "text-center leading-tight no-underline select-none cursor-pointer " +
  "disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-fg-subtle " +
  "aria-disabled:cursor-not-allowed";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-on-accent hover:bg-accent-hover hover:border-accent-hover",
  secondary: "border-line-strong bg-transparent text-fg hover:bg-surface-2",
  ghost: "border-transparent bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg",
  danger: "border-danger-solid bg-danger-solid text-danger-on hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-6 text-lg",
  xl: "min-h-16 px-7 py-3 text-xl",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

// The only spinner in the app: inside a button that is waiting.
function Spinner() {
  return (
    <svg
      className="spinner size-[1.1em] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
