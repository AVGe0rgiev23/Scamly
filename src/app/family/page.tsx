// /family: the family member's start page, the list of the people they protect.
// The role guard is in layout.tsx; the list itself is loaded from our API in the
// browser (src/components/family/PeopleList.tsx).

import { FamilyHome } from "@/components/family/FamilyHome";

import { HelpLink } from "@/components/help/RoleHelp";

export default function FamilyPage() {
  return (
    <>
      <FamilyHome />
      <p className="mt-16 border-t border-line pt-6">
        <HelpLink role="family" />
      </p>
    </>
  );
}
