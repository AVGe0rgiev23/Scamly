// Scoring: detected signals → a score from 0 to 100 (BUILD_PLAN 4.5).
//
// The steps:
//   1. Every category has three weights in ONE table (WEIGHTS below): for a firm
//      answer, for a weak ("unsure") answer, and for a match in the text.
//   2. Each detected category contributes ONCE: the stronger of its answer weight
//      and its text weight, never the sum. If the person answered "money: yes" (35)
//      and the caller also said „пари“ (30), money adds 35, not 65. Saying „пари“
//      three times still adds 30 once.
//   3. score = the sum of all contributions, capped at 100.
// The contributions are also returned, sorted from strongest to weakest, so the
// verdict can show one reason per contributing category.
//
// Pure TypeScript: imports only ./types and ./signals (types only).

import type { SignalMap, Signal } from "./signals";
import { SIGNAL_CATEGORIES, type SignalCategory } from "./types";

// The weights of one category. Like a Python dataclass with three int fields.
export type CategoryWeights = {
  firmAnswer: number; // a definite answer ("yes", the chosen identity or handover)
  weakAnswer: number; // an "unsure" answer (or handover "other" for bank_transfer)
  text: number; // found in the caller's words
};

// The weights table from BUILD_PLAN 4.5. Change a weight here and nowhere else.
// `Record<SignalCategory, CategoryWeights>` is like dict[SignalCategory, CategoryWeights]
// where TypeScript checks that EVERY category has a row.
export const WEIGHTS: Record<SignalCategory, CategoryWeights> = {
  identity_police: { firmAnswer: 25, weakAnswer: 0, text: 25 },
  identity_official: { firmAnswer: 15, weakAnswer: 0, text: 15 },
  identity_relative: { firmAnswer: 10, weakAnswer: 0, text: 10 },
  identity_courier: { firmAnswer: 10, weakAnswer: 0, text: 10 },
  identity_other: { firmAnswer: 5, weakAnswer: 0, text: 0 }, // answer only
  money: { firmAnswer: 35, weakAnswer: 15, text: 30 },
  urgency: { firmAnswer: 15, weakAnswer: 5, text: 15 },
  secrecy: { firmAnswer: 20, weakAnswer: 10, text: 20 },
  scenario_police: { firmAnswer: 0, weakAnswer: 0, text: 15 }, // text only
  scenario_relative: { firmAnswer: 0, weakAnswer: 0, text: 15 },
  scenario_official: { firmAnswer: 0, weakAnswer: 0, text: 10 },
  scenario_courier: { firmAnswer: 0, weakAnswer: 0, text: 10 },
  bank_transfer: { firmAnswer: 10, weakAnswer: 5, text: 10 },
  // No weight: these only let hard rules fire from the text (a hard rule is red anyway).
  handover: { firmAnswer: 0, weakAnswer: 0, text: 0 },
  credentials: { firmAnswer: 0, weakAnswer: 0, text: 0 },
  safe_account: { firmAnswer: 0, weakAnswer: 0, text: 0 },
  move_money: { firmAnswer: 0, weakAnswer: 0, text: 0 },
};

export const MAX_SCORE = 100;

// What one category added to the score.
export type Contribution = { category: SignalCategory; weight: number };

// Step 2: the contribution of one signal = max(answer weight, text weight).
export function signalWeight(signal: Signal): number {
  const weights = WEIGHTS[signal.category];
  let answerWeight = 0;
  if (signal.answer === "firm") answerWeight = weights.firmAnswer;
  if (signal.answer === "weak") answerWeight = weights.weakAnswer;
  const textWeight = signal.textEvidence.length > 0 ? weights.text : 0;
  return Math.max(answerWeight, textWeight);
}

// Steps 2 and 3: the score and the list of contributions (only weights > 0),
// strongest first; equal weights keep the order of SIGNAL_CATEGORIES.
export function scoreSignals(signals: SignalMap): { score: number; contributions: Contribution[] } {
  const contributions: Contribution[] = [];
  for (const category of SIGNAL_CATEGORIES) {
    const signal = signals.get(category);
    if (signal === undefined) continue;
    const weight = signalWeight(signal);
    if (weight > 0) contributions.push({ category, weight });
  }
  // `.sort((a, b) => b.weight - a.weight)` sorts high → low, like
  // sorted(..., key=lambda c: -c.weight); JavaScript's sort is stable, like Python's.
  contributions.sort((a, b) => b.weight - a.weight);

  const total = contributions.reduce((sum, item) => sum + item.weight, 0); // like sum(...)
  return { score: Math.min(MAX_SCORE, total), contributions };
}
