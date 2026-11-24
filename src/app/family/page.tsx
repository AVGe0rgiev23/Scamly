// /family: the family member's start page, the list of the people they protect.
// The role guard is in layout.tsx; the list itself is loaded from our API in the
// browser (src/components/family/PeopleList.tsx).

import Link from "next/link";
import { FamilyHome } from "@/components/family/FamilyHome";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

import { HelpLink } from "@/components/help/RoleHelp";

export default function FamilyPage() {
  return (
    <>
      <FamilyHome />
      <div className="mt-16 flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <HelpLink role="family" />
        <Link href={ROUTES.familyData} className="underline underline-offset-4">
          {bg.accountData.title}
        </Link>
      </div>
    </>
  );
}
