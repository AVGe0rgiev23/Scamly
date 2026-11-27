// HeroScene: the hero of the home page as one small client island. It tells the whole
// story of „Провери истинския“ (D34) with two drawn phones, in four steps:
//
//   0 Обаждане   Мама's phone rings: „Мамо, катастрофирах, трябват ми пари.“ She sees
//                „За кого се представят?“ and the tile „Иван“ (a tap cue).
//   1 Въпрос     Мама: „Питаме Иван…“ with the 45 s ring; Иван's phone gets the push
//                „Някой се представя за теб пред мама и иска пари. Ти ли си?“
//   2 Отговор    Иван's answer screen: „Не съм аз — обаждам ти се сега!“ is pressed.
//   3 Резултат   Мама's phone turns red: „Това НЕ е Иван. Затворете.“; Иван sees that
//                the rest of the family was warned.
//
// The texts on the phones are the app's real texts (bg.identityAsk, bg.identityAnswer,
// bg.identityChecks); the names are examples (src/content/placeholders.ts).
//
// It plays once by itself (2.6 s a step), then stops on the red frame. The visitor can
// replay it, pick a step with the buttons, or use ← and → on them; any of these stops
// the autoplay. With reduced motion it starts on the final frame and never plays by
// itself. The live halo behind the stage follows the story: idle → caution while the
// real Иван is asked → danger when he says „Не съм аз“.
//
// The phones are pictures for the eye (aria-hidden); the caption under them says the
// same in words and is a polite live region, so a screen reader hears every step.
// The hero's words (heading, buttons) are rendered on the server and passed in as
// `children`, so they are in the HTML from the first frame.
"use client";

import { BellRing, ShieldAlert, UserCheck, UserRound } from "lucide-react";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/components/ui/cn";
import { HaloFieldLazy } from "@/components/ui/HaloFieldLazy";
import { Stage } from "@/components/ui/Stage";
import type { HaloState } from "@/components/ui/halo/haloMath";
import { fill } from "@/components/family/format";
import { SAMPLE } from "@/content/placeholders";
import { bg } from "@/i18n/bg";
import { PhoneFrame } from "./PhoneFrame";

const t = bg.landing.hero;
const ask = bg.identityAsk;
const answer = bg.identityAnswer;
const LAST_STEP = t.steps.length - 1;
const STEP_MS = 2600;

const son = SAMPLE.familyName;
const mom = SAMPLE.momInSentence;

// Which halo answers which step (like a Python list indexed by the step number).
const HALO_FOR_STEP: HaloState[] = ["idle", "caution", "caution", "danger"];

// prefers-reduced-motion as a value React can read (useSyncExternalStore is like a
// getter plus a "tell me when it changes" callback). The server assumes "no".
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduce(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function readReduce(): boolean {
  return window.matchMedia(REDUCE_QUERY).matches;
}

// Wide screens put the phones on the right; the halo's centre follows them.
const WIDE_QUERY = "(min-width: 64rem)";
function subscribeWide(onChange: () => void): () => void {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function readWide(): boolean {
  return window.matchMedia(WIDE_QUERY).matches;
}

// One screen layer inside a phone: shown when its step range contains `step`.
function Screen({ shown, children }: { shown: boolean; children: ReactNode }) {
  return (
    <div className="landing-screen" data-shown={shown || undefined}>
      {children}
    </div>
  );
}

// Мама's phone (the protected phone).
function MomPhone({ step }: { step: number }) {
  return (
    <PhoneFrame
      className="landing-phone--scene"
      data-level={step === LAST_STEP ? "red" : step > 0 ? "yellow" : undefined}
      island={
        <>
          <span aria-hidden="true" className="landing-island-dot" />
          <span>{step === 0 ? t.incoming : bg.app.name}</span>
        </>
      }
    >
      <p className="landing-phone-owner">{SAMPLE.momTitle}</p>
      <Screen shown={step === 0}>
        <div className="flex items-center gap-3">
          <span className="landing-avatar" aria-hidden="true">
            <UserRound />
          </span>
          <p className="text-sm font-semibold text-fg-muted">{t.unknownNumber}</p>
        </div>
        <p className="landing-bubble">{t.callerSays}</p>
        <div className="landing-card mt-auto">
          <p className="text-sm font-semibold">{ask.tilesTitle}</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <span className="landing-tile landing-tile--cue">{son}</span>
            <span className="landing-tile">{SAMPLE.otherFamily[0]}</span>
          </div>
        </div>
      </Screen>
      <Screen shown={step === 1 || step === 2}>
        <div className="landing-wait">
          <svg viewBox="0 0 120 120" className="landing-wait-ring" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="landing-wait-track" />
            <circle
              cx="60"
              cy="60"
              r="52"
              pathLength={100}
              className="landing-wait-value"
              data-step={step}
            />
          </svg>
          <span className="tabular font-mono text-[2rem] leading-none font-semibold">
            {step === 1 ? 43 : 38}
          </span>
        </div>
        <p className="mt-5 text-center font-display text-xl leading-tight font-semibold">
          {fill(ask.waiting, { name: son })}
        </p>
        <p className="mt-2 text-center text-sm text-fg-muted">{ask.waitingHint}</p>
        {/* Meanwhile she answers the check's questions (the safety net). */}
        <div className="landing-card mt-auto">
          <p className="text-sm font-semibold">{bg.protectedCheck.questions.asksMoney}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <span className="landing-tile landing-tile--on">{bg.protectedCheck.tri.yes}</span>
            <span className="landing-tile">{bg.protectedCheck.tri.no}</span>
          </div>
        </div>
      </Screen>
      <Screen shown={step === LAST_STEP}>
        <div className="landing-red">
          <ShieldAlert className="size-9" aria-hidden="true" />
          <p className="mt-3 font-display text-[1.75rem] leading-[1.02] font-bold">
            {fill(ask.notMeTitle, { name: son })}
          </p>
          <p className="mt-1 font-display text-[1.75rem] leading-[1.02] font-bold">{t.hangUp}</p>
          <p className="mt-3 text-base font-semibold text-fg">
            {fill(ask.callsYou, { name: son })}
          </p>
        </div>
        <div className="landing-card mt-3">
          <p className="text-sm font-semibold">{ask.comingQuestion}</p>
          <p className="landing-pill landing-pill--danger mt-2">{ask.call112}</p>
        </div>
        <p className="landing-pill mt-auto">{fill(bg.protectedCheck.callContact, { name: son })}</p>
      </Screen>
    </PhoneFrame>
  );
}

// Иван's phone (the real family member).
function SonPhone({ step }: { step: number }) {
  return (
    <PhoneFrame className="landing-phone--scene" data-level={step === 2 ? "yellow" : undefined}>
      <p className="landing-phone-owner">{son}</p>
      <Screen shown={step === 0}>
        <p className="tabular mt-10 text-center font-mono text-[3rem] leading-none font-light text-fg-muted">
          {SAMPLE.clock}
        </p>
      </Screen>
      <Screen shown={step === 1}>
        <p className="tabular mt-6 text-center font-mono text-[2.25rem] leading-none font-light text-fg-muted">
          {SAMPLE.clock}
        </p>
        <div className="landing-push">
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <BellRing className="size-4 text-danger-fg" aria-hidden="true" />
            <span className="font-semibold text-fg">{bg.app.name}</span>
            <span className="ml-auto">{t.pushNow}</span>
          </div>
          <p className="mt-2 text-sm font-semibold">{bg.identityChecks.askTitle}</p>
          <p className="mt-1 text-sm leading-snug text-fg-muted">
            {fill(bg.identityChecks.askBody, { person: mom })}
          </p>
        </div>
      </Screen>
      <Screen shown={step === 2}>
        <p className="eyebrow">{answer.eyebrow}</p>
        <p className="mt-2 font-display text-[1.75rem] leading-none font-bold">{answer.title}</p>
        <p className="mt-3 text-sm text-fg-muted">{fill(answer.question, { person: mom })}</p>
        <div className="mt-auto flex flex-col gap-2">
          <span className="landing-answer landing-answer--no">
            <ShieldAlert className="size-5 shrink-0" aria-hidden="true" />
            {answer.notMe}
          </span>
          <span className="landing-answer">
            <UserCheck className="size-5 shrink-0" aria-hidden="true" />
            {answer.itsMe}
          </span>
        </div>
      </Screen>
      <Screen shown={step === LAST_STEP}>
        <p className="font-display text-lg leading-snug font-semibold">
          {fill(answer.answeredNotMe, { person: mom })}
        </p>
        <p className="mt-3 text-sm font-semibold text-fg">
          {fill(answer.callNow, { person: mom })}
        </p>
        <div className="landing-card mt-auto">
          <p className="text-sm text-fg-muted">{answer.familyWarned}</p>
          <div className="mt-2 flex gap-1.5">
            {SAMPLE.otherFamily.map((name) => (
              <span key={name} className="landing-chip">
                {name}
              </span>
            ))}
          </div>
        </div>
      </Screen>
    </PhoneFrame>
  );
}

export function HeroScene({ children }: { children: ReactNode }) {
  const reduce = useSyncExternalStore(subscribeReduce, readReduce, () => false);
  const wide = useSyncExternalStore(subscribeWide, readWide, () => true);
  // `chosen`: the step the visitor picked (null = follow the autoplay).
  const [chosen, setChosen] = useState<number | null>(null);
  const [auto, setAuto] = useState(0);
  // A new number restarts the autoplay (the „Пусни отначало“ button).
  const [run, setRun] = useState(0);

  // The autoplay: one step every STEP_MS, once, then it rests on the last frame.
  useEffect(() => {
    if (reduce || chosen !== null) return;
    if (auto >= LAST_STEP) return;
    const timer = window.setTimeout(
      () => setAuto((value) => value + 1),
      auto === 0 ? STEP_MS + 600 : STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [auto, chosen, reduce, run]);

  // With reduced motion the scene opens on the final frame.
  const step = chosen ?? (reduce ? LAST_STEP : auto);

  function pick(next: number) {
    setChosen(Math.min(LAST_STEP, Math.max(0, next)));
  }

  function replay() {
    setChosen(null);
    setAuto(0);
    setRun((value) => value + 1);
    // With reduced motion "replay" shows the first frame; the steps go on by hand.
    if (reduce) setChosen(0);
  }

  function onKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      pick(step + (event.key === "ArrowRight" ? 1 : -1));
    }
  }

  const momFront = step === 0 || step === LAST_STEP;
  const focus = wide ? { x: 0.72, y: 0.48 } : { x: 0.5, y: 0.78 };

  return (
    <Stage
      aria-labelledby="home-title"
      className="landing-hero"
      data-step={step}
      field={<HaloFieldLazy state={HALO_FOR_STEP[step] ?? "idle"} focus={focus} intensity={0.8} />}
    >
      <div aria-hidden="true" className="landing-hero-scrim" />
      {/* The aurora horizon from the bottom edge: calm, then amber, then red. */}
      <div aria-hidden="true" className="landing-horizon">
        <span data-tone="calm" />
        <span data-tone="caution" />
        <span data-tone="danger" />
      </div>
      <div className="grid gap-x-8 gap-y-10 px-5 pt-8 pb-10 sm:px-8 md:px-12 md:pt-12 lg:min-h-[calc(100svh-7rem)] lg:grid-cols-12 lg:items-center lg:pb-12">
        <div className="lg:col-span-6 xl:col-span-5">{children}</div>
        <figure className="landing-scene lg:col-span-6 xl:col-span-7" aria-label={t.sceneLabel}>
          <div
            aria-hidden="true"
            className="landing-scene-phones"
            data-front={momFront ? "mom" : "son"}
          >
            <div className="landing-scene-slot" data-who="mom">
              <MomPhone step={step} />
            </div>
            <div className="landing-scene-link" data-step={step}>
              <span />
            </div>
            <div className="landing-scene-slot" data-who="son">
              <SonPhone step={step} />
            </div>
          </div>
          <figcaption className="mt-6">
            <p
              aria-live="polite"
              className="landing-caption mx-auto max-w-[34rem] text-center text-base text-fg md:text-lg"
            >
              <span className="tabular mr-2 font-mono text-sm text-fg-subtle">
                {step + 1}/{t.steps.length}
              </span>
              {t.steps[step]?.caption}
            </p>
            <div
              role="group"
              aria-label={t.stepsLabel}
              onKeyDown={onKeys}
              className="mt-4 flex flex-wrap items-center justify-center gap-1.5"
            >
              {t.steps.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  aria-current={index === step ? "step" : undefined}
                  onClick={() => pick(index)}
                  className={cn(
                    "landing-step-button pressable",
                    index === step && "landing-step-button--on",
                  )}
                >
                  <span className="tabular font-mono text-xs opacity-70">{index + 1}</span>
                  {item.label}
                </button>
              ))}
              <button type="button" onClick={replay} className="landing-step-button pressable">
                {t.replay}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-fg-subtle max-md:hidden">{t.keysHint}</p>
          </figcaption>
        </figure>
      </div>
    </Stage>
  );
}
