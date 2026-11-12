// The home screen of the older person's phone: ONE giant button „Обаждат ми се за
// пари!“, a smaller button for a call that has already ended, and „Обади се на …“
// if we already know who to call. Pressing a button starts the check (the family
// is alerted at once) and opens the first question.

import { PhoneIncoming } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SignalLine } from "@/components/ui/SignalLine";
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
      <h1 className="sr-only">{bg.protectedCheck.title}</h1>
      {/* The one thing on this screen: at least a third of the phone's height. */}
      <button
        type="button"
        className="pressable flex min-h-[38svh] w-full cursor-pointer flex-col items-start justify-between gap-6 rounded-lg border border-accent bg-accent p-6 text-left font-display text-h1 font-bold text-on-accent hover:bg-accent-hover"
        onClick={() => onStart(false)}
      >
        <PhoneIncoming className="size-12" aria-hidden="true" />
        <span>{bg.protectedCheck.bigButton}</span>
      </button>
      <SignalLine state="idle" className="h-4 text-line-strong" />
      <Button variant="secondary" size="xl" onClick={() => onStart(true)}>
        {bg.protectedCheck.afterCall}
      </Button>
      {contact === null ? null : <CallContactButton contact={contact} variant="secondary" />}
    </>
  );
}
