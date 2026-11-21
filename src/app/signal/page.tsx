// /signal: the public report form „Подай сигнал за измама“ (W3-02, BUILD_PLAN #27).
// Anyone, no login. A short intro (anonymous, what is shown publicly, a moderator
// checks every report, no names or addresses) and the form, which sends
// POST /api/reports in the browser. The address is „сигнал“ in Latin letters (Q12).
// A Server Component: the static intro is pre-rendered at `next build`; only the
// form (ReportForm) runs in the browser.
// Look (Ореол v3, report.css): a soft aurora behind the page head (eyebrow, title,
// lead); the form on a raised panel in one column; the privacy points as a glass
// panel with a shield at the right on a desktop, above the form on a phone.

import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { ReportForm } from "@/components/report/ReportForm";
import { bg } from "@/i18n/bg";
import "@/components/report/report.css";

export const metadata: Metadata = {
  title: `${bg.reportForm.title} | ${bg.app.name}`,
  description: bg.reportForm.lead,
};

export default function ReportPage() {
  return (
    <main className="report shell py-10 md:py-16">
      <div className="report-aurora" aria-hidden="true" />
      <header className="report-head">
        <p className="eyebrow report-eyebrow">{bg.reportForm.eyebrow}</p>
        <h1 className="text-h1">{bg.reportForm.title}</h1>
        <p className="mt-4 max-w-[52ch] text-lg text-fg-muted">{bg.reportForm.lead}</p>
      </header>
      {/* The privacy points come first in the page (screen readers hear them before
          the form); on a desktop the CSS places them in the right column. */}
      <div className="report-layout">
        <section aria-labelledby="report-privacy-title" className="report-privacy glass">
          <span className="report-shield" aria-hidden="true">
            <ShieldCheck className="size-6" />
          </span>
          <h2 id="report-privacy-title" className="mt-5 font-display text-h3 font-semibold">
            {bg.reportForm.privacyTitle}
          </h2>
          <ul className="report-privacy-list">
            {bg.reportForm.privacy.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
        <div className="report-main">
          <ReportForm />
        </div>
      </div>
    </main>
  );
}
