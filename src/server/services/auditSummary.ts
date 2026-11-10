// A short, safe Bulgarian summary of one audit_log line's `details` (W3-06), e.g.
//   role_changed  { from: "family", to: "moderator" }        -> „Семейство → Модератор“
//   script_updated { slug: "politsai", fields: [...], ... }  -> „адрес: politsai · променени полета: 2 · публикувана“
//
// Only an ALLOW-LIST of keys is shown, never ids, codes, hashes or dates: `details`
// may hold ids of people (protected_person_id, invite_id), and the admin page should
// not become a way to collect them. Unknown keys are simply left out.

import { fill } from "@/components/family/format";
import { bg } from "@/i18n/bg";
import type { Json } from "@/types/database";

export const MAX_SUMMARY_LENGTH = 160;

// The Bulgarian name of a role, or null for something that is not a role.
function roleName(value: Json | undefined): string | null {
  if (typeof value === "string" && value in bg.admin.roleNames) {
    return bg.admin.roleNames[value as keyof typeof bg.admin.roleNames];
  }
  return null;
}

// A slug as we store it: Latin lower case, digits, hyphens (anything else is dropped).
function safeSlug(value: Json | undefined): string | null {
  return typeof value === "string" && /^[a-z0-9-]{1,60}$/.test(value) ? value : null;
}

function safeCount(value: Json | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 1000
    ? value
    : null;
}

export function summarizeAuditDetails(details: Json): string {
  if (typeof details !== "object" || details === null || Array.isArray(details)) {
    return "";
  }
  const parts: string[] = [];
  const text = bg.admin.summary;

  const from = roleName(details.from);
  const to = roleName(details.to);
  if (from !== null && to !== null) {
    parts.push(fill(text.roleChange, { from, to }));
  }
  const slug = safeSlug(details.slug);
  if (slug !== null) {
    parts.push(fill(text.slug, { slug }));
  }
  if (Array.isArray(details.fields)) {
    parts.push(fill(text.fields, { count: details.fields.length }));
  }
  if (typeof details.published === "boolean") {
    parts.push(details.published ? text.published : text.draft);
  }
  const priority = safeCount(details.priority);
  if (priority !== null) {
    parts.push(fill(text.priority, { priority }));
  }
  const devices = safeCount(details.devices_revoked);
  if (devices !== null) {
    parts.push(fill(text.devicesRevoked, { count: devices }));
  }
  if (details.reason === "person_deleted") {
    parts.push(text.personDeleted);
  }
  if (details.linked_existing_contact === true) {
    parts.push(text.linkedExisting);
  }

  const summary = parts.join(" · ");
  return summary.length > MAX_SUMMARY_LENGTH
    ? `${summary.slice(0, MAX_SUMMARY_LENGTH - 1)}…`
    : summary;
}
