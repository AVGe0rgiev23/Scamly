// HeroStage: the hero of the home page as one small client island. It holds the demo's
// state (which sample call, the edited text), runs the real engine on it and gives the
// SAME verdict to two places:
//   - the phone screen (CallDemo): the risk gauge sweeps to the score;
//   - the live halo behind everything (HaloField): green → „calm“, yellow → „caution“,
//     red → „danger“, where the rings snap shut around the phone like a shield.
// The hero's words (heading, buttons) are rendered on the server and passed in as
// `children`, so they are in the HTML from the first frame.
//
// Tilt: on a desktop with a mouse the phone leans up to 6° towards the pointer (two
// CSS variables, no React re-render). Off on touch screens and with reduced motion.
"use client";

import { useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from "react";
import { HaloFieldLazy } from "@/components/ui/HaloFieldLazy";
import { Stage } from "@/components/ui/Stage";
import type { HaloState } from "@/components/ui/halo/haloMath";
import { SAMPLE_CALLS } from "@/content/placeholders";
import { analyseCall, type RiskLevel } from "@/engine";
import { bg } from "@/i18n/bg";
import { CallDemo } from "./CallDemo";
import { PhoneFrame } from "./PhoneFrame";

// Which halo answers which verdict (like a Python dict).
const HALO_FOR_LEVEL: Record<RiskLevel, HaloState> = {
  green: "calm",
  yellow: "caution",
  red: "danger",
};

// The call shown first: the harmless one, so the page opens calm and the visitor
// sees the halo close when they pick „Фалшив полицай“ themselves.
const FIRST_CALL = SAMPLE_CALLS.find((item) => item.id === "relative") ?? SAMPLE_CALLS[0];

const MAX_TILT = 6; // degrees

// Wide screens put the phone on the right, phones put it under the words; the halo's
// centre follows the phone. useSyncExternalStore reads the media query like a getter.
const WIDE_QUERY = "(min-width: 64rem)";
function subscribeWide(onChange: () => void): () => void {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function readWide(): boolean {
  return window.matchMedia(WIDE_QUERY).matches;
}

function canTilt(event: PointerEvent<HTMLElement>): boolean {
  return (
    event.pointerType === "mouse" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function HeroStage({ children }: { children: ReactNode }) {
  const [callId, setCallId] = useState(FIRST_CALL?.id ?? "");
  // The text the visitor may have changed, per sample call (like a Python dict).
  const [texts, setTexts] = useState<Record<string, string>>({});
  const wide = useSyncExternalStore(subscribeWide, readWide, () => true);
  const tiltRef = useRef<HTMLDivElement>(null);

  const call = SAMPLE_CALLS.find((item) => item.id === callId) ?? FIRST_CALL;
  if (call === undefined) return null;
  const text = texts[call.id] ?? call.input.text;
  const verdict = analyseCall({ ...call.input, text });
  const haloState = HALO_FOR_LEVEL[verdict.level];
  const focus = wide ? { x: 0.75, y: 0.5 } : { x: 0.5, y: 0.72 };

  function lean(event: PointerEvent<HTMLElement>) {
    const target = tiltRef.current;
    if (target === null || !canTilt(event)) return;
    const box = event.currentTarget.getBoundingClientRect();
    // -1 … 1 from the left/top edge of the stage to the right/bottom edge.
    const x = ((event.clientX - box.left) / box.width) * 2 - 1;
    const y = ((event.clientY - box.top) / box.height) * 2 - 1;
    target.style.setProperty("--tilt-y", `${(x * MAX_TILT).toFixed(2)}deg`);
    target.style.setProperty("--tilt-x", `${(-y * MAX_TILT).toFixed(2)}deg`);
    // The reflection slides the other way, a few pixels (a plain number, landing.css).
    target.style.setProperty("--glare", (-x * 14).toFixed(1));
  }

  function rest() {
    tiltRef.current?.style.removeProperty("--tilt-x");
    tiltRef.current?.style.removeProperty("--tilt-y");
    tiltRef.current?.style.removeProperty("--glare");
  }

  return (
    <Stage
      aria-labelledby="home-title"
      className="landing-hero"
      data-level={verdict.level}
      field={<HaloFieldLazy state={haloState} focus={focus} intensity={0.8} />}
      onPointerMove={lean}
      onPointerLeave={rest}
    >
      {/* The aurora horizon rising from the bottom edge; its colour follows the verdict. */}
      {/* A soft shade behind the words, so the rings never cross the headline at full strength. */}
      <div aria-hidden="true" className="landing-hero-scrim" />
      <div aria-hidden="true" className="landing-horizon">
        <span data-tone="calm" />
        <span data-tone="caution" />
        <span data-tone="danger" />
      </div>
      <div className="grid gap-x-8 gap-y-12 px-5 pt-8 pb-12 sm:px-8 md:px-12 md:pt-14 lg:min-h-[calc(100svh-7rem)] lg:grid-cols-12 lg:items-start lg:pt-12 lg:pb-16">
        <div className="lg:col-span-6 lg:pt-[max(2rem,8svh)]">{children}</div>
        <div className="landing-tilt-scene lg:col-span-6 lg:justify-self-center xl:col-span-5 xl:col-start-8">
          <p className="mx-auto mb-5 max-w-[22rem] text-center text-sm text-fg-muted">
            {bg.landing.demoHint}
          </p>
          <div ref={tiltRef} className="landing-tilt">
            <PhoneFrame
              data-level={verdict.level}
              island={
                <>
                  <span aria-hidden="true" className="landing-island-dot" />
                  <span>{bg.landing.phoneIncoming}</span>
                </>
              }
            >
              <CallDemo
                call={call}
                text={text}
                verdict={verdict}
                onCallChange={setCallId}
                onTextChange={(value) => setTexts({ ...texts, [call.id]: value })}
              />
            </PhoneFrame>
          </div>
        </div>
      </div>
    </Stage>
  );
}
