// A small hint above a control with only an icon. CSS only (globals.css, .tooltip):
// it appears on hover after 400 ms and at once on keyboard focus. The control must
// still have its own accessible name (aria-label or hidden text): the bubble is
// hidden from screen readers so the name is not read twice.

import type { ReactNode } from "react";
import { cn } from "./cn";

export function Tooltip({
  text,
  children,
  className,
}: {
  text: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("tooltip relative inline-flex", className)}>
      {children}
      <span
        aria-hidden="true"
        className="tooltip-bubble absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-56 -translate-x-1/2 rounded-sm border border-line-strong bg-surface-3 px-2.5 py-1.5 text-xs font-medium text-fg shadow-raised"
      >
        {text}
      </span>
    </span>
  );
}
