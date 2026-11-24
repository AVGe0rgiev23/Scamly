// Assemble a family export with explicit fields and caller-scoped Supabase reads.
import "server-only";
import type { DbClient } from "@/server/supabase/userClient";
import { unauthorized } from "@/server/http/errors";

// Like a Python page iterator, but returns the collected rows as one list.
const PAGE_SIZE = 200;
async function collectRows<Row>(
  readPage: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: unknown }>,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await readPage(from, from + PAGE_SIZE - 1);
    if (error || data === null) throw new Error("Account export query failed");
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

export async function exportFamilyData(client: DbClient, userId: string, email: string | null) {
  const { data: profile, error } = await client
    .from("profiles")
    .select("id, display_name, email_alerts, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Account export profile query failed");
  if (!profile) throw unauthorized();

  const [people, contactMemberships, alerts] = await Promise.all([
    collectRows((from, to) =>
      client
        .from("protected_persons")
        .select("id, display_name, district_code, created_at")
        .eq("owner_id", userId)
        .order("id")
        .range(from, to),
    ),
    collectRows((from, to) =>
      client
        .from("trusted_contacts")
        .select("id, protected_person_id, display_name, phone, priority, created_at")
        .eq("user_id", userId)
        .order("id")
        .range(from, to),
    ),
    collectRows((from, to) =>
      client
        .from("alerts")
        .select("id, check_id, channel, status, escalation_step, created_at, sent_at")
        .eq("recipient_id", userId)
        .order("id")
        .range(from, to),
    ),
  ]);

  const protectedPeople = [];
  for (const person of people) {
    const [contacts, invites, devices, checks] = await Promise.all([
      collectRows((from, to) =>
        client
          .from("trusted_contacts")
          .select("id, display_name, phone, priority, created_at")
          .eq("protected_person_id", person.id)
          .order("id")
          .range(from, to),
      ),
      collectRows((from, to) =>
        client
          .from("contact_invites")
          .select("id, display_name, priority, created_at, expires_at, used_at")
          .eq("protected_person_id", person.id)
          .order("id")
          .range(from, to),
      ),
      collectRows((from, to) =>
        client
          .from("devices")
          .select("id, label, paired_at, last_seen_at, revoked_at")
          .eq("protected_person_id", person.id)
          .order("id")
          .range(from, to),
      ),
      collectRows((from, to) =>
        client
          .from("checks")
          .select(
            "id, device_id, status, claimed_identity, asks_money, handover, rushing, secrecy, text_redacted, score, risk_level, script_type, hard_rules, reason_codes, engine_version, started_at, answered_at, acknowledged_at",
          )
          .eq("protected_person_id", person.id)
          .order("id")
          .range(from, to),
      ),
    ]);
    protectedPeople.push({ ...person, contacts, invites, devices, checks });
  }
  return { profile: { ...profile, email }, protectedPeople, contactMemberships, alerts };
}
