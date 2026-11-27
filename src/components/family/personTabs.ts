// The two tabs of one person's page (P-10) and their part of the address after "#".
// Pure (no React), so personTabs.test.ts checks the old links too.
//
//   contacts  „Кой е истинският“   #blizki     (the everyday view, the default)
//   settings  „Настройки“          #nastroyki  (phones, history, name and district)

// Like a Python Literal["contacts", "settings"].
export type TabId = "contacts" | "settings";

// The tab <-> the address part (Latin letters, like our routes).
export const HASH_OF: Record<TabId, string> = {
  contacts: "blizki",
  settings: "nastroyki",
};

// Links from before P-10, when the history and the phones had a tab each.
const OLD_SETTINGS_HASHES = ["proverki", "telefoni"];

export function tabFromHash(hash: string): TabId {
  const wanted = hash.replace(/^#/, "");
  if (OLD_SETTINGS_HASHES.includes(wanted)) return "settings";
  // Object.keys gives plain strings; `as` tells TypeScript they are tab ids.
  const found = (Object.keys(HASH_OF) as TabId[]).find((id) => HASH_OF[id] === wanted);
  return found ?? "contacts";
}
