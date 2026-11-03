// getActor(): "who is calling?" for API routes and pages.
//
// Returns { userId, role, profile, device } for a logged-in caller, or null for a
// guest. Every API route starts with this (through requireRole), BUILD_PLAN 3.
//
// How it decides:
//   1. Ask Supabase Auth who owns the session cookie (auth.getUser()). This is a
//      call to the Auth server, not just reading the cookie: a DELETED account
//      (e.g. a revoked phone) is rejected here even if its old token has not
//      expired yet.
//   2. Read that person's profile (role, display name) with the USER client.
//   3. For a phone (role 'protected'): also read its device row. RLS hides a
//      revoked device's row, so a revoked phone counts as logged out.

import "server-only";
import type { AppRole } from "@/config/routes";
import { findOwnDevice } from "@/server/repositories/devicesRepository";
import { findProfileById, type ProfileRow } from "@/server/repositories/profilesRepository";
import { createUserClient, type DbClient } from "@/server/supabase/userClient";

export type Actor = {
  userId: string;
  role: AppRole;
  profile: ProfileRow;
  // Only for a paired phone: its device and the protected person it belongs to.
  device: { id: string; protectedPersonId: string } | null;
};

// The three questions getActor asks. The real answers come from Supabase; tests
// pass fake answers (like a Python Protocol with three async methods).
export type ActorReader = {
  getUserId: () => Promise<string | null>;
  getProfile: (userId: string) => Promise<ProfileRow | null>;
  getOwnDevice: (userId: string) => Promise<{ id: string; protected_person_id: string } | null>;
};

// The logic of getActor, without Supabase (so it can be unit-tested).
export async function loadActor(reader: ActorReader): Promise<Actor | null> {
  const userId = await reader.getUserId();
  if (userId === null) {
    return null;
  }

  const profile = await reader.getProfile(userId);
  if (profile === null) {
    return null;
  }

  if (profile.role !== "protected") {
    return { userId, role: profile.role, profile, device: null };
  }

  const device = await reader.getOwnDevice(userId);
  if (device === null) {
    return null;
  }
  return {
    userId,
    role: profile.role,
    profile,
    device: { id: device.id, protectedPersonId: device.protected_person_id },
  };
}

// The real answers, from the user-scoped client (RLS applies).
export function supabaseActorReader(client: DbClient): ActorReader {
  return {
    getUserId: async () => {
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) {
        return null;
      }
      return data.user.id;
    },
    getProfile: (userId) => findProfileById(client, userId),
    getOwnDevice: (userId) => findOwnDevice(client, userId),
  };
}

// Who is calling this request? null = guest (or a revoked / deleted account).
// Pass a client if the route already has one; otherwise a new user client is made.
export async function getActor(client?: DbClient): Promise<Actor | null> {
  const supabase = client ?? (await createUserClient());
  return loadActor(supabaseActorReader(supabase));
}
