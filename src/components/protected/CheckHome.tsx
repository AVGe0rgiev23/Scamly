// The home screen of the older person's phone: ONE giant button „Обаждат ми се за
// пари!“, a smaller button for a call that has already ended, and „Обади се на …“
// if we already know who to call. Pressing a button starts the check (the family
// is alerted at once) and opens the first question.

import { Button } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";
import type { CallContactDto } from "@/schemas/checks";
import { CallContactButton } from "./CallContactButton";

type CheckHomeProps = {
  contact: CallContactDto | null;
  onStart: (afterCall: boolean) => void;
};

export function CheckHome({ contact, onStart }: CheckHomeProps) {
  return (
    <>
      {/* sr-only: the heading is read aloud; on screen the big button says it all. */}
      <h1 className="sr-only">{bg.protectedCheck.title}</h1>
      <button type="button" className="check-big-button" onClick={() => onStart(false)}>
        {bg.protectedCheck.bigButton}
      </button>
      <Button variant="secondary" onClick={() => onStart(true)}>
        {bg.protectedCheck.afterCall}
      </Button>
      {contact === null ? null : <CallContactButton contact={contact} />}
    </>
  );
}
