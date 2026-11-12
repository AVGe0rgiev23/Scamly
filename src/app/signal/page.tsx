// /signal: the public report form „Подай сигнал за измама“ (W3-02, BUILD_PLAN #27).
// Anyone, no login. A short intro (anonymous, what is shown publicly, a moderator
// checks every report, no names or addresses) and the form, which sends
// POST /api/reports in the browser. The address is „сигнал“ in Latin letters (Q12).
// A Server Component: the static intro is pre-rendered at `next build`; only the
// form (ReportForm) runs in the browser. Look: the form in the left seven columns,
// the privacy points as a bordered aside at the right (first on a phone).

import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { ReportForm } from "@/components/report/ReportForm";
import { bg } from "@/i18n/bg";

export const metadata: Metadata = {
  title: `${bg.reportForm.title} | ${bg.app.name}`,
  description: bg.reportForm.lead,
};

export default function ReportPage() {
  return (
    <main className="shell py-10 md:py-16">
      <header className="mb-10 max-w-[60ch] md:mb-14">
        <h1 className="text-h1">{bg.reportForm.title}</h1>
        <p className="mt-4 text-lg text-fg-muted">{bg.reportForm.lead}</p>
      </header>
      <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-6">
        {/* Phone: the privacy points come first; desktop: an aside at the right. */}
        <section
          aria-labelledby="report-privacy-title"
          className="self-start rounded-lg border border-line p-5 md:col-span-4 md:col-start-9 md:row-start-1 md:p-6"
        >
          <h2 id="report-privacy-title" className="flex items-center gap-2 text-h3">
            <ShieldCheck className="size-6 shrink-0 text-info-fg" aria-hidden="true" />
            {bg.reportForm.privacyTitle}
          </h2>
          <ul className="mt-4 flex flex-col">
            {bg.reportForm.privacy.map((point) => (
              <li key={point} className="border-t border-line py-3 text-fg-muted">
                {point}
              </li>
            ))}
          </ul>
        </section>
        <div className="md:col-span-7 md:col-start-1 md:row-start-1">
          <ReportForm />
        </div>
      </div>
    </main>
  );
}
