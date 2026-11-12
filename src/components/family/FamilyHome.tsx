// The content of /family: the heading with the one primary action „Добави човек“,
// the people as a list of rows, and next to it (below it on a phone) two quiet
// panels: „Известия на телефона“ (W2-05) and „Инсталирай Scamly“ (W2-09).
// A Server Component (plain HTML); only <PeopleList />, <InstallPrompt /> and
// <PushOptIn /> inside it run in the browser.
// Also used by the test preview page /dev/family (tests/e2e/family.spec.ts).

import { Plus } from "lucide-react";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { PeopleList } from "./PeopleList";
import { PushOptIn } from "./PushOptIn";

export function FamilyHome() {
  return (
    <>
      <header className="mb-10 max-w-[60ch]">
        <h1 className="text-h1">{bg.family.listTitle}</h1>
        <p className="mt-4 text-lg text-fg-muted">{bg.family.listIntro}</p>
        <div className="mt-6">
          <ButtonLink href={`${ROUTES.family}/new`}>
            <Plus className="size-5" aria-hidden="true" />
            {bg.family.addPerson}
          </ButtonLink>
        </div>
      </header>
      <div className="grid gap-x-6 gap-y-10 md:grid-cols-12">
        <div className="md:col-span-7">
          <PeopleList />
        </div>
        <div className="flex flex-col gap-6 md:col-span-4 md:col-start-9">
          <PushOptIn />
          {/* ios={false}: on an iPhone the push card above already shows the same steps. */}
          <InstallPrompt ios={false} />
        </div>
      </div>
    </>
  );
}
