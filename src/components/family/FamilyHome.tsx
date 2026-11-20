// The content of /family: the page head (a small eyebrow, the title, one sentence,
// „Добави човек“ as the one primary action and a quiet link to the alerts), the
// people as rich cards, then the „Известия на телефона“ banner (W2-05) and, when the
// browser offers it, „Инсталирай Scamly“ (W2-09).
// A Server Component (plain HTML); only <PeopleList />, <InstallPrompt /> and
// <PushOptIn /> inside it run in the browser.
// Also used by the test preview page /dev/family (tests/e2e/family.spec.ts).

import { BellRing, Plus } from "lucide-react";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { FamilyHeader } from "./FamilyFrame";
import { PeopleList } from "./PeopleList";
import { PushOptIn } from "./PushOptIn";

export function FamilyHome() {
  return (
    <>
      <FamilyHeader
        eyebrow={bg.family.homeEyebrow}
        title={bg.family.listTitle}
        intro={bg.family.listIntro}
        actions={
          <>
            <ButtonLink href={`${ROUTES.family}/new`}>
              <Plus className="size-5" aria-hidden="true" />
              {bg.family.addPerson}
            </ButtonLink>
            <ButtonLink href={ROUTES.familyAlerts} variant="secondary">
              <BellRing className="size-5" aria-hidden="true" />
              {bg.family.toAlerts}
            </ButtonLink>
          </>
        }
      />
      <PeopleList />
      <div className="mt-12 flex flex-col gap-6 md:mt-16">
        <PushOptIn />
        {/* ios={false}: on an iPhone the push banner above already shows the same steps. */}
        <InstallPrompt ios={false} />
      </div>
    </>
  );
}
