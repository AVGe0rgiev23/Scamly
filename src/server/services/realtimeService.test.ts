// Unit tests for the Realtime token rule (realtimeService.ts).

import { describe, expect, it } from "vitest";
import type { Actor } from "@/server/auth/actor";
import { issueRealtimeToken } from "@/server/services/realtimeService";

const ACTOR: Actor = {
  userId: "user-anna",
  role: "family",
  profile: {
    id: "user-anna",
    role: "family",
    display_name: "Анна",
    email_alerts: true,
    created_at: "",
  },
  device: null,
};

describe("issueRealtimeToken", () => {
  it("returns the access token and its expiry for the same account", () => {
    const token = issueRealtimeToken(ACTOR, {
      userId: "user-anna",
      accessToken: "access-token",
      expiresAt: 1_800_000_000,
    });
    expect(token).toEqual({
      userId: "user-anna",
      accessToken: "access-token",
      expiresAt: 1_800_000_000,
    });
  });

  it("refuses with 401 when there is no session, or it belongs to another account", () => {
    expect(() => issueRealtimeToken(ACTOR, null)).toThrow();
    try {
      issueRealtimeToken(ACTOR, { userId: "user-eve", accessToken: "x", expiresAt: 1 });
      throw new Error("expected an error");
    } catch (error) {
      expect(error).toMatchObject({ status: 401, code: "unauthorized" });
    }
  });

  it("refuses a session without an expiry time", () => {
    expect(() =>
      issueRealtimeToken(ACTOR, { userId: "user-anna", accessToken: "x", expiresAt: undefined }),
    ).toThrow();
  });
});
