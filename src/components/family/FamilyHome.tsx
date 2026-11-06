// The content of /family: the heading, the „Добави човек“ button, the list, the
// „Инсталирай Scamly“ card (W2-09) and the „Известия на телефона“ card (W2-05).
// A Server Component (plain HTML); only <PeopleList />, <InstallPrompt /> and
// <PushOptIn /> inside it run in the browser.
// Also used by the test preview page /dev/family (tests/e2e/family.spec.ts).

import Link from "next/link";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { PeopleList } from "./PeopleList";
import { PushOptIn } from "./PushOptIn";

export function FamilyHome() {
  return (
    <>
      <header className="family-heading">
        <h1>{bg.family.listTitle}</h1>
        <p className="muted">{bg.family.listIntro}</p>
        <div>
          <Link href={`${ROUTES.family}/new`} className="button button-primary">
            {bg.family.addPerson}
          </Link>
        </div>
      </header>
      <PeopleList />
      {/* ios={false}: on an iPhone the push card below already shows the same steps. */}
      <InstallPrompt ios={false} />
      <PushOptIn />
    </>
  );
}
