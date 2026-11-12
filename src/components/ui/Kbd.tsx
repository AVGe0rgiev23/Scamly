// A keyboard key in running text, e.g. <Kbd>Enter</Kbd>.

import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-6 items-center justify-center rounded-sm border border-line-strong",
        "bg-surface-2 px-1.5 font-mono text-xs text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}
