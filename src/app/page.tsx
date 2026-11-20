// The home page ("/"), Redesign v3 „Ореол“ (Phase 2A). A phone call is a sound wave;
// Scamly turns it into a halo that closes around the person. Ten sections between the
// header and the footer (those two live in the root layout):
//
//   1. Hero stage: the live halo, the headline, the start button and a tilted glass
//      phone that runs the REAL engine on sample calls. A red sample makes the halo
//      snap shut (HeroStage.tsx).
//   2. The one rule: „Затворете телефона.“, revealed word by word.
//   3. How it works: a sticky phone that changes screen as the 3 steps scroll past.
//   4. What Scamly does: an asymmetric bento of small real screens.
//   5. The six hard rules: a sideways deck of tall cards.
//   6. For the family: what a relative sets up; the alert island and the call order.
//   7. During a call: three quiet rules on an inverted (porcelain/ink) panel.
//   8. Public tools: education, report, map, each with our own line illustration.
//   9. Questions: an accordion (native <details>, works without JavaScript).
//  10. Start: register, pair a phone, log in, and the „Инсталирай Scamly“ card.
//
// A Server Component; motion lives in small client islands. All text comes from
// src/i18n/bg.ts, the examples from src/content/placeholders.ts. Nothing here is a
// statistic or a quote.

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FamilyAlert } from "@/components/landing/FamilyAlert";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { HeroStage } from "@/components/landing/HeroStage";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { EducationArt, MapArt, ReportArt } from "@/components/landing/Illustrations";
import {
  ScreenAlert,
  ScreenButton,
  ScreenPairing,
  ScreenQuestion,
  ScreenVerdict,
} from "@/components/landing/MockScreens";
import { RevealWords } from "@/components/landing/RevealWords";
import { RulesDeck } from "@/components/landing/RulesDeck";
import "@/components/landing/landing.css";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { HaloFieldLazy } from "@/components/ui/HaloFieldLazy";
import { Stage } from "@/components/ui/Stage";
import { ROUTES } from "@/config/routes";
import { SAMPLE } from "@/content/placeholders";
import { bg } from "@/i18n/bg";

const t = bg.landing;

// The three public tools: title, one sentence, the link and its picture.
const RESOURCES = [
  {
    title: bg.education.homeTitle,
    text: bg.education.homeText,
    link: bg.education.homeLink,
    href: ROUTES.education,
    art: <EducationArt id="art-education" />,
  },
  {
    title: bg.reportForm.homeTitle,
    text: bg.reportForm.homeText,
    link: bg.reportForm.homeLink,
    href: ROUTES.report,
    art: <ReportArt id="art-report" />,
  },
  {
    title: bg.map.homeTitle,
    text: bg.map.homeText,
    link: bg.map.homeLink,
    href: ROUTES.map,
    art: <MapArt id="art-map" />,
  },
];

// "Съмнително обаждане?" → ["Съмнително", "обаждане?"]: the last word gets the halo.
function splitLastWord(text: string): [string, string] {
  const at = text.lastIndexOf(" ");
  return at < 0 ? ["", text] : [text.slice(0, at), text.slice(at + 1)];
}

// A small eyebrow above a section heading (the only all-caps text).
function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow flex items-center gap-3", className)}>{children}</p>;
}

const [titleLead, titleWord] = splitLastWord(bg.app.tagline);

export default function HomePage() {
  return (
    <main className="landing">
      {/* 1. Hero stage */}
      <div className="pt-3 md:pt-4">
        <HeroStage>
          <p className="glass inline-flex min-h-9 items-center gap-2.5 rounded-full py-1 pr-4 pl-1.5 text-[0.8125rem] text-fg-muted sm:text-sm">
            <span aria-hidden="true" className="halo-mark size-6 [--halo-hole:58%]" />
            {t.heroEyebrow}
          </p>
          <h1 id="home-title" className="mt-7 text-display">
            {titleLead} <span className="halo-word">{titleWord}</span>
          </h1>
          <p className="mt-7 max-w-[34ch] text-lg text-fg-muted md:text-xl">{bg.home.problem}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>a]:whitespace-nowrap">
            <ButtonLink href={ROUTES.protected} size="xl">
              {bg.home.startCheck}
            </ButtonLink>
            <ButtonLink href="#how" variant="secondary" size="xl">
              {t.howLink}
            </ButtonLink>
          </div>
          <p className="mt-5 max-w-[40ch] text-sm text-fg-subtle">{bg.home.pairNote}</p>
        </HeroStage>
      </div>

      {/* 2. The one rule: a single statement, nothing else on screen. */}
      <section
        className="shell flex min-h-[80svh] flex-col justify-center py-24 md:py-32"
        aria-labelledby="home-advice-title"
      >
        <Eyebrow>
          <span aria-hidden="true" className="halo-line w-10" />
          {t.oneRuleEyebrow}
        </Eyebrow>
        <RevealWords
          as="h2"
          id="home-advice-title"
          text={t.oneRule}
          className="mt-6 text-display lg:text-[length:clamp(3rem,1rem+8vw,10rem)]"
        />
        <p className="mt-8 max-w-[44ch] text-xl text-fg-muted md:ml-[min(30%,22rem)]">
          {bg.home.advice}
        </p>
      </section>

      {/* 3. How it works: sticky phone + steps (no scroll-jacking). */}
      <section id="how" className="shell pb-24 md:pb-32" aria-labelledby="steps-title">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-6 lg:col-start-7">
            <Eyebrow>{t.howEyebrow}</Eyebrow>
            <h2 id="steps-title" className="mt-4 text-h1">
              {bg.home.stepsTitle}
            </h2>
            <p className="mt-5 max-w-[42ch] text-lg text-fg-muted">{t.howIntro}</p>
          </div>
        </div>
        <HowItWorks
          screens={[
            <ScreenPairing key="pairing" />,
            <ScreenButton key="button" />,
            <ScreenQuestion key="question" />,
            <ScreenVerdict key="verdict" />,
            <ScreenAlert key="alert" />,
          ]}
        />
      </section>

      {/* 4. What Scamly does: the bento. */}
      <section className="shell py-24 md:py-32" aria-labelledby="features-title">
        <div className="mb-12 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow>{t.featuresEyebrow}</Eyebrow>
            <h2 id="features-title" className="mt-4 text-h1">
              {t.featuresTitle}
            </h2>
          </div>
        </div>
        <FeatureGrid />
      </section>

      {/* 5. The six hard rules (D10), straight from the engine's texts. */}
      <section className="py-24 md:py-32" aria-labelledby="rules6-title">
        <div className="shell grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow>{t.hardRulesEyebrow}</Eyebrow>
            <h2 id="rules6-title" className="mt-4 text-h1">
              {t.hardRulesTitle}
            </h2>
          </div>
          <p className="max-w-[36ch] text-lg text-fg-muted lg:col-span-4 lg:col-start-9">
            {t.hardRulesText}
          </p>
        </div>
        <div className="mt-12">
          <RulesDeck labelledBy="rules6-title" />
        </div>
      </section>

      {/* 6. For the family: what they set up, the alert, the call order. */}
      <section
        className="shell grid gap-x-8 gap-y-14 py-24 md:py-32 lg:grid-cols-12"
        aria-labelledby="family-title"
      >
        <div className="lg:col-span-6">
          <Eyebrow>{t.familyEyebrow}</Eyebrow>
          <h2 id="family-title" className="mt-4 text-h1">
            {t.familyTitle}
          </h2>
          <p className="mt-5 max-w-[40ch] text-lg text-fg-muted">{t.familyText}</p>
          <ul className="mt-10">
            {t.familyPoints.map((point, index) => (
              <li
                key={point}
                className="grid max-w-[54ch] grid-cols-[2.5rem_1fr] border-t border-line py-4 text-fg"
              >
                <span aria-hidden="true" className="tabular font-mono text-sm text-fg-subtle">
                  0{index + 1}
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="landing-family-stage lg:col-span-5 lg:col-start-8">
          <FamilyAlert />
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-6">
            <AvatarStack people={[...SAMPLE.familyOrder]} label={t.callOrderLabel} />
            <div>
              <p className="text-sm font-semibold text-fg">{t.callOrderLabel}</p>
              <p className="text-sm text-fg-muted">{t.callOrderHint}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. During a call: the quiet section, porcelain on ink (inverted colours). */}
      <section className="px-3 md:px-4" aria-labelledby="rules-title">
        <div className="landing-ink rounded-xl py-20 md:py-28">
          <div className="shell grid gap-x-8 gap-y-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="landing-ink-eyebrow">{t.duringEyebrow}</p>
              <h2 id="rules-title" className="mt-4 text-h2">
                {bg.home.rulesTitle}
              </h2>
            </div>
            <ol className="lg:col-span-7 lg:col-start-6">
              {bg.home.rules.map((rule, index) => (
                <li key={rule} className="landing-ink-rule">
                  <span aria-hidden="true" className="tabular font-mono text-sm">
                    {index + 1}
                  </span>
                  <p className="font-display text-h2 font-light tracking-[-0.025em]">{rule}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 8. Public tools: image-led cards with our own illustrations. */}
      <section className="shell py-24 md:py-32" aria-labelledby="resources-title">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <Eyebrow>{t.resourcesEyebrow}</Eyebrow>
            <h2 id="resources-title" className="mt-4 text-h1">
              {t.resourcesTitle}
            </h2>
          </div>
          <p className="text-lg text-fg-muted">{t.resourcesText}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          {RESOURCES.map((resource, index) => (
            <article
              key={resource.href}
              className={cn(
                "landing-tool surface-raised group relative flex flex-col overflow-hidden rounded-xl",
                index === 0 ? "md:col-span-2 lg:col-span-7 lg:row-span-2" : "lg:col-span-5",
              )}
            >
              <div
                className={cn(
                  "landing-tool-art m-2 grid flex-1 place-items-center rounded-lg",
                  index === 0
                    ? "min-h-64 lg:min-h-96 [&_.landing-art]:w-[min(100%,40rem)]"
                    : "min-h-52",
                )}
              >
                {resource.art}
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4 p-6 md:p-7">
                <div className="max-w-[44ch]">
                  <h3 className="text-h3">{resource.title}</h3>
                  <p className="mt-2 text-fg-muted">{resource.text}</p>
                </div>
                {/* The link covers the whole card (::after), so the card is one target. */}
                <Link
                  href={resource.href}
                  className="landing-tool-link inline-flex min-h-12 items-center gap-2 rounded-full border border-glass-line bg-glass-2 px-5 font-semibold text-fg no-underline shadow-highlight after:absolute after:inset-0 after:rounded-xl"
                >
                  {resource.link}
                  <ArrowUpRight className="size-5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 9. Questions: native <details>, so they work without JavaScript. */}
      <section
        className="shell grid gap-x-8 gap-y-10 py-24 md:py-32 lg:grid-cols-12"
        aria-labelledby="faq-title"
      >
        <div className="lg:col-span-4">
          <div>
            <Eyebrow>{t.faqEyebrow}</Eyebrow>
            <h2 id="faq-title" className="mt-4 text-h1">
              {t.faqTitle}
            </h2>
          </div>
        </div>
        <div className="landing-faq lg:col-span-7 lg:col-start-6">
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

      {/* 10. Start: a smaller stage with the calm halo. */}
      <div className="pb-16 md:pb-24">
        <Stage
          aria-labelledby="cta-title"
          className="landing-cta"
          field={<HaloFieldLazy state="calm" focus={{ x: 0.88, y: 0.62 }} intensity={0.65} />}
        >
          <div aria-hidden="true" className="landing-hero-scrim" />
          <div className="grid gap-x-8 gap-y-10 px-5 py-16 sm:px-8 md:px-12 md:py-24 lg:grid-cols-12 lg:items-end">
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
