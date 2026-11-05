// The big „Обади се на Иван“ button: a tel: link, so one tap starts the phone call.
// Shown on the home screen (if we know the contact) and on the result screen.

import { bg } from "@/i18n/bg";
import { fill } from "@/components/family/format";
import type { CallContactDto } from "@/schemas/checks";
import { telLink } from "./callContact";

export function CallContactButton({ contact }: { contact: CallContactDto }) {
  return (
    <a className="button button-primary check-call-button" href={telLink(contact.phone)}>
      <span aria-hidden="true">📞 </span>
      {fill(bg.protectedCheck.callContact, { name: contact.displayName })}
    </a>
  );
}
