// „Иван ще ви се обади веднага.“ as a Dynamic Island at the top of the result
// screen: it arrives as a small pill („Семейството отговори“) and, after a short
// moment, grows into a card with the message in big letters (like a live activity
// at the top of a phone). With reduced motion it is open at once.
//
// The live region that reads the message aloud stays in CheckResult. (`motion`, which
// DynamicIsland uses, is already loaded by the site header on every page.)
"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { DynamicIsland } from "@/components/ui/DynamicIsland";
import { bg } from "@/i18n/bg";

// How long the pill stays small before it opens (ms): long enough to see it arrive.
const OPEN_AFTER_MS = 450;

export function FamilyIsland({ message }: { message: string }) {
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);

  // Open once, a moment after arriving (at once with reduced motion). The person can
  // still close and reopen it with a tap.
  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), reduce ? 0 : OPEN_AFTER_MS);
    return () => clearTimeout(timer);
  }, [reduce]);

  return (
    <DynamicIsland
      size="lg"
      status="safe"
      open={open}
      onOpenChange={setOpen}
      label={bg.protectedCheck.familyIslandLabel}
      className="check-island"
    >
      <p className="font-display text-2xl leading-tight font-bold text-fg">{message}</p>
      <p className="mt-1.5 text-lg text-fg-muted">{bg.protectedCheck.familyIslandHint}</p>
    </DynamicIsland>
  );
}
