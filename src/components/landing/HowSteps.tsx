// „Как работи“ on the home page: the three steps of „Провери истинския“, each on a
// glass card with a small LIVE picture instead of a paragraph:
//   1. a ringing call from „Иван?“ with a moving sound wave;
//   2. a finger tapping the tile „Иван“, and the question flying to his phone;
//   3. the two answers, and a 45-second ring that hands over to the next relative.
// The pictures loop with CSS only (landing.css .landing-mini-*); with reduced motion
// they stand still on their most telling frame. They are decoration (aria-hidden):
// the step title and line say the same in words. A Server Component.

import { ArrowRight, PhoneIncoming, ShieldAlert, UserCheck } from "lucide-react";
import { SAMPLE } from "@/content/placeholders";
import { bg } from "@/i18n/bg";

const t = bg.landing.how;

function MiniCall() {
  return (
    <div className="landing-mini landing-mini--call">
      <span className="landing-mini-ring">
        <PhoneIncoming className="size-5" />
      </span>
      <span className="font-display text-xl font-semibold">{t.miniCaller}</span>
      <span className="landing-mini-wave">
        {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
          <i key={bar} />
        ))}
      </span>
    </div>
  );
}

function MiniTap() {
  return (
    <div className="landing-mini landing-mini--tap">
      <span className="landing-mini-tile">
        {SAMPLE.familyName}
        <i className="landing-mini-finger" />
      </span>
      <ArrowRight className="landing-mini-arrow size-5" />
      <span className="landing-mini-push">{t.miniPush}</span>
    </div>
  );
}

function MiniAnswer() {
  return (
    <div className="landing-mini landing-mini--answer">
      <div className="flex flex-col gap-1.5">
        <span className="landing-mini-chip landing-mini-chip--no">
          <ShieldAlert className="size-4" />
          {t.miniNotMe}
        </span>
        <span className="landing-mini-chip">
          <UserCheck className="size-4" />
          {t.miniItsMe}
        </span>
      </div>
      <span className="landing-mini-clock">
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" className="landing-wait-track" />
          <circle cx="24" cy="24" r="20" pathLength={100} className="landing-mini-clock-value" />
        </svg>
        <span className="tabular font-mono text-[0.6875rem] font-semibold">{t.miniSeconds}</span>
      </span>
      <span className="landing-mini-next">
        {t.miniNext}: {SAMPLE.otherFamily[0]}
      </span>
    </div>
  );
}

const PICTURES = [<MiniCall key="call" />, <MiniTap key="tap" />, <MiniAnswer key="answer" />];

export function HowSteps() {
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {t.steps.map((step, index) => (
        <li key={step.title} className="landing-how-card surface-raised">
          <div aria-hidden="true" className="landing-how-art">
            {PICTURES[index]}
          </div>
          <div className="px-6 pt-5 pb-6">
            <p className="tabular font-mono text-sm text-fg-subtle">0{index + 1}</p>
            <h3 className="mt-2 text-h3">{step.title}</h3>
            <p className="mt-2 text-fg-muted">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
