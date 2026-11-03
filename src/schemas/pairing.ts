// Input rules (Zod schemas) for pairing the older person's phone (BUILD_PLAN 3, #15).

import { z } from "zod";
import { bg } from "@/i18n/bg";

export const RedeemCodeSchema = z.object(
  {
    // Exactly 6 digits, e.g. "482915".
    code: z
      .string({ error: bg.pairing.codeFormat })
      .regex(/^\d{6}$/, { error: bg.pairing.codeFormat }),
    // Optional name of the phone, e.g. „Телефонът на баба“.
    label: z
      .string({ error: bg.pairing.labelInvalid })
      .trim()
      .min(1, { error: bg.pairing.labelInvalid })
      .max(60, { error: bg.pairing.labelInvalid })
      .optional(),
  },
  { error: bg.errors.validation },
);

export type RedeemCodeInput = z.infer<typeof RedeemCodeSchema>;
