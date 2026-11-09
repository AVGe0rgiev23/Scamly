// The start page of the moderator area (/moderator, W3-05): one card per job.
// „Схеми на измамите“ opens the script editor; the report queue comes with W3-04 and
// is shown as „скоро“, with no link and no fake buttons.
// A Server Component (plain HTML).

import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

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
        <li className="card mod-hub-card mod-hub-soon">
          <h2>
            {bg.moderator.queueCardTitle} <span className="mod-badge">{bg.moderator.soon}</span>
          </h2>
          <p>{bg.moderator.queueCardText}</p>
        </li>
      </ul>
    </>
  );
}
