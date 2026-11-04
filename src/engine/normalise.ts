// Text normalisation: the caller's words → a clean list of tokens (BUILD_PLAN 4.3).
//
// The steps, in order:
//   1. Keep only the first MAX_TEXT_LENGTH (2000) characters, then Unicode NFC
//      (so "й" typed as и + a combining mark becomes the single letter й).
//   2. Split into words: a word is a run of letters and digits. Everything else
//      (punctuation, spaces, new lines, emoji) is a separator, so it disappears.
//   3. For each word: lower-case it, turn digits used as letters INSIDE a word into
//      letters ("4" → ч, "6" → ш: "ka6ete" → "kaшete"), then, if it still has Latin
//      letters, transliterate it to Cyrillic (transliterate.ts).
//   4. Remove nothing else. Stop-words stay, because phrases like „не казвайте“ need „не“.
//
// Every token keeps the ORIGINAL word as the person typed it next to the
// normalised one, so a reason can quote the caller's own words.
//
// Pure TypeScript: imports only ./types and ./transliterate.

import { transliterate } from "./transliterate";
import { MAX_TEXT_LENGTH } from "./types";

// One word of the text. Like a Python dataclass with two str fields.
export type Token = {
  original: string; // as typed, e.g. "ПОЛИЦИЯТА" or "politsiyata"
  normalised: string; // lower-case Cyrillic, e.g. "полицията"
};

// Digits that people use instead of letters in шльокавица.
const DIGIT_LETTERS: Record<string, string> = { "4": "ч", "6": "ш" };

// A "word" for step 2: one or more letters (\p{L}), combining marks (\p{M}) or
// digits (\p{N}). The `u` flag turns on Unicode, so Cyrillic counts as letters.
// Like re.findall(r"[^\W_]+", text) in Python.
const WORD_PATTERN = /[\p{L}\p{M}\p{N}]+/gu;

function isLetter(char: string): boolean {
  return /\p{L}/u.test(char);
}

function isDigit(char: string): boolean {
  return /\p{N}/u.test(char);
}

// Step 3b: "4" and "6" become ч and ш only when they sit INSIDE a word: a letter on
// at least one side and no digit on either side. So "ka6ete" → "kaшete" and
// "4ao" → "чao", but "46", "100" and a lone "6" stay numbers.
export function replaceDigitLetters(word: string): string {
  let result = "";
  for (let i = 0; i < word.length; i += 1) {
    const char = word.charAt(i);
    const letter = DIGIT_LETTERS[char];
    const before = word.charAt(i - 1);
    const after = word.charAt(i + 1);
    const touchesLetter = (before !== "" && isLetter(before)) || (after !== "" && isLetter(after));
    const touchesDigit = (before !== "" && isDigit(before)) || (after !== "" && isDigit(after));
    if (letter !== undefined && touchesLetter && !touchesDigit) {
      result += letter;
    } else {
      result += char;
    }
  }
  return result;
}

// Step 3 for one word: lower-case → digits as letters → Latin to Cyrillic.
// The dictionary stems go through this same function, so both sides match.
export function normaliseWord(word: string): string {
  return transliterate(replaceDigitLetters(word.toLowerCase()));
}

// Steps 1–4 for a whole text. Returns [] for "" or a text with only spaces.
export function normaliseText(text: string): Token[] {
  const capped = text.slice(0, MAX_TEXT_LENGTH).normalize("NFC");
  // `capped.match(...)` with the g flag returns every word, or null if none
  // (like re.findall, which would return []). `?? []` turns null into [].
  const words = capped.match(WORD_PATTERN) ?? [];
  // `.map(fn)` builds a new list, like [fn(w) for w in words] in Python.
  return words.map((word) => ({ original: word, normalised: normaliseWord(word) }));
}
