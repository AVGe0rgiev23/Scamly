// GlassPanel: a see-through panel with a light source (the glass utility in
// globals.css), and on a desktop an optional cursor spotlight: a soft halo-coloured
// light follows the mouse inside the panel, as if the pointer were a small torch.
// The spotlight only changes two CSS variables (--spot-x, --spot-y) and the opacity
// of one layer; it is off on touch screens and with reduced motion.
"use client";

import type { ElementType, HTMLAttributes, PointerEvent } from "react";
import { cn } from "./cn";

type GlassPanelProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  spotlight?: boolean;
  padded?: boolean;
};

function follow(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const element = event.currentTarget;
  const box = element.getBoundingClientRect();
  element.style.setProperty("--spot-x", `${event.clientX - box.left}px`);
  element.style.setProperty("--spot-y", `${event.clientY - box.top}px`);
  element.style.setProperty("--spot-on", "1");
}

function hide(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty("--spot-on", "0");
}

export function GlassPanel({
  as: Tag = "div",
  spotlight = false,
  padded = true,
  className,
  onPointerMove,
  onPointerLeave,
  ...props
}: GlassPanelProps) {
  return (
    <Tag
      className={cn(
        "glass rounded-lg",
        spotlight && "spotlight",
        padded && "p-6 md:p-8",
        className,
      )}
      onPointerMove={(event: PointerEvent<HTMLElement>) => {
        if (spotlight) follow(event);
        onPointerMove?.(event);
      }}
      onPointerLeave={(event: PointerEvent<HTMLElement>) => {
        if (spotlight) hide(event);
        onPointerLeave?.(event);
      }}
      {...props}
    />
  );
}
