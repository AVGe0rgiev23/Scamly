// Input rules (Zod schemas) for invites: another relative becomes a trusted contact
// (BUILD_PLAN 3, #12 and #13).

import { z } from "zod";
import { bg } from "@/i18n/bg";
import { MAX_CONTACTS } from "@/schemas/contacts";

// POST /api/persons/:id/invites: who is invited, and at which place in the list.
export const CreateInviteSchema = z.object(
  {
    displayName: z
      .string({ error: bg.invites.displayNameInvalid })
      .trim()
      .min(1, { error: bg.invites.displayNameInvalid })
      .max(60, { error: bg.invites.displayNameInvalid }),
    priority: z
      .number({ error: bg.invites.priorityInvalid })
      .int({ error: bg.invites.priorityInvalid })
      .min(1, { error: bg.invites.priorityInvalid })
      .max(MAX_CONTACTS, { error: bg.invites.priorityInvalid }),
  },
  { error: bg.errors.validation },
);

// POST /api/invites/redeem: the token from the link /pokana?t=<token>.
// Our tokens are 43 URL-safe characters (base64url of 32 random bytes). Anything that
// can't be one of our tokens gets the same message as a wrong token.
export const RedeemInviteSchema = z.object(
  {
    token: z
      .string({ error: bg.invites.invalidInvite })
      .regex(/^[A-Za-z0-9_-]{43}$/, { error: bg.invites.invalidInvite }),
  },
  { error: bg.errors.validation },
);

export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
export type RedeemInviteInput = z.infer<typeof RedeemInviteSchema>;
