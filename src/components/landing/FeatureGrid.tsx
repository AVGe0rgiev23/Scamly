// „Какво прави Scamly“ on the home page: an asymmetric bento grid. The cells have
// different sizes AND different kinds of content, so no two look alike:
//   a verdict (computed by the real engine on the sample police call at build time),
//   the family's alert as a live DynamicIsland, a drawn map, the 6-digit pairing code,
//   a voice "waveform" made of halo rings, and the offline fallback.
// Each cell is glass with a cursor spotlight on desktop (GlassPanel). The small screens
// are examples (src/content/placeholders.ts) and are labelled „Примерен екран“ for
// screen readers; their insides are hidden from them, the cell's heading says it all.

import { Mic, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { fill } from "@/components/family/format";
import { StatusPill } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { DynamicIsland } from "@/components/ui/DynamicIsland";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { RiskMeter } from "@/components/ui/RiskMeter";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { SAMPLE, SAMPLE_CALLS } from "@/content/placeholders";
import { analyseCall } from "@/engine";
import { bg } from "@/i18n/bg";
import { MapArt } from "./Illustrations";

const f = bg.landing.features;

// The verdict cell runs the real engine on the first sample call („Фалшив полицай“).
// This happens on the server while the page is built, so the result is real, not typed.
const SAMPLE_INPUT = SAMPLE_CALLS[0]?.input;
const SAMPLE_VERDICT = SAMPLE_INPUT ? analyseCall(SAMPLE_INPUT) : null;

// One cell: the picture (a sample screen) and the words, in the order given.
function Cell({
  title,
  text,
  className,
  pictureClassName,
  wordsFirst = false,
  children,
}: {
  title: string;
  text: string;
  className?: string;
  pictureClassName?: string;
  wordsFirst?: boolean;
  children: ReactNode;
}) {
  const words = (
    <div className="relative">
      <h3 className="text-h3">{title}</h3>
      <p className="mt-2 max-w-[44ch] text-fg-muted">{text}</p>
    </div>
  );
  return (
    <GlassPanel
      as="article"
      spotlight
      padded={false}
      className={cn("flex flex-col gap-6 overflow-hidden rounded-xl p-6 md:p-7", className)}
    >
      {wordsFirst ? words : null}
      <div
        role="img"
        aria-label={`${bg.landing.sampleScreen}: ${title}`}
        className="relative flex flex-1 flex-col"
      >
        <div aria-hidden="true" className={cn("flex flex-1 flex-col", pictureClassName)}>
          {children}
        </div>
      </div>
      {wordsFirst ? null : words}
    </GlassPanel>
  );
}

export function FeatureGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[auto_auto_auto]">
      {/* 1. The verdict, large: computed by the engine. */}
      <Cell
        title={f.verdict.title}
        text={f.verdict.text}
        wordsFirst
        className="md:col-span-2 lg:col-span-7 lg:row-span-2"
        pictureClassName="justify-end"
      >
        {SAMPLE_INPUT ? (
          <figure className="mb-5 max-w-[46ch] self-end rounded-lg rounded-br-sm border border-glass-line bg-glass-2 px-4 py-3 shadow-highlight">
            <figcaption className="text-xs font-semibold text-fg-muted">
              {bg.landing.demo.textLabel}
            </figcaption>
            <blockquote className="mt-1 text-sm text-fg">„{SAMPLE_INPUT.text}“</blockquote>
          </figure>
        ) : null}
        {SAMPLE_VERDICT ? (
          <div className="grid items-end gap-6 rounded-lg border border-danger-line bg-danger-bg/60 p-5 sm:grid-cols-[minmax(0,15rem)_1fr] md:p-6">
            <RiskMeter
              score={SAMPLE_VERDICT.score}
              level={SAMPLE_VERDICT.level}
              label={bg.landing.demo.riskLabel}
            />
            <div>
              <VerdictBadge level={SAMPLE_VERDICT.level} />
              <p className="mt-3 font-display text-[clamp(1.5rem,1.2rem+1vw,2.25rem)] leading-tight font-bold text-danger-fg">
                {SAMPLE_VERDICT.headlineBg}
              </p>
              {SAMPLE_VERDICT.reasons.slice(0, 3).map((reason) => (
                <p key={reason.code} className="mt-2 flex gap-2.5 text-sm text-fg">
                  <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-danger-solid" />
                  {reason.textBg}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </Cell>

      {/* 2. The family's alert: a pill that opens into a card (press it). */}
      <GlassPanel
        as="article"
        spotlight
        padded={false}
        className="flex flex-col justify-between gap-8 rounded-xl p-6 md:p-7 lg:col-span-5"
      >
        <div className="flex min-h-44 flex-col items-center gap-4">
          <p className="tabular font-mono text-5xl leading-none font-extralight tracking-tight text-fg">
            {SAMPLE.alertTime}
          </p>
          <DynamicIsland
            status="danger"
            label={fill(bg.landing.familyIsland, { name: SAMPLE.protectedName })}
          >
            <div className="flex items-center justify-between gap-3">
              <VerdictBadge level="red" />
              <span className="tabular font-mono text-sm text-fg-muted">{SAMPLE.alertTime}</span>
            </div>
            <p className="mt-3 rounded-full bg-primary px-4 py-2.5 text-center font-semibold text-on-primary">
              {bg.alerts.callNow}
            </p>
          </DynamicIsland>
        </div>
        <div>
          <h3 className="text-h3">{f.alert.title}</h3>
          <p className="mt-2 max-w-[44ch] text-fg-muted">{f.alert.text}</p>
        </div>
      </GlassPanel>

      {/* 3. The map: a drawing of the districts, the words over its lower edge. */}
      <Cell
        title={bg.map.homeTitle}
        text={bg.map.homeText}
        className="lg:col-span-5"
        pictureClassName="-mx-6 -mt-6 md:-mx-7 md:-mt-7"
      >
        <MapArt id="bento-map" className="landing-map landing-map--bento" />
      </Cell>

      {/* 4. The pairing code: six digits, in two groups of three. */}
      <Cell title={f.pairing.title} text={f.pairing.text} className="lg:col-span-4" wordsFirst>
        <div className="mt-auto">
          <p className="text-sm text-fg-muted">{bg.family.codeLabel}</p>
          <p className="mt-2 flex gap-1.5">
            {SAMPLE.pairingCode.split("").map((digit, index) =>
              digit === " " ? (
                <span key={index} className="w-2" />
              ) : (
                <span
                  key={index}
                  className="tabular grid h-14 w-11 place-items-center rounded-md border border-glass-line bg-glass-2 font-mono text-2xl font-semibold shadow-highlight"
                >
                  {digit}
                </span>
              ),
            )}
          </p>
          <p className="tabular mt-3 font-mono text-sm text-fg-muted">
            {fill(bg.family.codeTimeLeft, { time: SAMPLE.pairingTimeLeft })}
          </p>
        </div>
      </Cell>

      {/* 5. Voice: rings spreading from the microphone, like a halo. */}
      <Cell title={f.voice.title} text={f.voice.text} className="lg:col-span-3">
        <div className="landing-voice">
          <span className="landing-voice-ring" />
          <span className="landing-voice-ring" />
          <span className="landing-voice-ring" />
          <span className="relative grid size-14 place-items-center rounded-full bg-primary text-on-primary shadow-raised">
            <Mic className="size-6" />
          </span>
        </div>
        <p className="mt-4 text-sm text-fg">{fill(bg.voice.heard, { text: SAMPLE.voiceHeard })}</p>
      </Cell>

      {/* 6. Offline: the phone decides by itself. */}
      <Cell
        title={f.offline.title}
        text={f.offline.text}
        className="md:col-span-2 lg:col-span-5"
        pictureClassName="justify-center"
      >
        <div className="flex items-center gap-3 [&>span]:shrink-0 [&>span]:whitespace-nowrap">
          <StatusPill status="caution" icon={<WifiOff className="size-[1.15em] shrink-0" />}>
            {bg.offline.title}
          </StatusPill>
          <hr className="halo-line min-w-6 flex-1" />
          <VerdictBadge level="red" />
        </div>
        <p className="mt-4 text-sm text-fg-muted">{bg.protectedCheck.localNote}</p>
      </Cell>
    </div>
  );
}
