// Unit tests for the background upload with retries (upload.ts), with fake network
// calls and a fake sleep that only records how long it would wait (so the tests
// take milliseconds, not a minute).

import { describe, expect, it, vi } from "vitest";
import type { ApiResult } from "@/components/family/api";
import type { AnswersResultDto } from "@/schemas/checks";
import { EMPTY_ANSWERS } from "./questions";
import {
  ATTEMPT_TIMEOUT_MS,
  RETRY_DELAYS_MS,
  isRetryable,
  uploadAnswers,
  withTimeout,
  type UploadDeps,
} from "./upload";

const CHECK_ID = "e1000000-0000-4000-8000-000000000001";
const RESULT: AnswersResultDto = {
  checkId: CHECK_ID,
  verdict: {
    level: "red",
    score: 90,
    scriptType: "police",
    hardRules: ["HR1_POLICE_ASKS_MONEY"],
    reasons: [],
    headlineBg: "",
    adviceBg: "",
  },
  callContact: null,
};

function failure(status: number): ApiResult<AnswersResultDto> {
  return { ok: false, status, messageBg: "грешка" };
}

// Fake deps: `answers` are the PUT answers in order (one per try).
function fakeDeps(answers: ApiResult<AnswersResultDto>[], newCheckId: string | null = CHECK_ID) {
  const waits: number[] = [];
  const deps: UploadDeps = {
    startCheck: vi.fn(async () => newCheckId),
    sendAnswers: vi.fn(async () => answers.shift() ?? failure(0)),
    sleep: async (ms) => {
      waits.push(ms);
    },
  };
  return { deps, waits };
}

function hooks() {
  return { onCheckId: vi.fn(), onFirstFailure: vi.fn() };
}

describe("uploadAnswers", () => {
  it("returns the server verdict after one try, without the local fallback", async () => {
    const { deps } = fakeDeps([{ ok: true, status: 200, data: RESULT }]);
    const h = hooks();
    const outcome = await uploadAnswers(deps, Promise.resolve(CHECK_ID), EMPTY_ANSWERS, h);
    expect(outcome).toEqual({ kind: "ok", result: RESULT });
    expect(h.onFirstFailure).not.toHaveBeenCalled();
    expect(h.onCheckId).toHaveBeenCalledWith(CHECK_ID);
  });

  it("asks for the local verdict after the first failure, then retries with growing waits", async () => {
    const { deps, waits } = fakeDeps([
      failure(0),
      failure(503),
      { ok: true, status: 200, data: RESULT },
    ]);
    const h = hooks();
    const outcome = await uploadAnswers(deps, Promise.resolve(CHECK_ID), EMPTY_ANSWERS, h);
    expect(outcome.kind).toBe("ok");
    expect(h.onFirstFailure).toHaveBeenCalledTimes(1);
    // (each try also starts a 15 s time limit, left out here)
    const pauses = waits.filter((ms) => ms !== ATTEMPT_TIMEOUT_MS);
    expect(pauses).toEqual([0, RETRY_DELAYS_MS[0], RETRY_DELAYS_MS[1]]);
  });

  it("treats 409 as delivered: an earlier try reached the server after all", async () => {
    const { deps } = fakeDeps([failure(0), failure(409)]);
    const outcome = await uploadAnswers(deps, Promise.resolve(CHECK_ID), EMPTY_ANSWERS, hooks());
    expect(outcome).toEqual({ kind: "already", checkId: CHECK_ID });
  });

  it("starts a new check when the big button's POST had failed", async () => {
    const { deps } = fakeDeps([{ ok: true, status: 200, data: RESULT }]);
    const h = hooks();
    const outcome = await uploadAnswers(deps, Promise.resolve(null), EMPTY_ANSWERS, h);
    expect(outcome.kind).toBe("ok");
    expect(deps.startCheck).toHaveBeenCalledTimes(1);
    expect(h.onFirstFailure).toHaveBeenCalledTimes(1); // no check on the first try
  });

  it("stops at once when the server refuses for good (e.g. 401: the phone was removed)", async () => {
    const { deps } = fakeDeps([failure(401)]);
    const outcome = await uploadAnswers(deps, Promise.resolve(CHECK_ID), EMPTY_ANSWERS, hooks());
    expect(outcome).toEqual({ kind: "gave-up" });
    expect(deps.sendAnswers).toHaveBeenCalledTimes(1);
  });

  it("gives up after the last wait", async () => {
    const { deps } = fakeDeps([]);
    const outcome = await uploadAnswers(deps, Promise.resolve(CHECK_ID), EMPTY_ANSWERS, hooks());
    expect(outcome).toEqual({ kind: "gave-up" });
    expect(deps.sendAnswers).toHaveBeenCalledTimes(RETRY_DELAYS_MS.length + 1);
  });
});

describe("helpers", () => {
  it("retries only when a later try can succeed", () => {
    expect([0, 429, 500, 503].every(isRetryable)).toBe(true);
    expect([400, 401, 403, 404, 409].some(isRetryable)).toBe(false);
  });

  it("withTimeout says „late“ when the promise takes too long", async () => {
    const never = new Promise<string>(() => undefined);
    expect(await withTimeout(never, 10, async () => undefined)).toBe("late");
    expect(await withTimeout(Promise.resolve("done"), 10, () => new Promise(() => undefined))).toBe(
      "done",
    );
  });
});
