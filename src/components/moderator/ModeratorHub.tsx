// The start page of the moderator area (/moderator, W3-05): one card per job.
// „Схеми на измамите“ opens the script editor; „Сигнали за проверка“ opens the report
// queue (W3-04) and shows how many reports wait (<PendingReportsCard />, which loads
// the number in the browser). The rest is a Server Component (plain HTML).

import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { PendingReportsCard } from "./PendingReportsCard";

export function ModeratorHub() {
  return (
    <>
      <header className="family-heading">
        <h1>{bg.moderator.hubTitle}</h1>
        <p className="muted">{bg.moderator.hubIntro}</p>
      </header>
      <ul className="mod-hub">
        <li className="card mod-hub-card">
          <h2>{bg.moderator.scriptsCardTitle}</h2>
          <p>{bg.moderator.scriptsCardText}</p>
          <Link href={ROUTES.moderatorScripts} className="button button-primary">
            {bg.moderator.scriptsCardLink}
          </Link>
        </li>
        <PendingReportsCard href={ROUTES.moderatorReports} />
      </ul>
    </>
  );
}
