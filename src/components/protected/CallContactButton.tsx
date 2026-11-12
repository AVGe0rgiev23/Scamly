// The big „Обади се на Иван“ button: a tel: link, so one tap starts the phone call.
// Shown on the home screen (if we know the contact) and on the result screen, where
// it is the primary action.

import { Phone } from "lucide-react";
import { fill } from "@/components/family/format";
import { buttonClass, type ButtonVariant } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";
import type { CallContactDto } from "@/schemas/checks";
import { telLink } from "./callContact";

export function CallContactButton({
  contact,
  variant = "primary",
}: {
  contact: CallContactDto;
  variant?: ButtonVariant;
}) {
  return (
    <a className={buttonClass(variant, "xl", "w-full")} href={telLink(contact.phone)}>
      <Phone className="size-6 shrink-0" aria-hidden="true" />
      {fill(bg.protectedCheck.callContact, { name: contact.displayName })}
    </a>
  );
}
