// The whole call check on the older person's phone (/protected, W2-01), as one
// Client Component that moves through the screens:
//
//   home  (the big button)  ->  questions (one per screen)  ->  text  ->  result
//
// Pressing the big button sends POST /api/checks at once (the server alerts the
// family before any question is answered) and opens the questions without waiting
// for the answer, so a slow network never holds the person back.
"use client";

import { useRef, useState } from "react";
import { callApi } from "@/components/family/api";
import { bg } from "@/i18n/bg";
import type { AnswersResultDto } from "@/schemas/checks";
import { CallerText } from "./CallerText";
import { CheckResult } from "./CheckResult";
import { saveCallContact, useCallContact } from "./callContact";
import { CheckHome } from "./CheckHome";
import { QuestionWizard } from "./QuestionWizard";
import { EMPTY_ANSWERS, questionOrder, withAnswer, type QuestionId } from "./questions";
import { sendAnswers } from "./sendAnswers";

// Which screen is shown. Like a Python Literal["home", "questions", "text", "result"].
type Stage = "home" | "questions" | "text" | "result";

// POST /api/checks -> the new check's id, or null if the request failed (offline,
// server down, too many checks). The questions go on either way.
async function startCheckOnServer(): Promise<string | null> {
  const result = await callApi<{ checkId: string }>("/api/checks", "POST");
  return result.ok ? result.data.checkId : null;
}

export function CallCheck() {
  const contact = useCallContact();
  const [stage, setStage] = useState<Stage>("home");
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sending, setSending] = useState(false);
  // The server's verdict (shown by the result screen).
  const [result, setResult] = useState<AnswersResultDto | null>(null);
  // true = „Обаждането вече приключи — искам да проверя“ (no „Затворете телефона.“).
  const [afterCall, setAfterCall] = useState(false);
  // The running POST /api/checks (a Promise is like a Python asyncio Task).
  // useRef keeps it between renders without redrawing the screen.
  const checkIdRequest = useRef<Promise<string | null> | null>(null);

  function start(startedAfterCall: boolean) {
    checkIdRequest.current = startCheckOnServer();
    setAfterCall(startedAfterCall);
    setAnswers(EMPTY_ANSWERS);
    setQuestionIndex(0);
    setResult(null);
    setStage("questions");
  }

  // The next question, or the last (text) step after the last question.
  function goForward(current = answers) {
    if (questionIndex + 1 < questionOrder(current).length) {
      setQuestionIndex(questionIndex + 1);
    } else {
      setStage("text");
    }
  }

  function answer(id: QuestionId, value: string) {
    setAnswers((previous) => withAnswer(previous, id, value));
  }

  // A tap on an answer: save it and go on at once (one tap per question).
  function pick(id: QuestionId, value: string) {
    const next = withAnswer(answers, id, value);
    setAnswers(next);
    goForward(next);
  }

  // „Прескочи“ (text "") or „Провери“: send the answers, then show the verdict.
  async function submit(text: string) {
    const final = { ...answers, text };
    setAnswers(final);
    setSending(true);
    const checkId = await checkIdRequest.current;
    const response = checkId === null ? null : await sendAnswers(checkId, final);
    setSending(false);
    if (response !== null && response.ok) {
      setResult(response.data);
      // Remember who to call, for the home screen next time.
      saveCallContact(response.data.callContact);
      setStage("result");
    }
  }

  // A "live region": a screen reader reads its text aloud whenever it changes, even
  // if the focus is somewhere else. Hidden on screen (the verdict is shown big).
  const announcement =
    stage === "result" && result !== null ? bg.verdict[result.verdict.level].title : "";

  return (
    <main className="call-check">
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {stage === "home" ? <CheckHome contact={contact} onStart={start} /> : null}
      {stage === "questions" ? (
        <QuestionWizard
          answers={answers}
          index={questionIndex}
          onAnswer={answer}
          onPick={pick}
          onNext={() => goForward()}
          onBack={() => setQuestionIndex(Math.max(0, questionIndex - 1))}
        />
      ) : null}
      {stage === "text" ? (
        <CallerText
          text={answers.text}
          onTextChange={(text) => setAnswers({ ...answers, text })}
          onSubmit={(text) => void submit(text)}
          onBack={() => setStage("questions")}
          sending={sending}
        />
      ) : null}
      {stage === "result" && result !== null ? (
        <CheckResult
          level={result.verdict.level}
          reasons={result.verdict.reasons.map((reason) => reason.textBg)}
          callContact={result.callContact}
          afterCall={afterCall}
          onNewCheck={() => setStage("home")}
        />
      ) : null}
    </main>
  );
}
