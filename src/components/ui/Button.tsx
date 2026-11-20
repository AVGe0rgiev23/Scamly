// The button of the design system, and ButtonLink: a link that looks the same.
//
// variant: "primary"   the near-white pill (ink pill in the light theme) with an
//                      icon disc at its end; the arrow in the disc slides on hover.
//                      One per view.
//          "secondary" a glass pill lit from above.
//          "ghost"     text only, a soft glass appears on hover.
//          "danger"    deletes something, always behind a ConfirmDialog.
// size:    "md" 48 px (default), "sm" 44 px (dense tables), "lg" 56 px,
//          "xl" 64 px and bigger text (the older person's screens),
//          "icon" a 48 × 48 px circle for an icon-only button.
// loading: shows the small halo spinner and blocks a second press.
// disc:    the icon in the primary pill's disc (an arrow by default); `false`
//          hides the disc. A pill whose children already bring their own icon
//          gets no disc unless one is passed, so there are never two arrows.
//
// Magnetic hover (desktop with a mouse only, never with reduced motion): the pill
// leans a few pixels towards the pointer, so it feels like it notices you. It moves
// with a CSS transform through two variables, --mag-x and --mag-y (globals.css .btn).
// In React 19 `ref` is a normal prop, so a parent can focus the button.
"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Children, isValidElement } from "react";
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  PointerEvent,
  ReactNode,
  Ref,
  RefCallback,
} from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon";

const BASE =
  "btn relative inline-flex items-center justify-center gap-2.5 rounded-full border " +
  "font-semibold text-center leading-tight no-underline select-none cursor-pointer whitespace-normal " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "btn-primary border-transparent bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "glass text-fg hover:border-line-strong",
  ghost: "border-transparent bg-transparent text-fg-muted hover:bg-glass-2 hover:text-fg",
  danger:
    "border-danger-solid bg-danger-solid text-danger-on shadow-raised hover:brightness-110 disabled:hover:brightness-100",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-6 text-lg",
  xl: "min-h-16 px-7 py-3 text-xl",
  // A round 48 × 48 px button with only an icon (give it an aria-label).
  icon: "size-12 shrink-0 p-0",
};

// The primary pill ends in its disc, so the right padding is small.
const DISC_PADDING: Record<ButtonSize, string> = {
  sm: "pr-1.5",
  md: "pr-1.5",
  lg: "pr-2",
  xl: "pr-2",
  icon: "",
};

const DISC_SIZE: Record<ButtonSize, string> = {
  sm: "size-8",
  md: "size-9",
  lg: "size-10",
  xl: "size-12",
  icon: "",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

// How far (in px) a magnetic pill may lean towards the pointer.
const PULL_X = 6;
const PULL_Y = 4;

// True on a desktop with a precise mouse, when the person has not asked for less motion.
function canBeMagnetic(): boolean {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function lean(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse" || !canBeMagnetic()) return;
  const element = event.currentTarget;
  const box = element.getBoundingClientRect();
  // A pill near the screen edge stays put, so leaning never makes the page wider.
  if (box.left < PULL_X * 2 || box.right > window.innerWidth - PULL_X * 2) return;
  // -1 … 1: where the pointer is, from the left/top edge to the right/bottom edge.
  const x = ((event.clientX - box.left) / box.width) * 2 - 1;
  const y = ((event.clientY - box.top) / box.height) * 2 - 1;
  element.style.setProperty("--mag-x", `${(x * PULL_X).toFixed(1)}px`);
  element.style.setProperty("--mag-y", `${(y * PULL_Y).toFixed(1)}px`);
}

function release(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.removeProperty("--mag-x");
  event.currentTarget.style.removeProperty("--mag-y");
}

// The disc at the end of a primary pill: the icon twice, so one copy can leave to
// the right while the other slides in from the left (globals.css .btn-disc).
function Disc({ size, icon, loading }: { size: ButtonSize; icon: ReactNode; loading: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "btn-disc inline-grid shrink-0 place-items-center rounded-full bg-on-primary text-primary [&_svg]:size-[1.05em]",
        DISC_SIZE[size],
      )}
    >
      {loading ? (
        <span>
          <HaloSpinner />
        </span>
      ) : (
        <>
          <span>{icon}</span>
          <span>{icon}</span>
        </>
      )}
    </span>
  );
}

// The small halo spinner: two concentric rings turning (globals.css .halo-spinner).
export function HaloSpinner({ className }: { className?: string }) {
  return <span className={cn("halo-spinner", className)} aria-hidden="true" />;
}

// Should this pill have a disc? `disc` undefined = the default: only when the
// children are plain words (no icon element of their own).
function hasDisc(
  variant: ButtonVariant,
  size: ButtonSize,
  disc: ReactNode | false | undefined,
  children: ReactNode,
): boolean {
  if (variant !== "primary" || size === "icon" || disc === false) return false;
  if (disc !== undefined) return true;
  return !Children.toArray(children).some((child) => isValidElement(child));
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disc?: ReactNode | false;
  magnetic?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disc,
  magnetic = true,
  className,
  type = "button",
  disabled,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: ButtonProps) {
  const withDisc = hasDisc(variant, size, disc, children);
  const pulls = magnetic && (variant === "primary" || variant === "secondary") && size !== "icon";
  return (
    <button
      type={type}
      className={buttonClass(variant, size, cn(withDisc && DISC_PADDING[size], className))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onPointerMove={(event) => {
        if (pulls) lean(event);
        onPointerMove?.(event);
      }}
      onPointerLeave={(event) => {
        release(event);
        onPointerLeave?.(event);
      }}
      {...props}
    >
      {loading && !withDisc ? <HaloSpinner /> : null}
      {children}
      {withDisc ? (
        <Disc size={size} icon={disc ?? <ArrowRight strokeWidth={2.25} />} loading={loading} />
      ) : null}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disc?: ReactNode | false;
  magnetic?: boolean;
  ref?: Ref<HTMLAnchorElement> | RefCallback<HTMLAnchorElement>;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  disc,
  magnetic = true,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: ButtonLinkProps) {
  const withDisc = hasDisc(variant, size, disc, children);
  const pulls = magnetic && (variant === "primary" || variant === "secondary") && size !== "icon";
  return (
    <Link
      className={buttonClass(variant, size, cn(withDisc && DISC_PADDING[size], className))}
      onPointerMove={(event) => {
        if (pulls) lean(event);
        onPointerMove?.(event);
      }}
      onPointerLeave={(event) => {
        release(event);
        onPointerLeave?.(event);
      }}
      {...props}
    >
      {children}
      {withDisc ? (
        <Disc size={size} icon={disc ?? <ArrowRight strokeWidth={2.25} />} loading={false} />
      ) : null}
    </Link>
  );
}
