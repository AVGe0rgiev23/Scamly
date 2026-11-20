// „Как работи“ on the home page: scroll-driven storytelling WITHOUT scroll-jacking.
// The page scrolls normally; on a wide screen a phone stays put next to the three
// steps (CSS `position: sticky`) and shows the screen that belongs to the step in the
// middle of the window: pairing code → big button → a question → the verdict → the
// family's alert. A thin halo line along the steps fills up as you read.
//
// How: one passive scroll listener, throttled to one check per frame
// (requestAnimationFrame), measures where the steps are. The progress line moves with
// a CSS variable (transform only); React re-renders only when the screen changes.
// On phones it is a simple stacked list: each step has its own small phone under it.
// Without JavaScript the steps and the first screen are simply shown.
"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { bg } from "@/i18n/bg";
import { PhoneFrame } from "./PhoneFrame";

type HowItWorksProps = {
  // The five sample screens, in order (MockScreens.tsx), rendered on the server.
  screens: ReactNode[];
};

// Which screen each step shows on a phone (step 2 shows the big button).
const MOBILE_SCREEN = [0, 1, 4];

// Step 2 („Проверка“) is long: while it passes, the phone goes button → question → verdict.
function screenFor(step: number, within: number): number {
  if (step === 0) return 0;
  if (step === 2) return 4;
  if (within < 0.34) return 1;
  if (within < 0.67) return 2;
  return 3;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function HowItWorks({ screens }: HowItWorksProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const [step, setStep] = useState(0);
  const [screen, setScreen] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    if (list === null) return;
    let frame = 0;

    function measure() {
      frame = 0;
      if (list === null) return;
      const anchor = window.innerHeight * 0.5;
      const items = Array.from(list.querySelectorAll<HTMLElement>("[data-step]"));
      let active = 0;
      items.forEach((item, index) => {
        if (item.getBoundingClientRect().top <= anchor) active = index;
      });
      const box = items[active]?.getBoundingClientRect();
      const within = box ? clamp01((anchor - box.top) / box.height) : 0;
      const whole = list.getBoundingClientRect();
      list.style.setProperty(
        "--how-progress",
        clamp01((anchor - whole.top) / whole.height).toFixed(3),
      );
      setStep(active);
      setScreen(screenFor(active, within));
    }

    function onScroll() {
      if (frame === 0) frame = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="relative mt-14 md:mt-20 lg:grid lg:grid-cols-12 lg:gap-x-8">
      {/* The steps. An ordered list: screen readers announce "1 of 3". */}
      <ol
        ref={listRef}
        className="landing-steps relative lg:col-span-6 lg:col-start-7"
        style={{ "--how-progress": 0 } as CSSProperties}
      >
        {bg.home.steps.map((item, index) => (
          <li
            key={item.title}
            data-step={index}
            data-active={index === step ? "true" : undefined}
            className={cn(
              "landing-step relative pb-14 pl-10 md:pl-14 lg:flex lg:flex-col lg:justify-center lg:pb-0",
              index === 1 ? "lg:min-h-[100svh]" : "lg:min-h-[58svh]",
            )}
          >
            {/* The number, with the dot that sits on the progress line. */}
            <p aria-hidden="true" className="relative tabular font-mono text-sm text-fg-subtle">
              <span className="landing-step-dot absolute top-1/2 -left-10 size-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full md:-left-14" />
              0{index + 1}
            </p>
            <h3 className="mt-2 text-h2 font-light tracking-[-0.03em] lg:text-h1">{item.title}</h3>
            <p className="mt-4 max-w-[40ch] text-lg text-fg-muted">{item.text}</p>
            {/* Phones: the step's own small screen, right under it. */}
            <div aria-hidden="true" className="mt-8 lg:hidden">
              <PhoneFrame className="landing-phone--sm">
                <div className="landing-screen" data-shown="true">
                  {screens[MOBILE_SCREEN[index] ?? 0]}
                </div>
              </PhoneFrame>
            </div>
          </li>
        ))}
      </ol>

      {/* Wide screens: the sticky phone with all five screens stacked; one is shown. */}
      <div
        aria-hidden="true"
        className="hidden lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:block"
      >
        <div className="sticky top-[max(6.5rem,calc(50svh-21rem))]">
          <PhoneFrame className="landing-phone--how mx-auto">
            {screens.map((content, index) => (
              <div
                key={index}
                className="landing-screen"
                data-shown={index === screen ? "true" : undefined}
              >
                {content}
              </div>
            ))}
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
}
