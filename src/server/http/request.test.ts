// Unit tests for request.ts: reading the JSON body and the caller's IP address.

import { describe, expect, it } from "vitest";
import { getClientIp, readJsonBody } from "@/server/http/request";

function post(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/test", { method: "POST", body, headers });
}

describe("readJsonBody", () => {
  it("returns the parsed JSON", async () => {
    expect(await readJsonBody(post('{"code":"482915"}'))).toEqual({ code: "482915" });
  });

  it("answers 400 invalid_json for a body that is not JSON", async () => {
    await expect(readJsonBody(post("code=482915"))).rejects.toMatchObject({
      status: 400,
      code: "invalid_json",
    });
  });
});

describe("getClientIp", () => {
  it("prefers x-real-ip", () => {
    const request = post("{}", { "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" });
    expect(getClientIp(request)).toBe("203.0.113.7");
  });

  it("takes the first address of x-forwarded-for (the original caller)", () => {
    const request = post("{}", { "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(getClientIp(request)).toBe("203.0.113.7");
  });

  it('uses "unknown" when there is no address at all (local development)', () => {
    expect(getClientIp(post("{}"))).toBe("unknown");
  });
});
