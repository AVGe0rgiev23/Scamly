// The home page ("/"): what Scamly is for, shown with the product itself.
//
//   1. Hero: the question „Съмнително обаждане?“, the start button and a live demo
//      that runs the real detection engine on sample calls.
//   2. The one rule to remember („Затворете телефона“).
//   3. How it works: the 3 steps.
//   4. What Scamly does: a grid of small example screens.
//   5. The six hard rules that always mean "scam".
//   6. For the family: what a relative sets up and what an alert looks like.
//   7. What to do during a suspicious call (three rules).
//   8. The public tools: education cards, report form, scam map.
//   9. Questions and answers.
//  10. Start: register, pair a phone, log in. Plus the „Инсталирай Scamly“ card.
//
// A Server Component; all text comes from src/i18n/bg.ts and the example content
// from src/content/placeholders.ts. Nothing here is a statistic or a quote.

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { CallDemo } from "@/components/landing/CallDemo";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ButtonLink } from "@/components/ui/Button";
import { SignalLine } from "@/components/ui/SignalLine";
import { ROUTES } from "@/config/routes";
import { SAMPLE } from "@/content/placeholders";
import { HARD_RULE_IDS } from "@/engine";
import { bg } from "@/i18n/bg";

const t = bg.landing;

// The three public tools, each with its title, one sentence and where it leads.
const RESOURCES = [
  {
    title: bg.education.homeTitle,
    text: bg.education.homeText,
    link: bg.education.homeLink,
    href: ROUTES.education,
  },
  {
    title: bg.reportForm.homeTitle,
    text: bg.reportForm.homeText,
    link: bg.reportForm.homeLink,
    href: ROUTES.report,
  },
  { title: bg.map.homeTitle, text: bg.map.homeText, link: bg.map.homeLink, href: ROUTES.map },
];

const SECTION = "border-t border-line py-16 md:py-24";

export default function HomePage() {
  return (
    <main>
      {/* 1. Hero */}
      <section
        className="shell grid gap-x-6 gap-y-12 pt-10 pb-16 md:pt-16 lg:grid-cols-12 lg:pb-24"
        aria-labelledby="home-title"
      >
        <div className="lg:col-span-5 lg:pt-8">
          <h1 id="home-title" className="text-display">
            {bg.app.tagline}
          </h1>
          <p className="mt-6 max-w-[40ch] text-lg text-fg-muted">{bg.home.problem}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap [&>a]:whitespace-nowrap">
            <ButtonLink href={ROUTES.protected} size="xl">
              {bg.home.startCheck}
            </ButtonLink>
            <ButtonLink href="#how" variant="ghost" size="xl">
              {t.howLink}
            </ButtonLink>
          </div>
          <p className="mt-4 max-w-[40ch] text-sm text-fg-subtle">{bg.home.pairNote}</p>
        </div>
        <div className="lg:col-span-7">
          <CallDemo />
        </div>
      </section>

      {/* 2. The one rule */}
      <aside className="border-y border-line bg-surface-1" aria-labelledby="home-advice-title">
        <div className="shell grid gap-x-6 gap-y-4 py-10 lg:grid-cols-12 lg:items-center">
          <h2 id="home-advice-title" className="text-h2 lg:col-span-5">
            {bg.home.adviceTitle}
          </h2>
          <p className="max-w-[48ch] text-lg text-fg-muted lg:col-span-6 lg:col-start-7">
            {bg.home.advice}
          </p>
        </div>
      </aside>

      {/* 3. How it works. An ordered list: screen readers announce "1 of 3". */}
      <section id="how" className="shell py-16 md:py-24" aria-labelledby="steps-title">
        <h2 id="steps-title" className="text-h2">
          {bg.home.stepsTitle}
        </h2>
        <ol className="mt-10 grid gap-x-6 md:grid-cols-3">
          {bg.home.steps.map((step, index) => (
            <li key={step.title} className="border-t border-line-strong py-6">
              <span className="tabular font-mono text-sm text-accent" aria-hidden="true">
                0{index + 1}
              </span>
              <h3 className="mt-3 text-h3">{step.title}</h3>
              <p className="mt-2 max-w-[40ch] text-fg-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 4. Features */}
      <section className={`shell ${SECTION}`} aria-labelledby="features-title">
        <h2 id="features-title" className="mb-10 text-h2">
          {t.featuresTitle}
        </h2>
        <FeatureGrid />
      </section>

      {/* 5. The six hard rules (D10): name and explanation, straight from the engine's texts. */}
      <section
        className={`shell grid gap-x-6 gap-y-8 lg:grid-cols-12 ${SECTION}`}
        aria-labelledby="rules6-title"
      >
        <div className="lg:col-span-4">
          <h2 id="rules6-title" className="text-h2">
            {t.hardRulesTitle}
          </h2>
          <p className="mt-4 max-w-[36ch] text-fg-muted">{t.hardRulesText}</p>
          <SignalLine state="alert" className="mt-8 h-10 max-w-64" />
        </div>
        <dl className="lg:col-span-7 lg:col-start-6">
          {HARD_RULE_IDS.map((id) => (
            <div
              key={id}
              className="grid gap-x-6 gap-y-1 border-t border-line py-5 sm:grid-cols-[14rem_1fr]"
            >
              <dt className="font-display text-lg font-bold text-fg">
                {bg.engine.hardRules[id].name}
              </dt>
              <dd className="text-fg-muted">{bg.engine.hardRules[id].explanation}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 6. For the family */}
      <section
        className={`shell grid gap-x-6 gap-y-10 lg:grid-cols-12 ${SECTION}`}
        aria-labelledby="family-title"
      >
        <div className="lg:col-span-6">
          <h2 id="family-title" className="text-h2">
            {t.familyTitle}
          </h2>
          <p className="mt-4 max-w-[44ch] text-lg text-fg-muted">{t.familyText}</p>
          <ul className="mt-8">
            {t.familyPoints.map((point) => (
              <li key={point} className="max-w-[52ch] border-t border-line py-4 text-fg">
                {point}
              </li>
            ))}
          </ul>
        </div>
        {/* A sample alert as a timeline: it IS a sequence, so it is numbered by time. */}
        <div className="lg:col-span-5 lg:col-start-8">
          <div className="rounded-lg border border-line bg-surface-1 p-5 md:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-sans text-base font-semibold tracking-normal">
                {t.timelineTitle}
              </h3>
              <p className="text-xs text-fg-subtle">{t.sampleScreen}</p>
            </div>
            <p className="mt-4 font-display text-xl font-bold">{SAMPLE.protectedName}</p>
            <ol className="mt-4">
              {t.timeline.map((event, index) => (
                <li
                  key={event}
                  className="grid grid-cols-[5.5rem_1fr] gap-3 border-t border-line py-3 text-sm"
                >
                  <span className="tabular font-mono text-fg-subtle">
                    {SAMPLE.timelineTimes[index]}
                  </span>
                  <span className="text-fg">{event}</span>
                </li>
              ))}
            </ol>
            <SignalLine state="calm" className="mt-4 h-6" />
          </div>
        </div>
      </section>

      {/* 7. Three rules to remember */}
      <section
        className={`shell grid gap-x-6 gap-y-8 lg:grid-cols-12 ${SECTION}`}
        aria-labelledby="rules-title"
      >
        <h2 id="rules-title" className="text-h2 lg:col-span-5">
          {bg.home.rulesTitle}
        </h2>
        <ul className="lg:col-span-6 lg:col-start-7">
          {bg.home.rules.map((rule) => (
            <li key={rule} className="border-t border-line py-5 font-display text-h3 font-bold">
              {rule}
            </li>
          ))}
        </ul>
      </section>

      {/* 8. Public tools: big link rows, not cards. */}
      <section className={`shell ${SECTION}`} aria-labelledby="resources-title">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="resources-title" className="text-h2">
            {t.resourcesTitle}
          </h2>
          <p className="text-fg-muted">{t.resourcesText}</p>
        </div>
        {RESOURCES.map((resource) => (
          <article
            key={resource.href}
            className="grid gap-x-6 gap-y-3 border-t border-line py-6 lg:grid-cols-12 lg:items-center"
          >
            <h3 className="text-h3 lg:col-span-4">{resource.title}</h3>
            <p className="max-w-[52ch] text-fg-muted lg:col-span-5">{resource.text}</p>
            <p className="lg:col-span-3 md:justify-self-end">
              <ButtonLink href={resource.href} variant="secondary">
                {resource.link}
                <ArrowUpRight className="size-5" aria-hidden="true" />
              </ButtonLink>
            </p>
          </article>
        ))}
      </section>

      {/* 9. Questions: native <details>, so they work without JavaScript. */}
      <section
        className={`shell grid gap-x-6 gap-y-8 lg:grid-cols-12 ${SECTION}`}
        aria-labelledby="faq-title"
      >
        <h2 id="faq-title" className="text-h2 lg:col-span-4">
          {t.faqTitle}
        </h2>
        <div className="lg:col-span-7 lg:col-start-6">
          {t.faq.map((item) => (
            <details key={item.question} className="group border-t border-line">
              <summary className="flex min-h-16 list-none items-center justify-between gap-4 py-3 font-display text-lg font-bold [&::-webkit-details-marker]:hidden">
                {item.question}
                <span
                  className="font-mono text-xl font-normal text-fg-subtle group-open:hidden"
                  aria-hidden="true"
                >
                  +
                </span>
                <span
                  className="hidden font-mono text-xl font-normal text-fg-subtle group-open:inline"
                  aria-hidden="true"
                >
                  −
                </span>
              </summary>
              <p className="max-w-[60ch] pb-6 text-fg-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 10. Start */}
      <section className="border-y border-line bg-surface-1" aria-labelledby="cta-title">
        <div className="shell grid gap-x-6 gap-y-8 py-16 lg:grid-cols-12 lg:items-end md:py-20">
          <div className="lg:col-span-6">
            <h2 id="cta-title" className="text-h2">
              {t.ctaTitle}
            </h2>
            <p className="mt-4 max-w-[44ch] text-lg text-fg-muted">{t.ctaText}</p>
          </div>
          <nav
            aria-label={bg.home.setupLinks}
            className="flex flex-col gap-3 sm:flex-row lg:col-span-6 lg:justify-end"
          >
            <ButtonLink href={ROUTES.register} size="lg">
              {bg.home.register}
            </ButtonLink>
            <ButtonLink href={ROUTES.pair} variant="secondary" size="lg">
              {bg.home.pair}
            </ButtonLink>
            <Link
              href={ROUTES.login}
              className="flex min-h-14 items-center justify-center px-4 text-lg font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent"
            >
              {bg.home.login}
            </Link>
          </nav>
        </div>
      </section>

      {/* „Инсталирай Scamly“: only appears when this phone can install the app (W2-09). */}
      <div className="shell pt-12">
        <InstallPrompt />
      </div>
    </main>
  );
}
