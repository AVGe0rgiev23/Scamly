// Unit tests for the rate limiter in rateLimit.ts, with a fake counter instead of
// the database (the SQL function itself is tested in supabase/tests/08_functions).

import { describe, expect, it } from "vitest";
import {
  enforceRateLimit,
  hitRateLimit,
  ipKey,
  RATE_LIMITS,
  type HitCounter,
} from "@/server/security/rateLimit";

// A fake hit_rate_limit(): counts hits per key in memory (one endless window).
function fakeCounter(): { counter: HitCounter; keys: string[] } {
  const hits = new Map<string, number>(); // like a Python dict[str, int]
  const keys: string[] = [];
  const counter: HitCounter = async (key, maxHits) => {
    keys.push(key);
    const count = (hits.get(key) ?? 0) + 1;
    hits.set(key, count);
    return count <= maxHits;
  };
  return { counter, keys };
}

describe("ipKey", () => {
  it("never puts the real IP into the key, only its HMAC", () => {
    const key = ipKey(RATE_LIMITS.pairPerIp, "203.0.113.7", "x".repeat(32));
    expect(key.startsWith("pair:ip:")).toBe(true);
    expect(key).not.toContain("203.0.113.7");
    expect(key).toHaveLength("pair:ip:".length + 64);
  });

  it("gives different IPs different keys", () => {
    const pepper = "x".repeat(32);
    expect(ipKey(RATE_LIMITS.pairPerIp, "203.0.113.7", pepper)).not.toBe(
      ipKey(RATE_LIMITS.pairPerIp, "203.0.113.8", pepper),
    );
  });
});

describe("hitRateLimit", () => {
  it("allows 5 pairing tries per IP and blocks the 6th", async () => {
    const { counter } = fakeCounter();
    const rule = RATE_LIMITS.pairPerIp;
    const results: string[] = [];
    for (let i = 0; i < 6; i++) {
      results.push(await hitRateLimit(counter, rule, "pair:ip:abc"));
    }
    expect(results).toEqual(["allowed", "allowed", "allowed", "allowed", "allowed", "blocked"]);
  });

  it("counts each key on its own", async () => {
    const { counter } = fakeCounter();
    const rule = RATE_LIMITS.pairPerIp;
    for (let i = 0; i < 5; i++) {
      await hitRateLimit(counter, rule, "pair:ip:first");
    }
    expect(await hitRateLimit(counter, rule, "pair:ip:second")).toBe("allowed");
  });
});

describe("enforceRateLimit", () => {
  it("throws 429 when blocked", async () => {
    const { counter } = fakeCounter();
    const rule = { name: "test", maxHits: 1, windowSeconds: 60 };
    await enforceRateLimit(counter, rule, "test:key");
    await expect(enforceRateLimit(counter, rule, "test:key")).rejects.toMatchObject({
      status: 429,
      code: "rate_limited",
    });
  });
});

describe("RATE_LIMITS", () => {
  it("keeps the pairing limits of BUILD_PLAN section 5", () => {
    expect(RATE_LIMITS.pairPerIp).toMatchObject({ maxHits: 5, windowSeconds: 900 });
    expect(RATE_LIMITS.pairGlobal).toMatchObject({ maxHits: 100, windowSeconds: 900 });
  });

  it("uses windows the SQL function accepts (1 to 3600 seconds)", () => {
    for (const rule of Object.values(RATE_LIMITS)) {
      expect(rule.windowSeconds).toBeGreaterThanOrEqual(1);
      expect(rule.windowSeconds).toBeLessThanOrEqual(3600);
    }
  });
});
