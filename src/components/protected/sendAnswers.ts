// Sends the older person's answers to the server: PUT /api/checks/:id/answers.
// The SERVER runs the engine, stores the verdict and tells the family; the phone
// shows the verdict it gets back.

import { callApi, type ApiResult } from "@/components/family/api";
import type { AnswersResultDto } from "@/schemas/checks";
import type { CheckAnswers } from "./questions";

// checkId: the id from POST /api/checks. The body has exactly the AnswersSchema
// fields; the server checks them again and computes the verdict itself.
export function sendAnswers(
  checkId: string,
  answers: CheckAnswers,
): Promise<ApiResult<AnswersResultDto>> {
  return callApi<AnswersResultDto>(`/api/checks/${encodeURIComponent(checkId)}/answers`, "PUT", {
    claimedIdentity: answers.claimedIdentity,
    asksMoney: answers.asksMoney,
    handover: answers.handover,
    rushing: answers.rushing,
    secrecy: answers.secrecy,
    text: answers.text,
  });
}
