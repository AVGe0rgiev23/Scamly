// redactPersonalData(text, knownNames?): removes personal data from a text before it
// is saved or sent to an AI (BUILD_PLAN 4.8, brief 5.2 C).
//
// Each kind of data is found with a regular expression and replaced by a label.
// The order matters, because some kinds look alike (a phone and an ЕГН are both
// 10 digits):
//   1. e-mails                                         → [ИМЕЙЛ]
//   2. IBANs: the Bulgarian shape BG + 2 digits + 4 letters + 6 digits + 8 letters/digits,
//      then any uppercase IBAN shape; spaces allowed  → [IBAN]
//   3. phones with an international prefix (+359 / 00359)  → [ТЕЛЕФОН]
//   4. card numbers: 13–19 digits (spaces/dashes allowed) that pass the Luhn check
//                                                      → [КАРТА]
//   5. Bulgarian phones: 08x/09x mobiles (spaces, dashes, dots) and landlines
//      starting with 02–07 (spaces or dashes)          → [ТЕЛЕФОН]
//   6. ЕГН (personal number): any other 10 digits in a row → [ЕГН]
//   7. known names (the protected person and their contacts), case-insensitive,
//      the full name first, then each part of it      → [ИМЕ]
// When in doubt we redact: a removed date costs nothing, a leaked phone number does.
//
// Pure TypeScript: no imports.

export const REDACTION_LABELS = {
  phone: "[ТЕЛЕФОН]",
  email: "[ИМЕЙЛ]",
  iban: "[IBAN]",
  card: "[КАРТА]",
  egn: "[ЕГН]",
  name: "[ИМЕ]",
} as const;

// `(?<!...)` = "not preceded by", `(?!...)` = "not followed by": they stop a pattern
// from starting or ending in the middle of a longer number or word.
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
const IBAN_BG = /(?<![A-Z0-9])BG\d{2}(?:\s?[A-Z]){4}(?:\s?\d){6}(?:\s?[A-Z0-9]){8}(?![A-Z0-9])/gi;
const IBAN_ANY = /(?<![A-Z0-9])[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}(?![A-Z0-9])/g;
const PHONE_INTERNATIONAL = /(?:\+|(?<!\d)00)\s?359(?:[\s.-]?\(0\))?(?:[\s.-]?\d){8,9}(?!\d)/g;
const CARD_CANDIDATE = /(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)/g;
// A mobile starts with three digits written together (088, 089...), which is
// how we tell it from a date like 08.11.2026 (two digits, then a dot).
const PHONE_MOBILE = /(?<!\d)0[89]\d(?:[\s.-]?\d){7}(?!\d)/g;
const PHONE_LANDLINE = /(?<!\d)0[2-7](?:[\s-]?\d){7,8}(?!\d)/g;
const EGN = /(?<!\d)\d{10}(?!\d)/g;

// The Luhn check that every real card number passes: from the right, double every
// second digit (subtract 9 if it is over 9), and the total must end in 0.
export function passesLuhn(digits: string): boolean {
  let total = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits.charAt(i));
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    total += digit;
    double = !double;
  }
  return digits.length > 0 && total % 10 === 0;
}

// Escapes characters that have a meaning in a regular expression, like re.escape().
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Step 7: the full names first, then each part of at least 3 letters,
// longest first, so "Мария Петрова" becomes one [ИМЕ], not two.
function redactNames(text: string, knownNames: string[]): string {
  const candidates = new Set<string>();
  for (const name of knownNames) {
    const full = name.trim().replace(/\s+/g, " ");
    if (full.length >= 2) candidates.add(full);
    for (const part of full.split(" ")) {
      if (part.length >= 3) candidates.add(part);
    }
  }
  const ordered = [...candidates].sort((a, b) => b.length - a.length);
  let result = text;
  for (const candidate of ordered) {
    // Whole words only: no letter or digit right before or after the name.
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(candidate).replace(/ /g, "\\s+")}(?![\\p{L}\\p{N}])`,
      "giu",
    );
    result = result.replace(pattern, REDACTION_LABELS.name);
  }
  return result;
}

// Steps 1–7. `knownNames: string[] = []` is a default value, like `known_names=()` in Python.
export function redactPersonalData(text: string, knownNames: string[] = []): string {
  let result = text;
  result = result.replace(EMAIL, REDACTION_LABELS.email);
  result = result.replace(IBAN_BG, REDACTION_LABELS.iban);
  result = result.replace(IBAN_ANY, REDACTION_LABELS.iban);
  result = result.replace(PHONE_INTERNATIONAL, REDACTION_LABELS.phone);
  // A replace "function" decides per match: card only if it really passes Luhn.
  result = result.replace(CARD_CANDIDATE, (match) => {
    const digits = match.replace(/\D/g, "");
    return passesLuhn(digits) ? REDACTION_LABELS.card : match;
  });
  result = result.replace(PHONE_MOBILE, REDACTION_LABELS.phone);
  result = result.replace(PHONE_LANDLINE, REDACTION_LABELS.phone);
  result = result.replace(EGN, REDACTION_LABELS.egn);
  return redactNames(result, knownNames);
}
