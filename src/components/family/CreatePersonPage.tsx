// The content of /family/new: a back link, the page head and the stepped form with
// the live fridge-card preview next to it (Redesign v3 Phase 4, CreatePersonForm).
// A Server Component; only the form inside it runs in the browser.
// Also used by the test preview page /dev/family/new.

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { CreatePersonForm } from "./CreatePersonForm";
import { FamilyHeader } from "./FamilyFrame";

// The class of the „Към списъка с хората“ link (also used by PersonDashboard).
export const BACK_LINK =
  "family-back mb-6 inline-flex min-h-12 items-center gap-2 font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline";

export function CreatePersonPage() {
  return (
    <>
      <Link href={ROUTES.family} className={BACK_LINK}>
        <ArrowLeft className="size-5" aria-hidden="true" />
        {bg.family.backToList}
      </Link>
      <FamilyHeader
        eyebrow={bg.family.homeEyebrow}
        title={bg.family.createTitle}
        intro={bg.family.createIntro}
      />
      <CreatePersonForm />
    </>
  );
}
