// A surface: a panel lit from above, one step in front of the page.
//
// tone "default": the raised surface (lighter at the top, a highlight on the top
//                 edge, a soft long shadow under it);
//      "raised":  see-through glass with a light source, for a panel that floats
//                 over a hero or another panel;
//      "flat":    only a thin border, for quiet groups inside a panel.
// `as` chooses the HTML element (section, article, li…). A Server Component; the
// glass with a cursor spotlight is GlassPanel.

import type { ElementType, HTMLAttributes } from "react";
import { cn } from "./cn";

export type CardTone = "default" | "raised" | "flat";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  tone?: CardTone;
  padded?: boolean;
};

export const CARD_TONES: Record<CardTone, string> = {
  default: "surface-raised",
  raised: "glass",
  flat: "border border-line bg-transparent",
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
      className={cn("rounded-lg", CARD_TONES[tone], padded && "p-6 md:p-8", className)}
      {...props}
    />
  );
}
