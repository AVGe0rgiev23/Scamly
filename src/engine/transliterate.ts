// Transliteration: шльокавица (Bulgarian typed with Latin letters) → Cyrillic.
//
// Many people type Bulgarian with Latin letters ("politsiyata iska pari").
// The dictionary is in Cyrillic, so before matching we turn every Latin word
// into Cyrillic. The algorithm for one word, left to right:
//   1. At each position, try the multi-letter rules first, LONGEST FIRST:
//      "sht" → щ, then "sh" → ш, "ch" → ч, "zh" → ж, "ts" → ц, "yu"/"iu" → ю,
//      "ya"/"ia" → я. Longest first matters: "shte" must become "ще", not "схте".
//   2. Otherwise "y" is decided by its neighbours: after or before a vowel it is
//      й ("dayte" → дайте, "moy" → мой), between consonants it is ъ ("kyshta" → къща).
//   3. Otherwise one letter → one letter (a → а, q → я, w → в, x → х, h → х, j → й...).
//   4. Anything that is not a Latin letter (Cyrillic letters, digits) stays as it is,
//      so mixed words like "kaшete" work too.
//
// The result can still be ambiguous ("a" is used for both а and ъ: "hvarlete"
// → "хварлете"); fuzzy matching (fuzzy.ts) absorbs that one-letter difference.
//
// Pure TypeScript: no imports at all.

// Multi-letter rules, longest first. Each item is a pair [latin, cyrillic],
// like a Python list of tuples: [("sht", "щ"), ("sh", "ш"), ...].
const MULTI_LETTER_RULES: [string, string][] = [
  ["sht", "щ"],
  ["sh", "ш"],
  ["ch", "ч"],
  ["zh", "ж"],
  ["ts", "ц"],
  ["yu", "ю"],
  ["iu", "ю"],
  ["ya", "я"],
  ["ia", "я"],
];

// One Latin letter → one Cyrillic letter. "y" is missing on purpose: it depends
// on its neighbours (rule 2 above). `Record<string, string>` is like dict[str, str].
const SINGLE_LETTERS: Record<string, string> = {
  a: "а",
  b: "б",
  c: "ц",
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "х",
  i: "и",
  j: "й",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "я",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "в",
  x: "х",
  z: "з",
};

// Vowels in both alphabets, used to decide what "y" means.
const VOWELS = "aeiouаъоуеиюя";

// True if the word contains at least one Latin letter a–z (any case).
// `/.../i.test(word)` is like `re.search(r"[a-z]", word, re.I) is not None` in Python.
export function hasLatin(word: string): boolean {
  return /[a-z]/i.test(word);
}

// Turns one lower-case word from шльокавица into Cyrillic (see the steps at the top).
// Words without Latin letters come back unchanged.
export function transliterate(word: string): string {
  if (!hasLatin(word)) {
    return word;
  }
  let result = "";
  let i = 0;
  while (i < word.length) {
    // Step 1: the longest multi-letter rule that starts here.
    let matchedRule: [string, string] | undefined = undefined;
    for (const rule of MULTI_LETTER_RULES) {
      if (word.startsWith(rule[0], i)) {
        matchedRule = rule;
        break; // the list is ordered longest first, so the first hit is the longest
      }
    }
    if (matchedRule !== undefined) {
      result += matchedRule[1];
      i += matchedRule[0].length;
      continue;
    }

    // `word.charAt(i)` is like `word[i]` in Python (returns "" past the end).
    const letter = word.charAt(i);
    if (letter === "y") {
      // Step 2: "y" next to a vowel is й, otherwise ъ.
      const before = word.charAt(i - 1);
      const after = word.charAt(i + 1);
      const nextToVowel =
        (before !== "" && VOWELS.includes(before)) || (after !== "" && VOWELS.includes(after));
      result += nextToVowel ? "й" : "ъ";
    } else {
      // Step 3 and 4: one letter, or keep the character as it is.
      // `a ?? b` means "a, unless it is missing, then b", like `d.get(letter, letter)`.
      result += SINGLE_LETTERS[letter] ?? letter;
    }
    i += 1;
  }
  return result;
}
