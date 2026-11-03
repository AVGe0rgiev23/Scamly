// Database queries for the devices table (paired phones of protected persons).

import type { DbClient } from "@/server/supabase/userClient";

// The fields we need about a device.
export type DeviceRef = {
  id: string;
  user_id: string;
  protected_person_id: string;
};

// The caller's own, not revoked device row, or null (user client: RLS shows a device
// only its own row, and only while revoked_at is null).
export async function findOwnDevice(client: DbClient, userId: string): Promise<DeviceRef | null> {
  const { data, error } = await client
    .from("devices")
    .select("id, user_id, protected_person_id")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) {
    throw new Error(`findOwnDevice failed: ${error.message}`);
  }
  return data;
}

// One device by id, or null when it doesn't exist OR the caller may not see it
// (user client: RLS shows family members only the devices of their persons).
export async function findDeviceById(
  client: DbClient,
  deviceId: string,
): Promise<DeviceRef | null> {
  const { data, error } = await client
    .from("devices")
    .select("id, user_id, protected_person_id")
    .eq("id", deviceId)
    .maybeSingle();
  if (error) {
    throw new Error(`findDeviceById failed: ${error.message}`);
  }
  return data;
}

// Binds a new device account to a protected person (pairing only, admin client:
// there is no INSERT policy on devices for browsers). Returns the new device id.
export async function insertDevice(
  admin: DbClient,
  device: { protectedPersonId: string; userId: string; label: string | null },
): Promise<string> {
  const { data, error } = await admin
    .from("devices")
    .insert({
      protected_person_id: device.protectedPersonId,
      user_id: device.userId,
      label: device.label,
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`insertDevice failed: ${error.message}`);
  }
  return data.id;
}
