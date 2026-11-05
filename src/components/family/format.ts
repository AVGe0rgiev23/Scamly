// Small helpers that turn API values into Bulgarian text for the family pages.
// Pure functions (no React, no browser), so they are unit-tested in format.test.ts.

import { bg } from "@/i18n/bg";

// "BG-16" -> „Пловдив“. `in` checks that the key exists, like Python's `key in dict`.
export function districtName(code: string): string {
  if (code in bg.districts) {
    return bg.districts[code as keyof typeof bg.districts];
  }
  return bg.family.unknownDistrict;
}

// The 28 districts as a list for a <select>, in the order BG-01 … BG-28.
export function districtOptions(): { code: string; name: string }[] {
  return Object.entries(bg.districts).map(([code, name]) => ({ code, name }));
}

// Puts values into a text with {placeholders}, e.g.
// fill("{name} е на място {n}.", { name: "Иван", n: 2 }) -> „Иван е на място 2.“
// (like Python's str.format with keyword arguments).
export function fill(template: string, values: Record<string, string | number>): string {
  let text = template;
  for (const [key, value] of Object.entries(values)) {
    text = text.replaceAll(`{${key}}`, String(value));
  }
  return text;
}

// An ISO date from the API -> „5 ноември 2026 г., 14:30 ч.“ in Bulgarian time
// (Europe/Sofia), whatever time zone the phone or computer is set to.
export function formatDateTime(iso: string): string {
  const moment = new Date(iso);
  const date = new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(moment);
  const time = new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(moment);
  return fill(bg.family.dateTime, { date, time });
}
