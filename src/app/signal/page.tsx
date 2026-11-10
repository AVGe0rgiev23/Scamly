// /signal: the public report form „Подай сигнал за измама“ (W3-02, BUILD_PLAN #27).
// Anyone, no login. A short intro (anonymous, what is shown publicly, a moderator
// checks every report, no names or addresses) and the form, which sends
// POST /api/reports in the browser. The address is „сигнал“ in Latin letters (Q12).
// A Server Component: the static intro is pre-rendered at `next build`; only the
// form (ReportForm) runs in the browser.

import type { Metadata } from "next";
import { ReportForm } from "@/components/report/ReportForm";
import { bg } from "@/i18n/bg";

export const metadata: Metadata = {
  title: `${bg.reportForm.title} | ${bg.app.name}`,
  description: bg.reportForm.lead,
};

export default function ReportPage() {
  return (
    <main className="report">
      <header className="report-intro">
        <h1>{bg.reportForm.title}</h1>
        <p className="report-lead">{bg.reportForm.lead}</p>
      </header>
      <section className="card report-privacy" aria-labelledby="report-privacy-title">
        <h2 id="report-privacy-title">{bg.reportForm.privacyTitle}</h2>
        <ul>
          {bg.reportForm.privacy.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>
      <ReportForm />
    </main>
  );
}
