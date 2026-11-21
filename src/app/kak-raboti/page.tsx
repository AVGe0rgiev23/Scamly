// /kak-raboti: the public education page „Как работи измамата“ (W3-05, brief 5.2 E).
// Anyone, no login. A short intro and one card per PUBLISHED scam card (a bento grid,
// Ореол v3; the look is described in ScriptList.tsx and education.css).
//
// The heading and intro are static (pre-rendered at `next build`); the cards are read
// from the database at request time (connection() inside <Suspense>), with the
// cookie-less public client. So a moderator's change shows on the next page load and
// nothing is frozen on the day of the deploy. The address is Bulgarian in Latin
// letters, because people type it (Q12).

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EducationFrame, EducationIntro } from "@/components/education/EducationIntro";
import { ListLoading } from "@/components/education/Loading";
import { ScriptList, ScriptsUnavailable } from "@/components/education/ScriptList";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { createEducationDeps, loadEducationList } from "@/server/services/educationService";

export const metadata: Metadata = {
  title: `${bg.education.title} | ${bg.app.name}`,
  description: bg.education.intro,
};

export default function EducationPage() {
  return (
    <EducationFrame>
      <EducationIntro />
      <section aria-labelledby="edu-list-title">
        <h2 id="edu-list-title" className="edu-section-title">
          {bg.education.listTitle}
        </h2>
        <Suspense fallback={<ListLoading />}>
          <PublishedCards />
        </Suspense>
      </section>
    </EducationFrame>
  );
}

// The cards, read at request time.
async function PublishedCards() {
  await connection();
  const scripts = await loadEducationList(createEducationDeps());
  if (scripts === null) {
    return <ScriptsUnavailable />;
  }
  return <ScriptList scripts={scripts} hrefFor={(slug) => `${ROUTES.education}/${slug}`} />;
}
