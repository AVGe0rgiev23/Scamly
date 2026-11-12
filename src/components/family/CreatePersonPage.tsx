// The content of /family/new: a back link, the heading and the form (one column,
// 32 rem wide at most, left-aligned).
// A Server Component; only the form inside it runs in the browser.
// Also used by the test preview page /dev/family/new.

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { CreatePersonForm } from "./CreatePersonForm";

// The class of the „Към списъка с хората“ link (also used by PersonDashboard).
export const BACK_LINK =
  "mb-6 inline-flex min-h-12 items-center gap-2 font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline";

export function CreatePersonPage() {
  return (
    <>
      <Link href={ROUTES.family} className={BACK_LINK}>
        <ArrowLeft className="size-5" aria-hidden="true" />
        {bg.family.backToList}
      </Link>
      <header className="mb-10 max-w-[60ch]">
        <h1 className="text-h1">{bg.family.createTitle}</h1>
        <p className="mt-4 text-lg text-fg-muted">{bg.family.createIntro}</p>
      </header>
      <div className="max-w-lg border-t border-line pt-8">
        <CreatePersonForm />
      </div>
    </>
  );
}
