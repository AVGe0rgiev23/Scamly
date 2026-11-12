// The whole call check on the older person's phone (/protected, W2-01), as one
// Client Component that moves through the screens:
//
//   home  (the big button)  ->  questions (one per screen)  ->  text  ->  result
//
// Pressing the big button sends POST /api/checks at once (the server alerts the
// family before any question is answered) and opens the questions without waiting
// for the answer, so a slow network never holds the person back.
//
// The verdict: the SERVER computes it (PUT /api/checks/:id/answers). If that request
// fails or takes longer than 4 s, the phone runs the same engine itself
// (analyseCall, BUILD_PLAN 4.9) and shows that verdict at once with a small note,
// while upload.ts keeps sending the answers in the background. The red „Затворете
// телефона.“ never depends on the network.
"use client";

import { useEffect, useRef, useState } from "react";
import { callApi } from "@/components/family/api";
import { analyseCall, type RiskLevel } from "@/engine";
import { bg } from "@/i18n/bg";
import { watchCheck } from "@/lib/realtime";
import type { CallContactDto } from "@/schemas/checks";
import { familyMessage } from "./acknowledgement";
import { CallerText } from "./CallerText";
import { CheckResult } from "./CheckResult";
import { saveCallContact, useCallContact } from "./callContact";
import { CheckHome } from "./CheckHome";
import { QuestionWizard } from "./QuestionWizard";
import { EMPTY_ANSWERS, questionOrder, withAnswer, type QuestionId } from "./questions";
import { sendAnswers } from "./sendAnswers";
import { LOCAL_FALLBACK_MS, uploadAnswers, type UploadDeps } from "./upload";

// Which screen is shown. Like a Python Literal["home", "questions", "text", "result"].
type Stage = "home" | "questions" | "text" | "result";

// What the result screen shows. Like a small Python dataclass.
type ShownResult = {
  level: RiskLevel;
  reasons: string[]; // Bulgarian "why" lines
  callContact: CallContactDto | null;
  local: boolean; // true = computed on the phone; the family may not know yet
};

// POST /api/checks -> the new check's id, or null if the request failed (offline,
// server down, too many checks). The questions go on either way.
async function startCheckOnServer(): Promise<string | null> {
  const result = await callApi<{ checkId: string }>("/api/checks", "POST");
  return result.ok ? result.data.checkId : null;
}

// The real network calls and timer for upload.ts (the unit tests pass fakes).
const UPLOAD_DEPS: UploadDeps = {
  startCheck: startCheckOnServer,
  sendAnswers,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// voiceEnabled: the FEATURE_VOICE switch, read on the server (CallCheckPage.tsx).
export function CallCheck({ voiceEnabled = false }: { voiceEnabled?: boolean }) {
  const contact = useCallContact();
  const [stage, setStage] = useState<Stage>("home");
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ShownResult | null>(null);
  // The check's id, once the server has given one (to watch it live).
  const [checkId, setCheckId] = useState<string | null>(null);
  // „Иван ще ви се обади веднага.“ once a family member answers (null until then).
  const [message, setMessage] = useState<string | null>(null);
  const [suggestEmergencyCall, setSuggestEmergencyCall] = useState(false);
  // true = „Обаждането вече приключи — искам да проверя“ (no „Затворете телефона.“).
  const [afterCall, setAfterCall] = useState(false);
  // The running POST /api/checks (a Promise is like a Python asyncio Task).
  // useRef keeps it between renders without redrawing the screen.
  const checkIdRequest = useRef<Promise<string | null>>(Promise.resolve(null));
  // Counts the checks on this screen. A background upload of an OLD check (after
  // „Нова проверка“) must not change the screen any more.
  const run = useRef(0);

  function start(startedAfterCall: boolean) {
    run.current += 1;
    checkIdRequest.current = startCheckOnServer();
    setAfterCall(startedAfterCall);
    setAnswers(EMPTY_ANSWERS);
    setQuestionIndex(0);
    setSending(false);
    setResult(null);
    setCheckId(null);
    setMessage(null);
    setSuggestEmergencyCall(false);
    setStage("questions");
  }

  function goHome() {
    run.current += 1;
    setStage("home");
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

  // „Прескочи“ (text "") or „Провери“: send the answers and show the verdict.
  async function submit(text: string) {
    const final = { ...answers, text };
    setAnswers(final);
    setSending(true);
    const thisRun = run.current;
    const isCurrent = () => run.current === thisRun;
    let shown = false;

    function show(next: ShownResult) {
      if (!isCurrent()) {
        return;
      }
      shown = true;
      setResult(next);
      setSending(false);
      setStage("result");
    }

    // The phone's own verdict: the same engine as the server, no network needed.
    function showLocal() {
      if (shown) {
        return;
      }
      const verdict = analyseCall(final);
      show({
        level: verdict.level,
        reasons: verdict.reasons.map((reason) => reason.textBg),
        callContact: contact, // the one remembered from an earlier check, if any
        local: true,
      });
    }

    // No server verdict within 4 s: show the local one (the result stays under 5 s).
    const timer = setTimeout(showLocal, LOCAL_FALLBACK_MS);
    const outcome = await uploadAnswers(UPLOAD_DEPS, checkIdRequest.current, final, {
      onCheckId: (id) => {
        if (isCurrent()) {
          setCheckId(id);
        }
      },
      onFirstFailure: showLocal,
    });
    clearTimeout(timer);

    if (outcome.kind === "ok") {
      // The server's verdict (also when it arrives late: it replaces the local one
      // and the note disappears). Remember who to call, for the home screen.
      saveCallContact(outcome.result.callContact);
      show({
        level: outcome.result.verdict.level,
        reasons: outcome.result.verdict.reasons.map((reason) => reason.textBg),
        callContact: outcome.result.callContact,
        local: false,
      });
    } else if (outcome.kind === "already") {
      // An earlier try got through: the server (and the family) has the answers.
      showLocal();
      if (isCurrent()) {
        setResult((previous) => (previous === null ? null : { ...previous, local: false }));
      }
    } else {
      showLocal(); // gave up: the local verdict stays, with its note
    }
  }

  // On the result screen: watch the check live (Supabase Realtime, with polling every
  // 5 s as a fallback, src/lib/realtime.ts) until a family member presses „Обаждам ѝ
  // се сега“. The returned stop() runs when the screen closes (React cleanup).
  const watchedCheckId = stage === "result" ? checkId : null;
  useEffect(() => {
    if (watchedCheckId === null) {
      return;
    }
    return watchCheck(watchedCheckId, (check) => {
      const text = familyMessage(check.acknowledgement);
      setSuggestEmergencyCall(check.suggestEmergencyCall === true && text === null);
      if (text !== null) {
        setMessage(text);
      }
    });
  }, [watchedCheckId]);

  // A "live region": a screen reader reads its text aloud whenever it changes, even
  // if the focus is somewhere else. Hidden on screen (the verdict is shown big).
  const announcement = stage === "result" && result !== null ? bg.verdict[result.level].title : "";

  return (
    <main className="call-check shell flex max-w-2xl flex-col gap-5 py-6 text-xl md:py-12">
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
          voiceEnabled={voiceEnabled}
        />
      ) : null}
      {stage === "result" && result !== null ? (
        <CheckResult
          level={result.level}
          reasons={result.reasons}
          callContact={result.callContact}
          afterCall={afterCall}
          local={result.local}
          familyMessage={message}
          suggestEmergencyCall={suggestEmergencyCall && message === null}
          onNewCheck={goHome}
        />
      ) : null}
    </main>
  );
}
