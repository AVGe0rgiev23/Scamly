// Badge: a small neutral label. StatusPill: a label with a meaning (safe, caution,
// danger, info). A status is never shown by colour alone: StatusPill always has an
// icon and words.

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type Status = "safe" | "caution" | "danger" | "info" | "neutral";

// The tinted look of each status (background, border, text).
export const STATUS_TINT: Record<Status, string> = {
  safe: "bg-safe-bg border-safe-line text-safe-fg",
  caution: "bg-caution-bg border-caution-line text-caution-fg",
  danger: "bg-danger-bg border-danger-line text-danger-fg",
  info: "bg-info-bg border-info-line text-info-fg",
  neutral: "bg-surface-2 border-line text-fg-muted",
};

// The solid look: for the one place on a screen where the status is the message.
export const STATUS_SOLID: Record<Status, string> = {
  safe: "bg-safe-solid border-safe-solid text-safe-on",
  caution: "bg-caution-solid border-caution-solid text-caution-on",
  danger: "bg-danger-solid border-danger-solid text-danger-on",
  info: "bg-info-solid border-info-solid text-info-on",
  neutral: "bg-surface-3 border-line-strong text-fg",
};

const STATUS_ICONS = {
  safe: CircleCheck,
  caution: TriangleAlert,
  danger: CircleAlert,
  info: Info,
  neutral: Info,
};

export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const Icon = STATUS_ICONS[status];
  return <Icon className={cn("size-[1.15em] shrink-0", className)} aria-hidden="true" />;
}

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { status?: Status };

export function Badge({ status = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium",
        STATUS_TINT[status],
        className,
      )}
      {...props}
    />
  );
}

type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  status: Status;
  solid?: boolean;
  // Replaces the default icon (e.g. a clock for "pending").
  icon?: ReactNode;
};

export function StatusPill({
  status,
  solid = false,
  icon,
  className,
  children,
  ...props
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-sm font-semibold leading-tight",
        solid ? STATUS_SOLID[status] : STATUS_TINT[status],
        className,
      )}
      {...props}
    >
      {icon ?? <StatusIcon status={status} />}
      {children}
    </span>
  );
}
