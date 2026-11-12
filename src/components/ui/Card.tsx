// A surface: a panel one step above the page. "raised" is one step higher still
// (for a panel inside a panel). `as` chooses the HTML element (section, article, li…).

import type { ElementType, HTMLAttributes } from "react";
import { cn } from "./cn";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  tone?: "default" | "raised" | "flat";
  padded?: boolean;
};

const TONES = {
  default: "bg-surface-1 border-line",
  raised: "bg-surface-2 border-line",
  flat: "bg-transparent border-line",
};

export function Card({
  as: Tag = "div",
  tone = "default",
  padded = true,
  className,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn("rounded-lg border", TONES[tone], padded && "p-5 md:p-6", className)}
      {...props}
    />
  );
}
