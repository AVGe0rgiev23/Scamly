// Database queries for the alerts table: one row per (check, family member, channel).
//
// Only the server writes alerts (admin client, BUILD_PLAN 2.4 use 4: alertService
// creates rows for OTHER users, which no RLS policy could allow). Family members read
// their own alerts through RLS and receive new rows live through Realtime.

import type { DbClient } from "@/server/supabase/userClient";
import type { Database } from "@/types/database";

// "realtime" | "push" | "email" and "pending" | "sent" | "failed" (database enums).
export type AlertChannelName = Database["public"]["Enums"]["alert_channel"];
export type AlertStatus = Database["public"]["Enums"]["alert_status"];

// The database allows at most 500 characters of error text.
const MAX_ERROR_LENGTH = 500;

// One new alerts row (like a Python dataclass).
export type NewAlert = {
  checkId: string;
  recipientId: string;
  channel: AlertChannelName;
  status: AlertStatus;
  error: string | null; // why delivery failed, or null
  sentAt: Date | null; // null when it was not delivered
};

// Writes several new alerts rows in one INSERT.
export async function insertAlerts(admin: DbClient, alerts: NewAlert[]): Promise<void> {
  const rows = alerts.map((alert) => ({
    check_id: alert.checkId,
    recipient_id: alert.recipientId,
    channel: alert.channel,
    status: alert.status,
    error: alert.error === null ? null : alert.error.slice(0, MAX_ERROR_LENGTH),
    sent_at: alert.sentAt === null ? null : alert.sentAt.toISOString(),
  }));
  const { error } = await admin.from("alerts").insert(rows);
  if (error) {
    throw new Error(`insertAlerts failed: ${error.message}`);
  }
}
