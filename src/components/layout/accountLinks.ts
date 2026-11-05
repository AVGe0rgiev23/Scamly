// What the header menu shows for a logged-in person: the link to their own area
// (by role) and whether the „Изход“ button is shown.
// Plain functions without React or Supabase, so they can be unit-tested.

import { homePathForRole, type AppRole } from "@/config/routes";
import { bg } from "@/i18n/bg";

// One menu entry: where it goes and its text.
export type NavLink = { href: string; label: string };

// The text of the area link for each role. `Record<AppRole, string>` is an object
// with exactly one key per role, like a Python dict that must have all four keys.
const AREA_LABELS: Record<AppRole, string> = {
  family: bg.layout.accountFamily,
  moderator: bg.layout.accountModerator,
  admin: bg.layout.accountAdmin,
  protected: bg.layout.accountProtected,
};

// The link to the person's own area: the same start page that opens after login.
export function accountLinkFor(role: AppRole): NavLink {
  return { href: homePathForRole(role), label: AREA_LABELS[role] };
}

// The older person's phone never shows „Изход“: one wrong tap would log it out, and
// only a family member can pair it again (BUILD_PLAN section 5).
export function showsLogout(role: AppRole): boolean {
  return role !== "protected";
}
