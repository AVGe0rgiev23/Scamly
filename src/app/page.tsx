// The home page ("/"): what Scamly is for, the 3 steps, the start buttons and three
// rules to remember, a link to the education cards „Как работи измамата“ (W3-05),
// a link to the report form „Подай сигнал“ (W3-02), a link to the scam map (W3-03), plus the „Инсталирай Scamly“ card (W2-09, a Client Component).
// A Server Component; all text comes from src/i18n/bg.ts.

import Link from "next/link";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

const signal = [
  5, 7, 10, 16, 25, 33, 20, 14, 9, 12, 24, 43, 68, 90, 75, 52, 35, 18, 11, 8, 13, 22, 35, 25, 15, 8,
  11, 6, 5,
];

export default function HomePage() {
  return (
    <main className="home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-intro">
          <p className="home-eyebrow">{bg.home.eyebrow}</p>
          <h1 id="home-title">{bg.app.tagline}</h1>
          <p className="home-lead">{bg.home.problem}</p>
          <div className="home-actions">
            <Link href={ROUTES.protected} className="button button-primary">
              {bg.home.startCheck}
              <span aria-hidden="true"> →</span>
            </Link>
          </div>
          <p className="muted">{bg.home.pairNote}</p>
        </div>
        <div className="home-signal" aria-hidden="true">
          <div className="home-wave">
            {signal.map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
      </section>

      <aside className="home-advice" aria-labelledby="home-advice-title">
        <h2 id="home-advice-title">{bg.home.adviceTitle}</h2>
        <p>{bg.home.advice}</p>
      </aside>

      {/* „Инсталирай Scamly“: only appears when this phone can install the app (W2-09). */}
      <InstallPrompt />

      <section className="home-section" aria-labelledby="steps-title">
        <h2 id="steps-title">{bg.home.stepsTitle}</h2>
        {/* An ordered list (<ol>): screen readers announce "1 of 3" and so on. */}
        <ol className="home-steps">
          {bg.home.steps.map((step, index) => (
            <li key={step.title} className="home-step">
              <span className="home-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <nav className="home-actions" aria-label={bg.home.setupLinks}>
        <Link href={ROUTES.pair} className="home-login">
          {bg.home.pair}
        </Link>
        <Link href={ROUTES.register} className="home-login">
          {bg.home.register}
        </Link>
        <Link href={ROUTES.login} className="home-login">
          {bg.home.login}
        </Link>
      </nav>

      <section className="card home-rules" aria-labelledby="rules-title">
        <h2 id="rules-title">{bg.home.rulesTitle}</h2>
        <ul>
          {bg.home.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <div className="home-resources">
        {/* The education cards (W3-05): how the four common scams work. */}
        <section className="home-education" aria-labelledby="education-title">
          <h2 id="education-title">{bg.education.homeTitle}</h2>
          <p>{bg.education.homeText}</p>
          <Link href={ROUTES.education} className="button button-secondary">
            {bg.education.homeLink}
          </Link>
        </section>

        {/* The public report form (W3-02): anyone can report a scam call, no login. */}
        <section className="home-education" aria-labelledby="report-title">
          <h2 id="report-title">{bg.reportForm.homeTitle}</h2>
          <p>{bg.reportForm.homeText}</p>
          <Link href={ROUTES.report} className="button button-secondary">
            {bg.reportForm.homeLink}
          </Link>
        </section>

        {/* The public scam map (W3-03): approved reports per district, scam waves. */}
        <section className="home-education" aria-labelledby="map-title">
          <h2 id="map-title">{bg.map.homeTitle}</h2>
          <p>{bg.map.homeText}</p>
          <Link href={ROUTES.map} className="button button-secondary">
            {bg.map.homeLink}
          </Link>
        </section>
      </div>
    </main>
  );
}
