// The home page ("/"), landing page v4 (P-03, D35, phase 5), in the Ореол design.
// ONE story in five sections, between the header and the footer (those two live in
// the root layout):
//
//   1. Hero: the hook „Гласът може да е фалшив. Близкият ти — не.“, the start button
//      and the two-phone scene „Мамо, катастрофирах“ → „Ти ли си?“ → „Не съм аз“ →
//      „Това НЕ е Иван. Затворете.“ (HeroScene.tsx, plays once, steppable).
//   2. How it works (#how, the header's „Как работи“): three steps with live minis.
//   3. The safety net: the real-engine demo („try to fool it“) and the six hard rules.
//   4. For the family, „Ти си истинският“: the answer screen to try, and the set-up.
//   5. Five questions and the final call to action „Свържете семейството си“.
//
// Only features that work today are described (no voice, no e-mail, no AI, no
// invented numbers). The map, the report form, the education cards and the fridge
// card are linked from the footer. A Server Component; motion lives in small client
// islands. All text comes from src/i18n/bg.ts, the examples from
// src/content/placeholders.ts.

import { QrCode } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FamilyTry } from "@/components/landing/FamilyTry";
import { HeroScene } from "@/components/landing/HeroScene";
import { HowSteps } from "@/components/landing/HowSteps";
import { SafetyNet } from "@/components/landing/SafetyNet";
import "@/components/landing/landing.css";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { HaloFieldLazy } from "@/components/ui/HaloFieldLazy";
import { Stage } from "@/components/ui/Stage";
import { ROUTES } from "@/config/routes";
import { SAMPLE } from "@/content/placeholders";
import { bg } from "@/i18n/bg";

const t = bg.landing;

// „Гласът може да е фалшив. Близкият ти — не.“ → the part after the dash glows.
function splitHook(text: string): [string, string] {
  const at = text.indexOf(" — ");
  if (at < 0) return [text, ""];
  const sentence = text.lastIndexOf(". ", at);
  return sentence < 0 ? ["", text] : [text.slice(0, sentence + 1), text.slice(sentence + 2)];
}

// A small eyebrow above a section heading (the only all-caps text).
function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("eyebrow flex items-center gap-3", className)}>
      <span aria-hidden="true" className="halo-line w-8" />
      {children}
    </p>
  );
}

const [hookLead, hookWord] = splitHook(bg.app.tagline);

export default function HomePage() {
  return (
    <main className="landing">
      {/* 1. Hero */}
      <div className="pt-3 md:pt-4">
        <HeroScene>
          <p className="glass inline-flex min-h-9 items-center gap-2.5 rounded-full py-1 pr-4 pl-1.5 text-[0.8125rem] text-fg-muted sm:text-sm">
            <span aria-hidden="true" className="halo-mark size-6 [--halo-hole:58%]" />
            {t.hero.eyebrow}
          </p>
          <h1 id="home-title" className="landing-hook mt-6">
            {hookLead} <span className="halo-word">{hookWord}</span>
          </h1>
          <p className="mt-6 max-w-[36ch] text-lg text-fg-muted md:text-xl">{t.hero.lead}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>a]:whitespace-nowrap">
            <ButtonLink href={ROUTES.protected} size="xl">
              {bg.home.startCheck}
            </ButtonLink>
            <ButtonLink href="#how" variant="secondary" size="xl">
              {t.howLink}
            </ButtonLink>
          </div>
          <p className="mt-4 max-w-[40ch] text-sm text-fg-subtle">{bg.home.pairNote}</p>
        </HeroScene>
      </div>

      {/* 2. How it works */}
      <section id="how" className="shell scroll-mt-24 py-14 md:py-20" aria-labelledby="how-title">
        <Eyebrow>{t.how.eyebrow}</Eyebrow>
        <h2 id="how-title" className="mt-4 mb-10 text-h1">
          {t.how.title}
        </h2>
        <HowSteps />
      </section>

      {/* 3. The safety net */}
      <section className="shell py-14 md:py-20" aria-labelledby="safety-title">
        <div className="mb-10 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Eyebrow>{t.safety.eyebrow}</Eyebrow>
            <h2 id="safety-title" className="mt-4 text-h2">
              {t.safety.title}
            </h2>
          </div>
          <p className="max-w-[40ch] text-lg text-fg-muted lg:col-span-4">{t.safety.text}</p>
        </div>
        <SafetyNet idPrefix="safety" />
      </section>

      {/* 4. For the family: „Ти си истинският“ */}
      <section
        className="shell grid gap-x-10 gap-y-12 py-14 md:py-20 lg:grid-cols-12 lg:items-center"
        aria-labelledby="family-title"
      >
        <div className="lg:col-span-7">
          <Eyebrow>{t.family.eyebrow}</Eyebrow>
          <h2 id="family-title" className="mt-4 text-h1">
            {t.family.title}
          </h2>
          <p className="mt-5 max-w-[44ch] text-lg text-fg-muted">{t.family.text}</p>
          <ul className="mt-8 flex flex-col gap-2">
            {t.family.sees.map((line) => (
              <li key={line} className="landing-sees">
                {line}
              </li>
            ))}
          </ul>
          <h3 className="mt-12 text-h3">{t.family.setupTitle}</h3>
          <ol className="landing-setup mt-5">
            {t.family.setup.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true" className="landing-setup-n tabular">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-fg">{step.title}</p>
                  <p className="text-fg-muted">{step.text}</p>
                  {index === 1 ? (
                    <p className="landing-code mt-2">
                      <span className="sr-only">{t.family.codeLabel}: </span>
                      <span className="tabular font-mono">{SAMPLE.pairingCode}</span>
                      <QrCode className="size-5" aria-hidden="true" />
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="lg:col-span-5">
          <FamilyTry />
        </div>
      </section>

      {/* 5. Questions and the final call to action */}
      <section
        className="shell grid gap-x-8 gap-y-10 py-14 md:py-20 lg:grid-cols-12"
        aria-labelledby="faq-title"
      >
        <div className="lg:col-span-5">
          <Eyebrow>{t.faqEyebrow}</Eyebrow>
          <h2 id="faq-title" className="mt-4 text-h2">
            {t.faqTitle}
          </h2>
        </div>
        <div className="landing-faq lg:col-span-7 lg:col-start-6 lg:row-span-1">
          {t.faq.map((item) => (
            <details key={item.question} className="border-t border-line last:border-b">
              <summary className="flex min-h-18 list-none items-center justify-between gap-6 py-4 font-display text-xl font-semibold [&::-webkit-details-marker]:hidden">
                {item.question}
                <span aria-hidden="true" className="landing-faq-icon" />
              </summary>
              <p className="max-w-[60ch] pb-7 text-lg text-fg-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="pb-16 md:pb-20">
        <Stage
          aria-labelledby="cta-title"
          className="landing-cta"
          field={<HaloFieldLazy state="calm" focus={{ x: 0.88, y: 0.62 }} intensity={0.65} />}
        >
          <div aria-hidden="true" className="landing-hero-scrim" />
          <div className="grid gap-x-8 gap-y-10 px-5 py-14 sm:px-8 md:px-12 md:py-20 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Eyebrow>{t.ctaEyebrow}</Eyebrow>
              <h2 id="cta-title" className="mt-4 text-h1">
                {t.ctaTitle}
              </h2>
              <p className="mt-5 max-w-[44ch] text-lg text-fg-muted">{t.ctaText}</p>
            </div>
            <nav
              aria-label={bg.home.setupLinks}
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:col-span-5 lg:flex-col lg:items-stretch"
            >
              <ButtonLink href={ROUTES.register} size="lg">
                {bg.home.register}
              </ButtonLink>
              <ButtonLink href={ROUTES.pair} variant="secondary" size="lg">
                {bg.home.pair}
              </ButtonLink>
              <Link
                href={ROUTES.login}
                className="flex min-h-14 items-center justify-center px-4 text-lg font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg"
              >
                {bg.home.login}
              </Link>
            </nav>
          </div>
          {/* „Инсталирай Scamly“: only appears when this phone can install the app (W2-09). */}
          <div className="px-5 pb-8 empty:hidden sm:px-8 md:px-12 md:pb-12">
            <InstallPrompt />
          </div>
        </Stage>
      </div>
    </main>
  );
}
