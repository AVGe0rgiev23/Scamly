// What a view shows when it has nothing to show (EmptyState) or could not load
// (ErrorState). Both say what happened and offer one next step, on a quiet raised
// panel with small still halo rings (calm „idle“ rings when empty, the one red ring
// when something failed). `visual` is a slot for another picture; leave it out for
// the default rings.

import type { ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "./cn";
import { HaloRings } from "./HaloRings";

type EmptyStateProps = {
  title?: string;
  text: string;
  // A button or link, e.g. „Добави човек“.
  action?: ReactNode;
  visual?: ReactNode;
  className?: string;
};

export function EmptyState({ title, text, action, visual, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "surface-raised flex flex-col items-start gap-5 rounded-lg px-6 py-8 md:flex-row md:items-center md:px-8 md:py-10",
        className,
      )}
    >
      <div className="shrink-0">
        {visual ?? <HaloRings state="idle" size={56} animated={false} />}
      </div>
      <div className="min-w-0">
        {title === undefined ? null : (
          <p className="mb-1 font-display text-h3 font-semibold">{title}</p>
        )}
        <p className="max-w-[60ch] text-fg-muted">{text}</p>
        {action === undefined ? null : <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

type ErrorStateProps = {
  text: string;
  retryLabel?: string;
  onRetry?: () => void;
  visual?: ReactNode;
  className?: string;
};

export function ErrorState({ text, retryLabel, onRetry, visual, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-5 rounded-lg border border-danger-line bg-danger-bg px-6 py-7 shadow-highlight md:flex-row md:items-center md:px-8",
        className,
      )}
    >
      <div className="shrink-0">
        {visual ?? <HaloRings state="danger" size={48} animated={false} />}
      </div>
      <div className="min-w-0">
        {/* Only the message is the alert, so a screen reader does not read the button
            text as part of it. */}
        <p role="alert" className="max-w-[60ch] text-fg">
          {text}
        </p>
        {onRetry === undefined || retryLabel === undefined ? null : (
          <Button variant="secondary" className="mt-4" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
