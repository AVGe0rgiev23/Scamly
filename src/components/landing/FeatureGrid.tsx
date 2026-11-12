// The feature grid of the home page: six panels of different sizes. Each panel shows
// a small, static copy of the real screen of that feature (built from the same
// primitives and the same texts as the app), not an icon. The names, the code and
// the times in them are examples (src/content/placeholders.ts) and every small
// screen is labelled „Примерен екран“ for screen readers and on screen.

import { Mic, PhoneIncoming, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { fill } from "@/components/family/format";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { SignalLine } from "@/components/ui/SignalLine";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { SAMPLE } from "@/content/placeholders";
import { bg } from "@/i18n/bg";

const f = bg.landing.features;

// One panel: the small screen on top, then the title and one sentence.
function Feature({
  title,
  text,
  className,
  children,
}: {
  title: string;
  text: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article className={cn("flex flex-col rounded-lg border border-line bg-surface-1", className)}>
      <div
        className="dot-lines relative flex flex-1 flex-col justify-center border-b border-line p-5 md:p-6"
        role="img"
        aria-label={`${bg.landing.sampleScreen}: ${title}`}
      >
        <div aria-hidden="true">{children}</div>
      </div>
      <div className="p-5 md:p-6">
        <h3 className="text-h3">{title}</h3>
        <p className="mt-2 max-w-[52ch] text-fg-muted">{text}</p>
      </div>
    </article>
  );
}

// A fake button or tile: looks like the real control, but cannot be pressed.
const TILE = "rounded-md border border-line-strong bg-surface-1 px-4 py-3 text-base font-semibold";

export function FeatureGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
      <Feature title={f.check.title} text={f.check.text} className="lg:col-span-7">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex min-h-40 flex-col justify-between rounded-md bg-accent p-4 font-display text-xl font-bold text-on-accent">
            <PhoneIncoming className="size-7" />
            {bg.protectedCheck.bigButton}
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-display text-lg font-bold">
              {bg.protectedCheck.questions.asksMoney}
            </p>
            <p className={cn(TILE, "border-accent bg-accent-bg")}>{bg.protectedCheck.tri.yes}</p>
            <p className={TILE}>{bg.protectedCheck.tri.no}</p>
            <p className={TILE}>{bg.protectedCheck.tri.unsure}</p>
          </div>
        </div>
      </Feature>

      <Feature title={f.verdict.title} text={f.verdict.text} className="lg:col-span-5">
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-col items-start gap-2">
            <VerdictBadge level="red" />
            <p className="border-l-2 border-danger-solid pl-3 text-sm text-fg">
              {bg.engine.hardRules.HR1_POLICE_ASKS_MONEY.explanation}
            </p>
          </div>
          <VerdictBadge level="yellow" />
          <VerdictBadge level="green" />
        </div>
      </Feature>

      <Feature title={f.alert.title} text={f.alert.text} className="lg:col-span-5">
        <div className="rounded-md border border-line border-l-2 border-l-accent bg-surface-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-lg font-bold">{SAMPLE.protectedName}</p>
            <p className="tabular font-mono text-sm text-fg-muted">{SAMPLE.alertTime}</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge status="info">{bg.alerts.newBadge}</Badge>
            <VerdictBadge level="red" />
          </div>
          <p className="mt-3 rounded-md bg-accent px-4 py-2.5 text-center font-semibold text-on-accent">
            {bg.alerts.callNow}
          </p>
        </div>
      </Feature>

      <Feature title={f.pairing.title} text={f.pairing.text} className="lg:col-span-4">
        <p className="text-sm text-fg-muted">{bg.family.codeLabel}</p>
        <p className="tabular mt-1 font-mono text-h1 font-semibold tracking-tight text-fg">
          {SAMPLE.pairingCode}
        </p>
        <p className="tabular mt-2 font-mono text-sm text-fg-muted">
          {fill(bg.family.codeTimeLeft, { time: SAMPLE.pairingTimeLeft })}
        </p>
      </Feature>

      <Feature title={f.voice.title} text={f.voice.text} className="lg:col-span-3">
        <p className={cn(TILE, "inline-flex items-center gap-2 border-accent bg-accent-bg")}>
          <Mic className="size-5" />
          {bg.voice.stop}
        </p>
        <p className="mt-3 text-sm text-fg">{fill(bg.voice.heard, { text: SAMPLE.voiceHeard })}</p>
      </Feature>

      <Feature
        title={f.offline.title}
        text={f.offline.text}
        className="md:col-span-2 lg:col-span-12"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <StatusPill status="caution" icon={<WifiOff className="size-[1.15em] shrink-0" />}>
            {bg.offline.title}
          </StatusPill>
          <SignalLine state="alert" className="h-8 flex-1" />
          <VerdictBadge level="red" />
        </div>
        <p className="mt-3 text-sm text-fg-muted">{bg.protectedCheck.localNote}</p>
      </Feature>
    </div>
  );
}
