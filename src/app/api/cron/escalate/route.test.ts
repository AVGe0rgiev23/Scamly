// Tests the scheduler endpoint's authorization and feature switch without a database.
import { afterEach, describe, expect, it, vi } from "vitest";
import { escalateAlerts } from "@/server/services/alertService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { POST } from "./route";

vi.mock(import("@/server/services/alertService"), async (original) => ({
  ...(await original()),
  escalateAlerts: vi.fn(),
}));
vi.mock(import("@/server/supabase/adminClient"), () => ({
  createAdminClient: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

function request(authorization?: string): Request {
  return new Request("https://example.invalid/api/cron/escalate", {
    method: "POST",
    headers: authorization === undefined ? {} : { Authorization: authorization },
  });
}

describe("POST /api/cron/escalate", () => {
  it("rejects missing and incorrect credentials without creating an admin client", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("FEATURE_ESCALATION", "true");

    expect((await POST(request())).status).toBe(401);
    expect((await POST(request("Bearer wrong"))).status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("does no work when the feature is switched off", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("FEATURE_ESCALATION", "false");

    const result = await POST(request("Bearer test-cron-secret"));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ dispatched: 0 });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("dispatches due alerts for the configured scheduler", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("FEATURE_ESCALATION", "true");
    vi.mocked(escalateAlerts).mockResolvedValue(2);

    const result = await POST(request("Bearer test-cron-secret"));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ dispatched: 2 });
    expect(createAdminClient).toHaveBeenCalledOnce();
    expect(escalateAlerts).toHaveBeenCalledOnce();
  });
});
