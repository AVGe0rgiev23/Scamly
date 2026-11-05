// The content of /family/new: a back link, the heading and the form.
// A Server Component; only the form inside it runs in the browser.
// Also used by the test preview page /dev/family/new.

import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { Card } from "@/components/ui/Card";
import { bg } from "@/i18n/bg";
import { CreatePersonForm } from "./CreatePersonForm";

export function CreatePersonPage() {
  return (
    <>
      <Link href={ROUTES.family} className="family-back">
        ← {bg.family.backToList}
      </Link>
      <header className="family-heading">
        <h1>{bg.family.createTitle}</h1>
        <p className="muted">{bg.family.createIntro}</p>
      </header>
      <Card>
        <CreatePersonForm />
      </Card>
    </>
  );
}
