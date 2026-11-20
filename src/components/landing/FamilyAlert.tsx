// The family's alert on the home page: the DynamicIsland primitive starts as a small
// pill („Баба Мария провери обаждане“) and, the first time it scrolls into view, grows
// into the full alert card: the verdict, what happened second by second, and the
// „Обаждам ѝ се сега“ action as the real app shows it. After that the visitor can
// close and open it with the pill. With reduced motion it simply opens (no spring).
// Sample content only (src/content/placeholders.ts).
"use client";

import { useEffect, useRef, useState } from "react";
import { DynamicIsland } from "@/components/ui/DynamicIsland";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { fill } from "@/components/family/format";
import { SAMPLE } from "@/content/placeholders";
import { bg } from "@/i18n/bg";

const t = bg.landing;

export function FamilyAlert() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Open once, a moment after the island is well inside the window.
  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        timer = window.setTimeout(() => setOpen(true), 450);
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={ref} className="flex min-h-[25rem] justify-center lg:justify-start">
      <DynamicIsland
        status="danger"
        size="lg"
        open={open}
        onOpenChange={setOpen}
        label={fill(t.familyIsland, { name: SAMPLE.protectedName })}
        className="self-start"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <VerdictBadge level="red" />
          <p className="tabular font-mono text-sm text-fg-muted">{SAMPLE.alertTime}</p>
        </div>
        <p className="mt-4 text-sm font-semibold text-fg-muted">{t.timelineTitle}</p>
        {/* It IS a sequence, so it is numbered by time. */}
        <ol className="mt-1">
          {t.timeline.map((event, index) => (
            <li
              key={event}
              className="grid grid-cols-[5.25rem_1fr] gap-3 border-t border-line py-2.5 text-sm"
            >
              <span className="tabular font-mono text-fg-subtle">
                {SAMPLE.timelineTimes[index]}
              </span>
              <span className="text-fg">{event}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-full bg-primary px-4 py-3 text-center font-semibold text-on-primary">
          {bg.alerts.callNow}
        </p>
        <p className="mt-2 text-center text-xs text-fg-subtle">{t.sampleScreen}</p>
      </DynamicIsland>
    </div>
  );
}
