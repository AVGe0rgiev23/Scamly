// The big „Обади се на Иван“ button: a tel: link, so one tap starts the phone call.
// Shown on the home screen (if we know the contact) and on the result screen, where
// it is the primary action: there (`hero`) it is a white/ink pill at least 72 px
// high, with the phone in a disc of the verdict's colour (protected.css .check-call).

import { Phone } from "lucide-react";
import { fill } from "@/components/family/format";
import { buttonClass, type ButtonVariant } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { bg } from "@/i18n/bg";
import type { CallContactDto } from "@/schemas/checks";
import { telLink } from "./callContact";

export function CallContactButton({
  contact,
  variant = "primary",
  hero = false,
}: {
  contact: CallContactDto;
  variant?: ButtonVariant;
  hero?: boolean;
}) {
  return (
    <a
      className={buttonClass(variant, "xl", cn("w-full", hero && "check-call"))}
      href={telLink(contact.phone)}
    >
      {hero ? (
        <span className="check-call-disc" aria-hidden="true">
          <Phone className="size-6 shrink-0" />
        </span>
      ) : (
        <Phone className="size-6 shrink-0" aria-hidden="true" />
      )}
      {hero ? (
        // Wider screens: the words sit in the middle of the pill.
        <span className="flex-1 sm:pr-14 sm:text-center">
          {fill(bg.protectedCheck.callContact, { name: contact.displayName })}
        </span>
      ) : (
        fill(bg.protectedCheck.callContact, { name: contact.displayName })
      )}
    </a>
  );
}
