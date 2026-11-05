// Sends the answers to the server with retries, for the offline fallback
// (BUILD_PLAN 4.9). CallCheck shows the phone's own verdict (analyseCall) when the
// first try fails or takes longer than 4 s; this code keeps trying in the
// background, so the family still gets the verdict when the network comes back.
//
// The network calls and the waiting are passed in ("deps"), so the unit tests
// (upload.test.ts) can replace them with fakes, like passing mock objects in Python.

import type { ApiResult } from "@/components/family/api";
import type { AnswersResultDto } from "@/schemas/checks";
import type { CheckAnswers } from "./questions";

// After this long without a server verdict, the phone shows its own one.
export const LOCAL_FALLBACK_MS = 4_000;
// One try is given up after this long (the request may still arrive; see "already").
export const ATTEMPT_TIMEOUT_MS = 15_000;
// The waits between tries ("backoff": each wait is longer), so 6 tries in about a minute.
export const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 15_000, 30_000];

export type UploadDeps = {
  startCheck: () => Promise<string | null>; // POST /api/checks -> id (null = failed)
  sendAnswers: (checkId: string, answers: CheckAnswers) => Promise<ApiResult<AnswersResultDto>>;
  sleep: (ms: number) => Promise<void>;
};

export type UploadHooks = {
  onCheckId: (checkId: string) => void; // we know the check's id (to watch it live)
  onFirstFailure: () => void; // the first try failed: show the local verdict now
};

// How it ended:
//   ok      the server answered with its verdict
//   already the server had the answers already (an earlier try arrived after all)
//   gave-up every try failed, or the server refused for good (e.g. the phone was removed)
export type UploadOutcome =
  | { kind: "ok"; result: AnswersResultDto }
  | { kind: "already"; checkId: string }
  | { kind: "gave-up" };

// One try's result: done, try again later, or stop trying.
type Attempt = UploadOutcome | { kind: "retry" } | { kind: "stop" };

// Waits for a promise, but at most `ms`; "late" if it took longer.
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  sleep: (ms: number) => Promise<void>,
): Promise<T | "late"> {
  return Promise.race([promise, sleep(ms).then(() => "late" as const)]);
}

// Which API answers are worth another try: no answer at all (status 0), too many
// requests (429) and server errors (5xx). Others (400, 401, 403, 404) won't change.
export function isRetryable(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}

async function attemptOnce(
  deps: UploadDeps,
  checkId: string | null,
  answers: CheckAnswers,
): Promise<Attempt> {
  if (checkId === null) {
    return { kind: "retry" }; // no check yet: start one on the next try
  }
  const response = await withTimeout(
    deps.sendAnswers(checkId, answers),
    ATTEMPT_TIMEOUT_MS,
    deps.sleep,
  );
  if (response === "late") {
    return { kind: "retry" };
  }
  if (response.ok) {
    return { kind: "ok", result: response.data };
  }
  if (response.status === 409) {
    return { kind: "already", checkId }; // answered already: an earlier try got through
  }
  return isRetryable(response.status) ? { kind: "retry" } : { kind: "stop" };
}

// Tries to deliver the answers: the first try at once, then after each wait in
// RETRY_DELAYS_MS. `firstCheckId` is the POST /api/checks that the big button
// started; if it failed, every later try starts a new check first.
export async function uploadAnswers(
  deps: UploadDeps,
  firstCheckId: Promise<string | null>,
  answers: CheckAnswers,
  hooks: UploadHooks,
): Promise<UploadOutcome> {
  let checkId = await firstCheckId;
  const delays = [0, ...RETRY_DELAYS_MS];
  for (let index = 0; index < delays.length; index += 1) {
    await deps.sleep(delays[index] ?? 0);
    if (checkId === null && index > 0) {
      checkId = await deps.startCheck();
    }
    if (checkId !== null) {
      hooks.onCheckId(checkId);
    }
    const attempt = await attemptOnce(deps, checkId, answers);
    if (attempt.kind === "ok" || attempt.kind === "already") {
      return attempt;
    }
    if (index === 0) {
      hooks.onFirstFailure();
    }
    if (attempt.kind === "stop") {
      return { kind: "gave-up" };
    }
  }
  return { kind: "gave-up" };
}
