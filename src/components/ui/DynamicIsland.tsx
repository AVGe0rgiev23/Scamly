// DynamicIsland: a small pill that grows into a card and shrinks back (like the
// live-activity pill at the top of a phone screen). Later phases use it for the
// live state of a check, a new alert or a pairing code.
//
// How it moves: motion's `layout` animation. When the content changes size, motion
// measures the old and the new box and animates between them with a transform
// (a spring), so nothing but transform and opacity is animated. The card's text
// fades in after the box has grown. With reduced motion it just appears.
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { STATUS_SOLID, type Status } from "./Badge";
import { cn } from "./cn";
import { REDUCED, SPRING_UI } from "./motion";

type DynamicIslandProps = {
  // What the pill shows when it is small (one short line).
  label: ReactNode;
  // What the card shows when it is open.
  children: ReactNode;
  // A small status dot at the start of the pill (e.g. "danger" for a new alert).
  status?: Status;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  // "lg": a 64 px pill (the older person's screens and the gallery).
  size?: "md" | "lg";
  className?: string;
};

export function DynamicIsland({
  label,
  children,
  status = "info",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  size = "md",
  className,
}: DynamicIslandProps) {
  const reduce = useReducedMotion() ?? false;
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = openProp ?? ownOpen;
  const bodyId = useId();
  const transition = reduce ? REDUCED : SPRING_UI;

  function toggle() {
    setOwnOpen(!open);
    onOpenChange?.(!open);
  }

  return (
    <motion.div
      layout
      transition={transition}
      // The corner radius is set here (not by a class) so motion keeps it round
      // while the box is scaled during the animation.
      style={{ borderRadius: open ? 28 : 999 }}
      className={cn(
        "glass inline-flex flex-col overflow-hidden text-fg shadow-overlay",
        open ? "w-[min(26rem,calc(100vw-2rem))]" : "max-w-full",
        className,
      )}
    >
      <motion.button
        layout="position"
        transition={transition}
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={toggle}
        className={cn(
          "flex cursor-pointer items-center gap-3 px-4 text-left font-semibold",
          size === "lg" ? "min-h-16 px-5 text-lg" : "min-h-12",
        )}
      >
        <span aria-hidden="true" className="relative inline-flex size-2.5 shrink-0">
          <span className={cn("absolute inset-0 rounded-full border-0", STATUS_SOLID[status])} />
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={bodyId}
            key="body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: reduce ? REDUCED : { duration: 0.25, delay: 0.08 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="px-4 pb-4"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
