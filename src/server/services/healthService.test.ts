// Unit tests for the health check (healthService.ts), behind GET /api/health.
//
// The service gets a fake database query and a fake clock, so these tests need no
// Supabase project and no network. The real route is checked by
// tests/e2e/health.spec.ts and by hand against the live project (HOW_IT_WORKS 3.22).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkHealth, type HealthDeps } from "@/server/services/healthService";

const NOW = new Date("2026-11-09T10:00:00.000Z");

// Builds the dependencies. `ping` decides what the fake database does.
function deps(ping: () => Promise<void>): HealthDeps {
  return { pingDatabase: ping, now: () => NOW };
}

describe("checkHealth", () => {
  // The service logs failures with console.error. We replace it with a spy (a fake
  // that records its calls, like unittest.mock in Python) so the test output stays clean.
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("answers ok with the current time when the database query works", async () => {
    const result = await checkHealth(deps(async () => {}));
    expect(result).toEqual({ ok: true, db: true, time: "2026-11-09T10:00:00.000Z" });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("runs the database query exactly once per check", async () => {
    let calls = 0;
    await checkHealth(
      deps(async () => {
        calls += 1;
      }),
    );
    expect(calls).toBe(1);
  });

  it("answers not ok when the database query fails", async () => {
    const result = await checkHealth(
      deps(async () => {
        throw new Error("pingDistricts failed: FetchError: fetch failed");
      }),
    );
    expect(result).toEqual({ ok: false, db: false });
  });

  it("never puts the error text into the answer, only into the server log", async () => {
    const secretLooking = "connect to db.abcdefgh.supabase.co failed";
    const result = await checkHealth(
      deps(async () => {
        throw new Error(secretLooking);
      }),
    );
    expect(JSON.stringify(result)).not.toContain("supabase.co");
    expect(Object.keys(result).sort()).toEqual(["db", "ok"]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0]?.[1])).toContain(secretLooking);
  });

  it("answers not ok when the Supabase settings are missing (creating the client throws)", async () => {
    const result = await checkHealth(
      deps(async () => {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      }),
    );
    expect(result).toEqual({ ok: false, db: false });
  });

  it("answers not ok when something that is not an Error is thrown", async () => {
    const result = await checkHealth(
      deps(async () => {
        throw "timeout";
      }),
    );
    expect(result).toEqual({ ok: false, db: false });
    expect(String(errorSpy.mock.calls[0]?.[1])).toBe("timeout");
  });
});
