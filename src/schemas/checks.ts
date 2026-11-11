// Input rules (Zod schemas) and answer shapes for the call-check API
// (BUILD_PLAN 3, #17–#22):
//
//   AnswersSchema         PUT /api/checks/:id/answers   (the older person's answers)
//   ListChecksQuerySchema GET /api/checks?personId=…    (the family's history)
//   CheckDto, VerdictDto… what the API sends back
//
// This file has no server-only code, so the phone's pages (Roberta's wizard) and
// src/lib/realtime.ts can import the same types the server uses.
// A Zod schema is like a Pydantic model in Python.

import { z } from "zod";
import {
  CLAIMED_IDENTITIES,
  HANDOVER_METHODS,
  MAX_TEXT_LENGTH,
  TRI_ANSWERS,
  type ClaimedIdentity,
  type HandoverMethod,
  type HardRuleId,
  type Reason,
  type RiskLevel,
  type ScriptType,
  type TriAnswer,
} from "@/engine";
import { bg } from "@/i18n/bg";

// One answer to a yes / no / "не знам" question. `null` (or a missing key) means
// "skipped": the engine accepts unanswered questions (BUILD_PLAN 4.1).
// `.nullable().default(null)` is like `answer: Optional[Tri] = None` in Pydantic.
function triAnswer() {
  return z.enum(TRI_ANSWERS, { error: bg.checks.answerInvalid }).nullable().default(null);
}

// The answers of the older person (BUILD_PLAN 4.1: 4 questions + 1 conditional + text).
// Unknown keys (for example a "riskLevel" sent by a hacked phone) are dropped by Zod:
// the verdict is always computed on the server.
export const AnswersSchema = z
  .object(
    {
      claimedIdentity: z
        .enum(CLAIMED_IDENTITIES, { error: bg.checks.answerInvalid })
        .nullable()
        .default(null),
      asksMoney: triAnswer(),
      // Only asked when asksMoney = "yes" (see the refine below).
      handover: z
        .enum(HANDOVER_METHODS, { error: bg.checks.answerInvalid })
        .nullable()
        .default(null),
      rushing: triAnswer(),
      secrecy: triAnswer(),
      // What the caller said, typed or spoken. Optional; at most 2000 characters.
      text: z
        .string({ error: bg.checks.textTooLong })
        .trim()
        .max(MAX_TEXT_LENGTH, { error: bg.checks.textTooLong })
        .default(""),
    },
    { error: bg.errors.validation },
  )
  // A rule that looks at two fields at once (like a Pydantic model_validator).
  .refine((answers) => answers.handover === null || answers.asksMoney === "yes", {
    error: bg.checks.handoverOnlyWithMoney,
    path: ["handover"],
  });

// The checked answers (like the Python class you get from a Pydantic model).
export type AnswersInput = z.infer<typeof AnswersSchema>;

// GET /api/checks?personId=…&cursor=…
//   personId: whose history (family only, RLS decides if the caller may see it)
//   cursor:   the `startedAt` of the last check of the previous page (optional)
export const ListChecksQuerySchema = z.object(
  {
    personId: z.guid({ error: bg.errors.validation }),
    cursor: z.iso.datetime({ offset: true, error: bg.errors.validation }).optional(),
  },
  { error: bg.errors.validation },
);

export type ListChecksQuery = z.infer<typeof ListChecksQuerySchema>;

// ---------------------------------------------------------------------------------
// What the API sends back. Plain types (like Python TypedDicts), camelCase.
// ---------------------------------------------------------------------------------

// The verdict of a check, as the phone and the family see it.
export type VerdictDto = {
  level: RiskLevel;
  score: number;
  scriptType: ScriptType;
  hardRules: HardRuleId[];
  reasons: Reason[]; // Bulgarian "why" lines (with the matched words only right after answering)
  headlineBg: string; // „ТОВА Е ИЗМАМА.“ / „Внимание!“ / the D9 wording for green
  adviceBg: string;
};

// The person for the big „Обади се на …“ button (a tel: link). null = nobody with a phone.
export type CallContactDto = {
  displayName: string;
  phone: string;
};

// Who pressed „Обаждам ѝ се сега“ (null until somebody does).
export type AcknowledgementDto = {
  at: string; // ISO date and time
  displayName: string | null; // null = we don't know the name any more
  messageBg: string; // „Иван ще ви се обади веднага.“, ready for the phone's screen
};

// One check (GET /api/checks/:id, and each item of GET /api/checks).
export type CheckDto = {
  id: string;
  protectedPersonId: string;
  status: "started" | "answered";
  startedAt: string;
  answeredAt: string | null;
  answers: {
    claimedIdentity: ClaimedIdentity | null;
    asksMoney: TriAnswer | null;
    handover: HandoverMethod | null;
    rushing: TriAnswer | null;
    secrecy: TriAnswer | null;
    textRedacted: string | null; // personal data already replaced, e.g. [ТЕЛЕФОН]
  };
  verdict: VerdictDto | null; // null while the check is only "started"
  acknowledgement: AcknowledgementDto | null;
  alertVisible?: false; // The family can view its history before it receives an alert.
  suggestEmergencyCall?: true; // The contact list was exhausted without an answer.
};

// PUT /api/checks/:id/answers
export type AnswersResultDto = {
  checkId: string;
  verdict: VerdictDto;
  callContact: CallContactDto | null;
};

// POST /api/checks/:id/acknowledge
export type AcknowledgeResultDto = {
  checkId: string;
  acknowledgement: AcknowledgementDto;
  // true = this caller was the first to press the button; false = somebody else
  // already had (first responder wins), and `acknowledgement` names them.
  first: boolean;
};

// GET /api/realtime/token
export type RealtimeTokenDto = {
  userId: string;
  accessToken: string;
  expiresAt: number; // seconds since 1970 (like Python's time.time()), as Supabase gives it
};
