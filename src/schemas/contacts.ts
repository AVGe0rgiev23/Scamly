// Input rules (Zod schemas) for the contact list of a protected person
// (PUT /api/persons/:id/contacts, BUILD_PLAN 3, #11) and the phone number format.
//
// Phone numbers are stored in ONE format, E.164 ("+359888123456"), so the tel:
// button always works and two spellings of the same number look the same.

import { z } from "@/lib/zod";
import { bg } from "@/i18n/bg";

// The most contacts one protected person can have (priority 1 … 5).
export const MAX_CONTACTS = 5;

// Turns what a person typed into E.164, or null when it is not a phone number.
//   "0888 123 456"       -> "+359888123456"  (Bulgarian number with the leading 0)
//   "+359 (88) 812-3456" -> "+359888123456"
//   "00359888123456"     -> "+359888123456"  (00 = international prefix)
//   "+44 20 7946 0958"   -> "+442079460958"  (a relative abroad)
// Bulgarian numbers have 8 or 9 digits after +359 (Sofia landlines 8, mobiles 9).
// Other countries: the general E.164 rule, "+" and 8 to 15 digits.
export function normalizePhone(typed: string): string | null {
  // Remove the characters people use to group digits: spaces, -, ., ( and ).
  let phone = typed.replace(/[\s\-.()]/g, "");

  if (phone.startsWith("00")) {
    phone = "+" + phone.slice(2);
  } else if (/^0[1-9]/.test(phone)) {
    phone = "+359" + phone.slice(1);
  }

  if (phone.startsWith("+359")) {
    return /^\+359[1-9]\d{7,8}$/.test(phone) ? phone : null;
  }
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

// One phone number: checked, then turned into E.164.
// .refine() is a custom yes/no rule; .transform() changes the value after the checks
// (like a Pydantic field validator that returns a cleaned value).
export const PhoneSchema = z
  .string({ error: bg.contacts.phoneInvalid })
  .trim()
  .max(30, { error: bg.contacts.phoneInvalid })
  .refine((value) => normalizePhone(value) !== null, { error: bg.contacts.phoneInvalid })
  .transform((value) => normalizePhone(value) ?? value);

// One contact in the list. `id` is sent for contacts that already exist; a contact
// without `id` is new. Any other field (e.g. a "userId" a browser might send) is
// silently dropped by z.object, so the browser can never choose WHICH ACCOUNT a
// contact is: that is set only when an invite is redeemed.
export const ContactInputSchema = z.object(
  {
    id: z.guid({ error: bg.contacts.unknownContact }).optional(),
    displayName: z
      .string({ error: bg.contacts.displayNameInvalid })
      .trim()
      .min(1, { error: bg.contacts.displayNameInvalid })
      .max(60, { error: bg.contacts.displayNameInvalid }),
    // Optional: a contact with an account (e.g. the owner) can be reached through the
    // app. The service checks that a contact WITHOUT an account has a phone.
    // null and "" both mean "no phone".
    phone: z
      .union([z.literal(""), z.null(), PhoneSchema], { error: bg.contacts.phoneInvalid })
      .optional()
      .transform((value) => (value === "" || value === undefined ? null : value)),
    priority: z
      .number({ error: bg.contacts.priorityInvalid })
      .int({ error: bg.contacts.priorityInvalid })
      .min(1, { error: bg.contacts.priorityInvalid })
      .max(MAX_CONTACTS, { error: bg.contacts.priorityInvalid }),
  },
  { error: bg.errors.validation },
);

// The request body, the whole new list: 1 to 5 contacts, every place (priority) used once, every
// existing contact listed once. .superRefine() adds rules that look at the whole
// list at once, not at one field.
export const ContactsSchema = z
  .array(ContactInputSchema, { error: bg.contacts.listInvalid })
  .min(1, { error: bg.contacts.listInvalid })
  .max(MAX_CONTACTS, { error: bg.contacts.listInvalid })
  .superRefine((contacts, ctx) => {
    const priorities = contacts.map((contact) => contact.priority);
    if (new Set(priorities).size !== priorities.length) {
      ctx.addIssue({ code: "custom", message: bg.contacts.priorityTaken });
    }
    const ids = contacts.filter((contact) => contact.id !== undefined).map((contact) => contact.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: bg.contacts.contactTwice });
    }
  });

export type ContactInput = z.infer<typeof ContactInputSchema>;
