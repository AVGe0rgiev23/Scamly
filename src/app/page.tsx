// The home page ("/"): what Scamly is for, the 3 steps, the start buttons and three
// rules to remember, a link to the education cards „Как работи измамата“ (W3-05),
// a link to the report form „Подай сигнал“ (W3-02), plus the „Инсталирай Scamly“ card (W2-09, a Client Component).
// A Server Component; all text comes from src/i18n/bg.ts.

import Link from "next/link";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export default function HomePage() {
  return (
    <main className="home">
      <section className="home-hero" aria-labelledby="home-title">
        <p className="home-eyebrow">{bg.home.eyebrow}</p>
        <h1 id="home-title">{bg.app.tagline}</h1>
        <p className="home-lead">{bg.home.problem}</p>
        {/* Links that look like our big buttons: they open another page. */}
        <div className="home-actions">
          <Link href={ROUTES.register} className="button button-primary">
            {bg.home.register}
          </Link>
          <Link href={ROUTES.pair} className="button button-primary">
            {bg.home.pair}
          </Link>
          <Link href={ROUTES.login} className="button button-secondary">
            {bg.home.login}
          </Link>
        </div>
        <p className="muted">{bg.home.pairNote}</p>
      </section>

      {/* „Инсталирай Scamly“: only appears when this phone can install the app (W2-09). */}
      <InstallPrompt />

      <section className="home-section" aria-labelledby="steps-title">
        <h2 id="steps-title">{bg.home.stepsTitle}</h2>
        {/* An ordered list (<ol>): screen readers announce "1 of 3" and so on. */}
        <ol className="home-steps">
          {bg.home.steps.map((step, index) => (
            <li key={step.title} className="card home-step">
              <span className="home-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card home-rules" aria-labelledby="rules-title">
        <h2 id="rules-title">{bg.home.rulesTitle}</h2>
        <ul>
          {bg.home.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      {/* The education cards (W3-05): how the four common scams work. */}
      <section className="card home-education" aria-labelledby="education-title">
        <h2 id="education-title">{bg.education.homeTitle}</h2>
        <p>{bg.education.homeText}</p>
        <Link href={ROUTES.education} className="button button-secondary">
          {bg.education.homeLink}
        </Link>
      </section>

      {/* The public report form (W3-02): anyone can report a scam call, no login. */}
      <section className="card home-education" aria-labelledby="report-title">
        <h2 id="report-title">{bg.reportForm.homeTitle}</h2>
        <p>{bg.reportForm.homeText}</p>
        <Link href={ROUTES.report} className="button button-secondary">
          {bg.reportForm.homeLink}
        </Link>
      </section>
    </main>
  );
}
