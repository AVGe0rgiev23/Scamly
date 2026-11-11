// /moderator: the moderator's start page (W3-05): a card for the scam-script editor
// and a card for the report queue with the pending count (W3-04). The role guard is
// in layout.tsx.

import { ModeratorHub } from "@/components/moderator/ModeratorHub";

import { HelpLink } from "@/components/help/RoleHelp";

export default function ModeratorPage() {
  return (
    <>
      <ModeratorHub />
      <p>
        <HelpLink role="moderator" />
      </p>
    </>
  );
}
