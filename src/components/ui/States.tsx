// What a view shows when it has nothing to show (EmptyState) or could not load
// (ErrorState). Both say what happened and offer one next step.
// The calm, flat signal line marks "nothing here"; the jagged one marks "broken".

import type { ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "./cn";
import { SignalLine } from "./SignalLine";

type EmptyStateProps = {
  title?: string;
  text: string;
  // A button or link, e.g. „Добави човек“.
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, text, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-line-strong px-5 py-8 md:px-8 md:py-10",
        className,
      )}
    >
      <SignalLine state="idle" className="mb-5 h-5 max-w-40 text-fg-subtle" />
      {title === undefined ? null : <p className="mb-1 font-display text-h3 font-bold">{title}</p>}
      <p className="max-w-[60ch] text-fg-muted">{text}</p>
      {action === undefined ? null : <div className="mt-5">{action}</div>}
    </div>
  );
}

type ErrorStateProps = {
  text: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ text, retryLabel, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-danger-line bg-danger-bg px-5 py-6 md:px-8",
        className,
      )}
    >
      <SignalLine state="alert" className="mb-4 h-6 max-w-40" />
      <p className="max-w-[60ch] text-fg">{text}</p>
      {onRetry === undefined || retryLabel === undefined ? null : (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
