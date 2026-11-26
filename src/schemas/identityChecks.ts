// Input rules (Zod schemas) and answer shapes for „Провери истинския“ (D34, P-05):
//
//   CreateIdentityCheckSchema  POST  /api/identity-checks        (the phone asks)
//   AnswerIdentityCheckSchema  PATCH /api/identity-checks/:id    (the family member answers)
//   IdentityCheckDto, …        what the API sends back
//
// No server-only code here, so the screens (phase 3) and src/lib/realtime.ts can
// import the same types. A Zod schema is like a Pydantic model in Python.

import { z } from "@/lib/zod";
import { bg } from "@/i18n/bg";

// The two answers of the real family member.
export const IDENTITY_ANSWERS = ["not_me", "its_me"] as const;
export type IdentityAnswer = (typeof IDENTITY_ANSWERS)[number]; // "not_me" | "its_me"

// The four states of a question (database enum identity_check_status).
export type IdentityCheckStatus = "pending" | "not_me" | "its_me" | "expired";

// POST /api/identity-checks: "the caller says they are claimedUserId; ask askedUserId".
// askedUserId is left out for the first question (then the claimed person is asked)
// and set to the next family member after 45 s without an answer.
// The person and the phone are never read from the body: they come from the pairing.
export const CreateIdentityCheckSchema = z.object(
  {
    claimedUserId: z.guid({ error: bg.identityChecks.notFamily }),
    askedUserId: z.guid({ error: bg.identityChecks.notFamily }).optional(),
  },
  { error: bg.errors.validation },
);
export type CreateIdentityCheckInput = z.infer<typeof CreateIdentityCheckSchema>;

// PATCH /api/identity-checks/:id: „Не съм аз“ or „Аз съм“.
export const AnswerIdentityCheckSchema = z.object(
  { answer: z.enum(IDENTITY_ANSWERS, { error: bg.identityChecks.answerInvalid }) },
  { error: bg.errors.validation },
);
export type AnswerIdentityCheckInput = z.infer<typeof AnswerIdentityCheckSchema>;

// ---------------------------------------------------------------------------------
// What the API sends back (plain types, like Python TypedDicts, camelCase).
// ---------------------------------------------------------------------------------

// One question. `status` is the EFFECTIVE status: a question still "pending" in the
// database after its 15 minutes is sent as "expired".
export type IdentityCheckDto = {
  id: string;
  protectedPersonId: string;
  personName: string | null; // the protected person, e.g. „Мария“
  claimedUserId: string; // who the caller pretends to be
  claimedName: string | null; // as the contact list calls them, e.g. „Иван“
  claimedPhone: string | null; // their SAVED number (the call-back button), never the caller's
  askedUserId: string; // who gets this question and answers it (= claimedUserId first)
  askedName: string | null; // e.g. „Мария“ after Иван did not answer in 45 s
  status: IdentityCheckStatus;
  createdAt: string; // ISO date and time
  answeredAt: string | null;
  answerableUntil: string; // createdAt + 15 minutes
  secondsToAnswer: number | null; // time-to-answer (#7), null until answered
};

// One family member the phone may pick („Казва, че е Иван“).
export type IdentityPersonDto = {
  userId: string | null; // the value for claimedUserId; null = no Scamly account
  displayName: string;
  initials: string; // „ИП“ for „Иван Петров“, for the round tile
  phone: string | null; // the saved number for „Обади се на …“
  priority: number; // 1 = first in the calling order
  canReceive: boolean; // true = has an account, so they can get the question
};

// GET /api/identity-checks/family (phone)
export type IdentityFamilyDto = { people: IdentityPersonDto[] };

// GET /api/identity-checks (family member)
export type MyIdentityChecksDto = {
  pending: IdentityCheckDto[]; // questions addressed to me that I can still answer
  warnings: IdentityCheckDto[]; // „Не съм аз“ of OTHER family members (last 24 hours)
};
