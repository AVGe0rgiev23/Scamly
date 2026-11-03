// Unit tests for the role rule (checkRole) and for loadActor (who is calling?),
// with fake data instead of Supabase.

import { describe, expect, it } from "vitest";
import { loadActor, type Actor, type ActorReader } from "@/server/auth/actor";
import { checkRole } from "@/server/auth/requireRole";
import type { ProfileRow } from "@/server/repositories/profilesRepository";
import type { AppRole } from "@/config/routes";

function profile(id: string, role: AppRole): ProfileRow {
  return {
    id,
    role,
    display_name: "Иван",
    email_alerts: true,
    created_at: "2026-11-03T10:00:00Z",
  };
}

function actor(role: AppRole): Actor {
  return { userId: "u1", role, profile: profile("u1", role), device: null };
}

describe("checkRole", () => {
  it("lets an allowed role through and returns the actor", () => {
    const family = actor("family");
    expect(checkRole(family, ["family"])).toBe(family);
    expect(checkRole(actor("admin"), ["moderator", "admin"]).role).toBe("admin");
  });

  it("answers 401 for a guest", () => {
    expect(() => checkRole(null, ["family"])).toThrow(expect.objectContaining({ status: 401 }));
  });

  it("answers 403 for a logged-in person with the wrong role", () => {
    expect(() => checkRole(actor("family"), ["admin"])).toThrow(
      expect.objectContaining({ status: 403, code: "forbidden" }),
    );
    expect(() => checkRole(actor("protected"), ["family"])).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });
});

// A fake reader: who is logged in, their profile, and their device row (if any).
function reader(options: {
  userId: string | null;
  profile: ProfileRow | null;
  device: { id: string; protected_person_id: string } | null;
}): ActorReader {
  return {
    getUserId: async () => options.userId,
    getProfile: async () => options.profile,
    getOwnDevice: async () => options.device,
  };
}

describe("loadActor", () => {
  it("returns null for a guest", async () => {
    expect(await loadActor(reader({ userId: null, profile: null, device: null }))).toBeNull();
  });

  it("returns null when the account has no profile (e.g. it was just deleted)", async () => {
    expect(await loadActor(reader({ userId: "u1", profile: null, device: null }))).toBeNull();
  });

  it("returns the role and profile of a family member", async () => {
    const result = await loadActor(
      reader({ userId: "u1", profile: profile("u1", "family"), device: null }),
    );
    expect(result).toMatchObject({ userId: "u1", role: "family", device: null });
  });

  it("returns the device and its protected person for a paired phone", async () => {
    const result = await loadActor(
      reader({
        userId: "d1",
        profile: profile("d1", "protected"),
        device: { id: "dev-1", protected_person_id: "p1" },
      }),
    );
    expect(result?.device).toEqual({ id: "dev-1", protectedPersonId: "p1" });
  });

  it("treats a phone whose device row is gone or revoked as logged out", async () => {
    const result = await loadActor(
      reader({ userId: "d1", profile: profile("d1", "protected"), device: null }),
    );
    expect(result).toBeNull();
  });
});
