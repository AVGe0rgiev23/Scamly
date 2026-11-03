// Writes to the audit_log table: an append-only list of important actions
// (pairing, revoking devices, later role changes and moderation).
// Only the server writes it (admin client, BUILD_PLAN 2.4 use 6); nobody, not even
// the service role, can change or delete a row (migration 4).

import type { DbClient } from "@/server/supabase/userClient";
import type { Json } from "@/types/database";

export type AuditEntry = {
  actorId: string | null; // who did it (a profile id), null = a guest
  action: string; // e.g. "device_paired"
  targetType: string; // e.g. "device"
  targetId: string;
  details: { [key: string]: Json }; // extra facts, never secrets or codes
};

export async function writeAudit(admin: DbClient, entry: AuditEntry): Promise<void> {
  const { error } = await admin.from("audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    details: entry.details,
  });
  if (error) {
    throw new Error(`writeAudit failed: ${error.message}`);
  }
}
