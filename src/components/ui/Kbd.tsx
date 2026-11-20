// A keyboard key in running text, e.g. <Kbd>Enter</Kbd>: a small raised key cap,
// lit from above like every other surface.

import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "surface-raised inline-flex h-6 min-w-6 items-center justify-center rounded-[7px] px-1.5",
        "font-mono text-xs leading-none text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}
