// The small sample screens of „Как работи“ on the home page, drawn with our own
// primitives and the app's real texts (no screenshots): pairing code → the big button
// → a question → the verdict → the family's alert. Names, code and times are examples
// (src/content/placeholders.ts). They are pictures only: the parent hides them from
// screen readers, because the step texts next to them already say the same.
// Server Components (no state); HowItWorks.tsx shows one at a time.

import { PhoneIncoming } from "lucide-react";
import { StatusPill } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { HaloRings } from "@/components/ui/HaloRings";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { fill } from "@/components/family/format";
import { SAMPLE } from "@/content/placeholders";
import { bg } from "@/i18n/bg";

const q = bg.protectedCheck;
const SCREEN = "flex h-full flex-col px-5 pt-4 pb-6";
// A sample answer tile: looks like the real BigChoice, but cannot be pressed.
const TILE =
  "flex min-h-14 items-center rounded-lg border border-glass-line bg-glass-2 px-4 text-lg font-semibold shadow-highlight";

export function ScreenPairing() {
  return (
    <div className={cn(SCREEN, "items-center justify-center text-center")}>
      <div className="relative grid place-items-center">
        <HaloRings state="calm" size={180} animated={false} className="opacity-80" />
        <span className="absolute font-display text-xl font-semibold">{bg.app.name}</span>
      </div>
      <p className="mt-4 text-sm text-fg-muted">{bg.family.codeLabel}</p>
      <p className="tabular mt-1 font-mono text-[2.5rem] leading-none font-semibold tracking-tight">
        {SAMPLE.pairingCode}
      </p>
      <p className="tabular mt-3 font-mono text-sm text-fg-muted">
        {fill(bg.family.codeTimeLeft, { time: SAMPLE.pairingTimeLeft })}
      </p>
    </div>
  );
}

export function ScreenButton() {
  return (
    <div className={SCREEN}>
      <p className="font-display text-lg font-semibold">{SAMPLE.protectedName}</p>
      <div className="mt-4 flex flex-1 flex-col justify-between rounded-xl bg-primary p-6 text-on-primary shadow-raised">
        <PhoneIncoming className="size-10" aria-hidden="true" />
        <p className="font-display text-[2rem] leading-[1.05] font-semibold">{q.bigButton}</p>
      </div>
      <p className="mt-4 rounded-full border border-glass-line px-4 py-3 text-center text-sm font-medium text-fg-muted">
        {q.afterCall}
      </p>
    </div>
  );
}

export function ScreenQuestion() {
  return (
    <div className={SCREEN}>
      <p className="tabular font-mono text-xs text-fg-muted">
        {fill(q.progress, { current: 2, total: 5 })}
      </p>
      <div aria-hidden="true" className="mt-2 h-1 rounded-full bg-glass-2">
        <div className="h-full w-2/5 rounded-full bg-(image:--halo)" />
      </div>
      <p className="mt-6 font-display text-[1.75rem] leading-tight font-semibold">
        {q.questions.asksMoney}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <p className={cn(TILE, "halo-ring")}>{q.tri.yes}</p>
        <p className={TILE}>{q.tri.no}</p>
        <p className={TILE}>{q.tri.unsure}</p>
      </div>
    </div>
  );
}

export function ScreenVerdict() {
  return (
    <div className={cn(SCREEN, "bg-danger-bg")}>
      <p className="mt-2 text-sm text-danger-fg">{q.praise}</p>
      <p className="mt-3 font-display text-[2.25rem] leading-none font-bold text-danger-fg">
        {bg.verdict.red.title}
      </p>
      <p className="mt-4 text-lg font-semibold text-fg">{q.hangUp}</p>
      <div className="mt-5 rounded-lg border border-danger-line bg-canvas/40 p-4">
        <VerdictBadge level="red" />
        <p className="mt-2 text-sm text-fg">
          {bg.engine.hardRules.HR1_POLICE_ASKS_MONEY.explanation}
        </p>
      </div>
      <p className="mt-auto rounded-full bg-primary px-4 py-3 text-center font-semibold text-on-primary">
        {fill(q.callContact, { name: SAMPLE.familyName })}
      </p>
    </div>
  );
}

export function ScreenAlert() {
  return (
    <div className={SCREEN}>
      <p className="tabular text-center font-mono text-[2.75rem] leading-none font-light">
        {SAMPLE.alertTime}
      </p>
      <div className="glass mt-6 rounded-xl p-4 shadow-overlay">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{bg.app.name}</p>
          <p className="tabular font-mono text-xs text-fg-muted">{SAMPLE.alertTime}</p>
        </div>
        <p className="mt-2 font-display text-lg leading-snug font-semibold">
          {fill(bg.landing.familyIsland, { name: SAMPLE.protectedName })}
        </p>
        <StatusPill status="danger" className="mt-2">
          {bg.verdictBadge.red}
        </StatusPill>
        <p className="mt-4 rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-on-primary">
          {bg.alerts.callNow}
        </p>
      </div>
    </div>
  );
}
