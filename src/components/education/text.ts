// Small text helpers for the education cards (W3-05): they turn a card's plain text
// from the database into short lines that are easier to read for an older person.
// Plain functions without React, so they can be unit-tested.

// „What they say“ is written as several quotes in a row: „Първо.“ „Второ.“
// Each quote becomes its own line. A text without quotes stays one line.
// The pattern splits at the spaces between a closing “ and the next opening „.
export function splitPhrases(text: string): string[] {
  return text
    .split(/(?<=“)\s+(?=„)/u)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

// „What to do“ becomes a list of steps: one sentence per step. A sentence ends with
// . ! or ? followed by a space and a capital letter, a digit or an opening „
// (so „напр. банката“ with a small letter is not split).
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[А-ЯA-Z0-9„])/u)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}
