// Signal detection: answers + text → which signal categories are present, and why
// (BUILD_PLAN 4.5).
//
// A "signal" is one category of evidence (police identity, money, urgency...).
// It can come from two places:
//   * the ANSWERS to the questions. A definite answer is "firm" (asksMoney "yes",
//     a chosen identity, a chosen handover method); "unsure" is "weak".
//   * the TEXT: the caller's words are normalised (normalise.ts) and compared with
//     every stem and phrase of the dictionary (fuzzy.ts). Each match keeps the
//     caller's ORIGINAL words as evidence, so a reason can quote them.
//
// The steps of detectSignals():
//   1. Prepare the dictionary once: every stem goes through the same normalisation
//      as the text (so the Latin stems "politsiya", "pari" become Cyrillic too).
//      Moderator keywords (input.extraKeywords) are prepared the same way and added
//      to their EXISTING category, so they can't invent a new weight.
//   2. Read the answers → firm or weak signals.
//   3. Normalise the text → tokens; every stem is tried on every token, every phrase
//      on the whole token list → text evidence per category.
//   4. Merge both into one map: category → { answer strength, text evidence }.
// How much each signal is worth is NOT decided here: that is scoring.ts.
//
// Pure TypeScript: imports only ./types, ./dictionary, ./normalise and ./fuzzy.

import { DICTIONARY } from "./dictionary";
import { findPhrase, matchesStem } from "./fuzzy";
import { normaliseText, type Token } from "./normalise";
import type { CallInput, ClaimedIdentity, DictionaryEntry, SignalCategory } from "./types";

// "firm" = a definite answer, "weak" = "unsure". Like Literal["firm", "weak"].
export type AnswerStrength = "firm" | "weak";

// One detected category. Like a Python dataclass.
export type Signal = {
  category: SignalCategory;
  answer: AnswerStrength | null; // from the questions; null = no answer for it
  textEvidence: string[]; // the caller's original words that matched; [] = not in the text
};

// category → Signal. A Map is like a Python dict; only detected categories are in it.
export type SignalMap = Map<SignalCategory, Signal>;

// A dictionary entry after step 1: stems and phrases already normalised.
export type PreparedEntry = {
  category: SignalCategory;
  stems: string[];
  phrases: string[][];
};

// At most this many evidence words are kept per category (enough to quote).
export const MAX_EVIDENCE_WORDS = 5;

// Which identity category each answer of "Кой казва, че е?" means.
const IDENTITY_CATEGORY: Record<ClaimedIdentity, SignalCategory> = {
  police: "identity_police",
  relative: "identity_relative",
  official: "identity_official",
  courier: "identity_courier",
  other: "identity_other",
};

// Step 1 for one stem or one moderator keyword. Usually it is one word → a stem.
// If normalising splits it into several words ("фалшиви банкноти"), it becomes a
// phrase; if nothing is left (e.g. "!!!"), it is dropped, because an empty stem
// would match every word.
function prepareWords(text: string): { stem: string | null; phrase: string[] | null } {
  const words = normaliseText(text).map((token) => token.normalised);
  if (words.length === 0) return { stem: null, phrase: null };
  if (words.length === 1) return { stem: words[0] ?? null, phrase: null };
  return { stem: null, phrase: words };
}

// Step 1: normalise every stem and phrase of the given dictionary entries.
export function prepareDictionary(entries: DictionaryEntry[]): PreparedEntry[] {
  return entries.map((entry) => {
    const prepared: PreparedEntry = { category: entry.category, stems: [], phrases: [] };
    for (const rawStem of entry.stems ?? []) {
      const { stem, phrase } = prepareWords(rawStem);
      if (stem !== null) prepared.stems.push(stem);
      if (phrase !== null) prepared.phrases.push(phrase);
    }
    for (const rawPhrase of entry.phrases ?? []) {
      // Each stem of a phrase is one word; `.flatMap` is like a nested list comprehension.
      const words = rawPhrase.flatMap((word) => normaliseText(word).map((t) => t.normalised));
      if (words.length > 0) prepared.phrases.push(words);
    }
    return prepared;
  });
}

// Roberta's dictionary, prepared once when the module is loaded.
const PREPARED_DICTIONARY: PreparedEntry[] = prepareDictionary(DICTIONARY);

// Step 2: the answers → signals with a firm or weak answer (no text evidence yet).
export function answerSignals(input: CallInput): SignalMap {
  const signals: SignalMap = new Map();
  const add = (category: SignalCategory, answer: AnswerStrength): void => {
    signals.set(category, { category, answer, textEvidence: [] });
  };

  if (input.claimedIdentity !== null) add(IDENTITY_CATEGORY[input.claimedIdentity], "firm");

  if (input.asksMoney === "yes") add("money", "firm");
  if (input.asksMoney === "unsure") add("money", "weak");
  if (input.rushing === "yes") add("urgency", "firm");
  if (input.rushing === "unsure") add("urgency", "weak");
  if (input.secrecy === "yes") add("secrecy", "firm");
  if (input.secrecy === "unsure") add("secrecy", "weak");

  // "Как искат да ги дадете?": a courier/stranger or throwing → handover (HR2);
  // by bank → bank transfer; "other" → a weak bank-transfer signal (4.5: 5 points).
  if (input.handover === "courier_or_stranger" || input.handover === "throw")
    add("handover", "firm");
  if (input.handover === "bank_transfer") add("bank_transfer", "firm");
  if (input.handover === "other") add("bank_transfer", "weak");

  return signals;
}

// Step 3: the tokens → category → original words that matched.
export function textSignals(
  tokens: Token[],
  entries: PreparedEntry[],
): Map<SignalCategory, string[]> {
  const words = tokens.map((token) => token.normalised);
  // category → set of token positions that matched (a set avoids duplicates, like Python's set).
  const positions = new Map<SignalCategory, Set<number>>();
  const remember = (category: SignalCategory, index: number): void => {
    const found = positions.get(category) ?? new Set<number>();
    found.add(index);
    positions.set(category, found);
  };

  for (const entry of entries) {
    for (const stem of entry.stems) {
      words.forEach((word, index) => {
        if (matchesStem(word, stem)) remember(entry.category, index);
      });
    }
    for (const phrase of entry.phrases) {
      const match = findPhrase(words, phrase);
      if (match !== null) match.forEach((index) => remember(entry.category, index));
    }
  }

  // Turn positions into the original words, in the order they were said, without
  // repeating the same word ("пари, пари, пари" → ["Пари"]).
  const evidence = new Map<SignalCategory, string[]>();
  for (const [category, found] of positions) {
    const quoted: string[] = [];
    const seen = new Set<string>();
    for (const index of [...found].sort((a, b) => a - b)) {
      const original = tokens[index]?.original ?? "";
      const key = original.toLowerCase();
      if (!seen.has(key) && quoted.length < MAX_EVIDENCE_WORDS) {
        seen.add(key);
        quoted.push(original);
      }
    }
    evidence.set(category, quoted);
  }
  return evidence;
}

// Steps 1–4: everything the engine knows about one call, per category.
export function detectSignals(input: CallInput): SignalMap {
  let entries = PREPARED_DICTIONARY;
  if (input.extraKeywords !== undefined && input.extraKeywords.length > 0) {
    const extra: DictionaryEntry[] = input.extraKeywords.map((keyword) => ({
      category: keyword.category,
      stems: [keyword.stem],
      example: "moderator keyword",
    }));
    entries = [...PREPARED_DICTIONARY, ...prepareDictionary(extra)];
  }

  const signals = answerSignals(input);
  const fromText = textSignals(normaliseText(input.text), entries);
  for (const [category, words] of fromText) {
    const existing = signals.get(category);
    if (existing !== undefined) {
      existing.textEvidence = words;
    } else {
      signals.set(category, { category, answer: null, textEvidence: words });
    }
  }
  return signals;
}

// "Firm evidence" for a hard rule (BUILD_PLAN 4.6): a definite answer OR a text
// match. An "unsure" answer alone is never firm.
export function isFirm(signals: SignalMap, category: SignalCategory): boolean {
  const signal = signals.get(category);
  if (signal === undefined) return false;
  return signal.answer === "firm" || signal.textEvidence.length > 0;
}
