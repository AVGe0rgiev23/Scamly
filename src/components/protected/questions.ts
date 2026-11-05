// The questions of the call check (BUILD_PLAN 4.1: 4 questions + 1 conditional) and
// the rules for moving between them. Pure functions (no React), so they are
// unit-tested in questions.test.ts.
//
//   1. claimedIdentity  „Кой казва, че е?“
//   2. asksMoney        „Искат ли пари или ценности?“
//   3. handover         „Как искат да ги дадете?“  ONLY if 2 = „Да“
//   4. rushing          „Карат ли ви да бързате?“
//   5. secrecy          „Казват ли ви да не казвате на никого?“

import type { ChoiceOption } from "@/components/ui/BigChoice";
import {
  CLAIMED_IDENTITIES,
  HANDOVER_METHODS,
  TRI_ANSWERS,
  type CallInput,
  type ClaimedIdentity,
  type HandoverMethod,
  type TriAnswer,
} from "@/engine";
import { bg } from "@/i18n/bg";

// The answers of one check, in the engine's own input shape (so the phone can run
// analyseCall() on them directly). `null` = not answered yet.
export type CheckAnswers = Omit<CallInput, "extraKeywords">; // CallInput without one field

export const EMPTY_ANSWERS: CheckAnswers = {
  claimedIdentity: null,
  asksMoney: null,
  handover: null,
  rushing: null,
  secrecy: null,
  text: "",
};

// The id of one question = the name of its field in CheckAnswers.
export type QuestionId = "claimedIdentity" | "asksMoney" | "handover" | "rushing" | "secrecy";

// The questions to ask for these answers, in order. Question 3 (handover) is only
// asked when the caller wants money, so the list has 4 or 5 items.
export function questionOrder(answers: CheckAnswers): QuestionId[] {
  if (answers.asksMoney === "yes") {
    return ["claimedIdentity", "asksMoney", "handover", "rushing", "secrecy"];
  }
  return ["claimedIdentity", "asksMoney", "rushing", "secrecy"];
}

// The current answer to one question (null = not answered).
export function answerOf(answers: CheckAnswers, id: QuestionId): string | null {
  return answers[id];
}

// A copy of the answers with one answer changed (the original is not changed, like
// building a new Python dict with {**answers, id: value}). A value that doesn't
// belong to the question is ignored. If "money" is no longer „Да“, the handover
// answer is removed, because that question is not asked any more (the API also
// refuses a handover without money).
export function withAnswer(answers: CheckAnswers, id: QuestionId, value: string): CheckAnswers {
  if (id === "claimedIdentity") {
    const identity = CLAIMED_IDENTITIES.find((item) => item === value);
    return identity === undefined ? answers : { ...answers, claimedIdentity: identity };
  }
  if (id === "handover") {
    const method = HANDOVER_METHODS.find((item) => item === value);
    return method === undefined ? answers : { ...answers, handover: method };
  }
  const tri = TRI_ANSWERS.find((item) => item === value);
  if (tri === undefined) {
    return answers;
  }
  if (id === "asksMoney") {
    return { ...answers, asksMoney: tri, handover: tri === "yes" ? answers.handover : null };
  }
  return { ...answers, [id]: tri };
}

// The question text of each question.
export const QUESTION_TEXT: Record<QuestionId, string> = bg.protectedCheck.questions;

// The answers with their pictures. The emoji are only decoration (aria-hidden):
// the words are always there, so nobody has to guess what a picture means.
const IDENTITY_ICONS: Record<ClaimedIdentity, string> = {
  police: "👮",
  relative: "👪",
  official: "🏦",
  courier: "📦",
  other: "❓",
};
const TRI_ICONS: Record<TriAnswer, string> = { yes: "✓", no: "✗", unsure: "?" };
const HANDOVER_ICONS: Record<HandoverMethod, string> = {
  courier_or_stranger: "🧍",
  throw: "⬇️",
  bank_transfer: "💳",
  other: "❓",
};

export function optionsFor(id: QuestionId): ChoiceOption[] {
  if (id === "claimedIdentity") {
    return CLAIMED_IDENTITIES.map((value) => ({
      value,
      label: bg.protectedCheck.identities[value],
      icon: IDENTITY_ICONS[value],
    }));
  }
  if (id === "handover") {
    return HANDOVER_METHODS.map((value) => ({
      value,
      label: bg.protectedCheck.handoverMethods[value],
      icon: HANDOVER_ICONS[value],
    }));
  }
  return TRI_ANSWERS.map((value) => ({
    value,
    label: bg.protectedCheck.tri[value],
    icon: TRI_ICONS[value],
  }));
}
