// Unit tests for errors.ts: every thrown thing becomes a safe { error: { code, messageBg } }.

import { describe, expect, it, vi } from "vitest";
import { z } from "@/lib/zod";
import { bg } from "@/i18n/bg";
import {
  ApiError,
  forbidden,
  handleApiError,
  json,
  notFound,
  tooManyRequests,
  unauthorized,
} from "@/server/http/errors";

describe("json", () => {
  it("answers JSON with the given status and never lets it be cached", async () => {
    const response = json({ ok: true }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe("handleApiError", () => {
  it("turns an ApiError into its status, code and Bulgarian message", async () => {
    const response = handleApiError(new ApiError(400, "invalid_code", bg.pairing.invalidCode));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "invalid_code", messageBg: bg.pairing.invalidCode },
    });
  });

  it("maps the shortcuts to 401, 403, 404 and 429", () => {
    expect(handleApiError(unauthorized()).status).toBe(401);
    expect(handleApiError(forbidden()).status).toBe(403);
    expect(handleApiError(notFound()).status).toBe(404);
    expect(handleApiError(tooManyRequests()).status).toBe(429);
  });

  it("turns a Zod error into 400 with the schema's Bulgarian message and the field names", async () => {
    const schema = z.object({ name: z.string().min(1, { error: "Въведете име." }) });
    const result = schema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    const response = handleApiError(result.error);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "validation", messageBg: "Въведете име.", fields: ["name"] },
    });
  });

  it("hides unexpected errors behind a friendly 500 without the stack trace", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = handleApiError(new Error("database exploded at line 42"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: { code: "internal", messageBg: bg.errors.internal } });
    expect(JSON.stringify(body)).not.toContain("line 42");
    log.mockRestore();
  });
});
