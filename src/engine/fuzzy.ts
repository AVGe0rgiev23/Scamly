// Typo-tolerant matching: Damerau-Levenshtein distance, stem matching and phrases
// (BUILD_PLAN 4.4).
//
// 1. damerauLevenshtein(a, b): the smallest number of edits that turns a into b.
//    An edit is: insert a letter, delete a letter, change a letter, or SWAP two
//    neighbouring letters ("хврълете" → "хвърлете" is one swap). We use the
//    "optimal string alignment" version: a dynamic-programming table, like the
//    classic edit-distance exercise in Python.
// 2. matchesStem(token, stem): the dictionary stores word BEGINNINGS ("хвърл"), so we
//    compare the stem with the START of the token. How many edits we allow depends
//    on the stem length (short words get no slack, which avoids false hits):
//       stem ≤ 4 letters → 0 edits,  5–8 → 1 edit,  ≥ 9 → 2 edits.
//    We compare with the token's prefix of the same length, and also one letter
//    shorter or longer, so a missing or an extra letter inside the stem still fits.
//    SHORT stems are stricter, because a short prefix hides inside many words:
//      * 3–4 letters („нап“, „евро“, „пари“): the whole word, or the word plus a
//        grammatical ending (парите, еврото, часа), so „нап“ does NOT match
//        „напомняме“ and „евро“ does NOT match „европейски“;
//      * 1–2 letters („не“, „до“): only the whole word, so „не“ ≠ „нещо“.
// 3. findPhrase(tokens, phrase): the stems of a phrase must appear IN ORDER within a
//    window of PHRASE_WINDOW (6) tokens: ["не", "казвай", "никого"] matches
//    „не казвайте на никого“.
//
// Pure TypeScript: imports only ./types.

import { PHRASE_WINDOW } from "./types";

// Stems this short must equal the whole token (see point 2 above).
export const WHOLE_WORD_MAX_LENGTH = 2;

// Stems up to this length match the whole token or the token + one ending below.
export const SHORT_STEM_MAX_LENGTH = 4;

// Bulgarian article and plural endings that may follow a short stem:
// пари → парите, евро → еврото, сейф → сейфа, син → синът, час → часа.
export const SHORT_STEM_ENDINGS = [
  "а",
  "я",
  "ът",
  "ят",
  "та",
  "то",
  "те",
  "и",
  "ите",
  "ове",
  "овете",
];

// Damerau-Levenshtein distance (optimal string alignment).
// d[i][j] = distance between the first i letters of a and the first j letters of b.
export function damerauLevenshtein(a: string, b: string): number {
  // A (a.length + 1) × (b.length + 1) table of zeros, like
  // [[0] * (len(b) + 1) for _ in range(len(a) + 1)] in Python.
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i += 1) {
    d.push(new Array<number>(b.length + 1).fill(0));
  }
  // `cell(i, j)` reads the table; `?? 0` only satisfies the strict type checker
  // (the index is always inside the table).
  const cell = (i: number, j: number): number => d[i]?.[j] ?? 0;
  const setCell = (i: number, j: number, value: number): void => {
    const row = d[i];
    if (row !== undefined) row[j] = value;
  };

  for (let i = 0; i <= a.length; i += 1) setCell(i, 0, i); // delete i letters
  for (let j = 0; j <= b.length; j += 1) setCell(0, j, j); // insert j letters

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      let best = Math.min(
        cell(i - 1, j) + 1, // delete a letter from a
        cell(i, j - 1) + 1, // insert a letter into a
        cell(i - 1, j - 1) + cost, // change a letter (or keep it, cost 0)
      );
      // Swap of two neighbouring letters: "ab" ↔ "ba" counts as ONE edit.
      const swapped =
        i > 1 &&
        j > 1 &&
        a.charAt(i - 1) === b.charAt(j - 2) &&
        a.charAt(i - 2) === b.charAt(j - 1);
      if (swapped) {
        best = Math.min(best, cell(i - 2, j - 2) + 1);
      }
      setCell(i, j, best);
    }
  }
  return cell(a.length, b.length);
}

// How many edits a stem of this length may differ by (BUILD_PLAN 4.4).
export function allowedEdits(stemLength: number): number {
  if (stemLength <= 4) return 0;
  if (stemLength <= 8) return 1;
  return 2;
}

// True if the (normalised) token starts with the stem, allowing a few typos.
export function matchesStem(token: string, stem: string): boolean {
  if (stem.length === 0) return false; // an empty stem would match everything
  if (stem.length <= WHOLE_WORD_MAX_LENGTH) return token === stem;
  if (stem.length <= SHORT_STEM_MAX_LENGTH) {
    // Short stems: no typos (0 edits) and no free prefix, see point 2 above.
    return (
      token === stem ||
      (token.startsWith(stem) && SHORT_STEM_ENDINGS.includes(token.slice(stem.length)))
    );
  }
  if (token.startsWith(stem)) return true; // the usual case: exact prefix

  const tolerance = allowedEdits(stem.length); // 1 or 2 here: longer stems

  // Compare with the token's prefix one letter shorter, the same length and one
  // letter longer than the stem: covers a changed, missing or extra letter.
  const lengths = [stem.length - 1, stem.length, stem.length + 1];
  for (const length of lengths) {
    if (length > token.length) continue; // the token is too short for this prefix
    if (damerauLevenshtein(stem, token.slice(0, length)) <= tolerance) {
      return true;
    }
  }
  return false;
}

// Finds a phrase (a list of stems) in the tokens. The stems must match in this
// order, all inside one window of `windowSize` tokens that starts at the first stem.
// Returns the positions of the matched tokens, or null if the phrase is not there
// (`number[] | null` is like Optional[list[int]] in Python).
export function findPhrase(
  tokens: string[],
  phrase: string[],
  windowSize: number = PHRASE_WINDOW,
): number[] | null {
  const firstStem = phrase[0];
  if (firstStem === undefined) return null;

  for (let start = 0; start < tokens.length; start += 1) {
    if (!matchesStem(tokens[start] ?? "", firstStem)) continue;

    const positions = [start];
    const lastAllowed = Math.min(tokens.length - 1, start + windowSize - 1);
    let previous = start;
    // For each next stem, take the EARLIEST matching token after the previous one.
    // Taking the earliest leaves the most room for the stems that follow.
    for (const stem of phrase.slice(1)) {
      let found = -1;
      for (let j = previous + 1; j <= lastAllowed; j += 1) {
        if (matchesStem(tokens[j] ?? "", stem)) {
          found = j;
          break;
        }
      }
      if (found === -1) break;
      positions.push(found);
      previous = found;
    }
    if (positions.length === phrase.length) return positions;
  }
  return null;
}
