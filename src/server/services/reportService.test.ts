// Unit tests for anonymous public reports (reportService.ts, POST /api/reports, W3-01),
// with fakes instead of Supabase: an in-memory rate-limit counter that behaves like
// hit_rate_limit(), and an array instead of the reports table.

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { ApiError } from "@/server/http/errors";
import type { NewReport } from "@/server/repositories/reportsRepository";
import { hmacSha256 } from "@/server/security/hash";
import { submitReport, type ReportDeps } from "@/server/services/reportService";

const PEPPER = "test-pepper-test-pepper-test-pepper-0123";
// 10:00 in Sofia on 9 Nov 2026.
const NOW = new Date("2026-11-09T08:00:00Z");
const VALID = {
  districtCode: "BG-02",
  scriptType: "police",
  occurredOn: "2026-11-08",
  website: "",
};

function fakeDeps() {
  const stored: NewReport[] = [];
  const hits = new Map<string, number>(); // key -> attempts so far (one window)
  const deps: ReportDeps = {
    now: () => NOW,
    hashPepper: PEPPER,
    // Like hit_rate_limit(): count the attempt, allowed while within the limit.
    hitCounter: async (key, maxHits) => {
      const count = (hits.get(key) ?? 0) + 1;
      hits.set(key, count);
      return count <= maxHits;
    },
    insertReport: async (report) => {
      stored.push(report);
    },
  };
  return { deps, stored, hits };
}

// Runs a promise that should fail and returns the error (like pytest.raises).
async function failure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to fail");
}

describe("submitReport (POST /api/reports)", () => {
  it("stores a valid report as given, with no description and no number", async () => {
    const { deps, stored } = fakeDeps();

    const result = await submitReport(deps, VALID, "203.0.113.7");

    expect(result).toEqual({ ok: true });
    expect(stored).toEqual([
      {
        districtCode: "BG-02",
        scriptType: "police",
        occurredOn: "2026-11-08",
        descriptionRedacted: null,
        callerNumberHash: null,
      },
    ]);
  });

  it("removes personal data from the description BEFORE it reaches the repository", async () => {
    const { deps, stored } = fakeDeps();

    await submitReport(
      deps,
      {
        ...VALID,
        description: "Обадиха се от 0888 123 456, искаха пари по IBAN BG80BNBG96611020345678.",
      },
      "203.0.113.7",
    );

    expect(stored[0]?.descriptionRedacted).toBe(
      "Обадиха се от [ТЕЛЕФОН], искаха пари по IBAN [IBAN].",
    );
  });

  it("stores only the HMAC of the normalised number, never the number itself", async () => {
    const { deps, stored } = fakeDeps();

    await submitReport(deps, { ...VALID, callerNumber: "088 812 3456" }, "203.0.113.7");

    const report = stored[0];
    expect(report?.callerNumberHash).toBe(hmacSha256("+359888123456", PEPPER));
    // Two spellings of the same number give the same hash (so moderators can match them).
    await submitReport(deps, { ...VALID, callerNumber: "+359 88 812 3456" }, "203.0.113.8");
    expect(stored[1]?.callerNumberHash).toBe(report?.callerNumberHash);
    // The number appears nowhere in what was stored.
    expect(JSON.stringify(stored)).not.toMatch(/888\s?123|8123456/);
  });

  it("answers 201-style { ok: true } for a filled honeypot but stores nothing", async () => {
    const { deps, stored, hits } = fakeDeps();

    const result = await submitReport(
      deps,
      { ...VALID, website: "https://cheap-pills.example" },
      "203.0.113.7",
    );

    expect(result).toEqual({ ok: true }); // exactly the same answer as a real report
    expect(stored).toEqual([]);
    // The bot used up its own IP's attempts, but not the global cap of real people.
    expect([...hits.keys()].some((key) => key.startsWith("report:ip:"))).toBe(true);
    expect(hits.has("report:global")).toBe(false);
  });

  it("answers 429 for the 4th report from one IP in an hour, and stores only 3", async () => {
    const { deps, stored } = fakeDeps();
    for (let i = 0; i < 3; i++) {
      await submitReport(deps, VALID, "203.0.113.7");
    }

    const error = await failure(submitReport(deps, VALID, "203.0.113.7"));

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(429);
    expect(stored).toHaveLength(3);
    // Another IP is not affected.
    await submitReport(deps, VALID, "198.51.100.1");
    expect(stored).toHaveLength(4);
  });

  it("never uses the raw IP as a key (only its HMAC)", async () => {
    const { deps, hits } = fakeDeps();

    await submitReport(deps, VALID, "203.0.113.7");

    const keys = [...hits.keys()];
    expect(keys).toContain(`report:ip:${hmacSha256("203.0.113.7", PEPPER)}`);
    expect(keys.join(" ")).not.toContain("203.0.113.7");
  });

  it("stops at the global cap of 100 stored reports per hour", async () => {
    const { deps, stored, hits } = fakeDeps();
    hits.set("report:global", 100);

    const error = await failure(submitReport(deps, VALID, "203.0.113.7"));

    expect((error as ApiError).status).toBe(429);
    expect(stored).toEqual([]);
  });

  it("rejects invalid input (400) before counting it against the limit", async () => {
    const { deps, stored, hits } = fakeDeps();

    const error = await failure(
      submitReport(deps, { ...VALID, occurredOn: "2026-11-10" }, "203.0.113.7"),
    );

    expect(error).toBeInstanceOf(ZodError);
    expect(stored).toEqual([]);
    expect(hits.size).toBe(0);
  });
});
