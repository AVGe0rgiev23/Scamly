// The whole call check on the older person's phone (/protected, W2-01), as one
// Client Component that moves through the screens:
//
//   home (the big button) -> „Казват ли, че са някой близък?“ (P-06)
//     Не -> questions (one per screen) -> text -> result
//     Да -> family tiles -> the real family member is asked („Провери истинския“,
//           useIdentityAsk) and, while the 45 s ring counts down above them, the same
//           questions -> text -> result. „Не съм аз“ / „Аз съм“ replace the screen.
//   „Обаждането вече приключи…“ goes straight to the questions.
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

import { useEffect, useRef, useState, type ReactNode } from "react";
import { callApi } from "@/components/family/api";
import { analyseCall, type RiskLevel, type ScriptType } from "@/engine";
import { bg } from "@/i18n/bg";
import { watchCheck } from "@/lib/realtime";
import type { CallContactDto } from "@/schemas/checks";
import type { DistrictCode } from "@/schemas/reports";
import { familyMessage } from "./acknowledgement";
import { CallerText } from "./CallerText";
import { CheckResult } from "./CheckResult";
import { saveCallContact, useCallContact } from "./callContact";
import { CheckHome } from "./CheckHome";
import { IdentityItsMe, IdentityNotMe } from "./IdentityAnswered";
import { FamilyTiles, RelativeQuestion } from "./IdentityQuestion";
import { IdentityWaiting } from "./IdentityWaiting";
import { PracticeCall } from "./PracticeCall";
import { QuestionWizard } from "./QuestionWizard";
import { EMPTY_ANSWERS, questionOrder, withAnswer, type QuestionId } from "./questions";
import { sendAnswers } from "./sendAnswers";
import { LOCAL_FALLBACK_MS, uploadAnswers, type UploadDeps } from "./upload";
import { useIdentityAsk } from "./useIdentityAsk";

// Which screen is shown. Like a Python Literal["home", "questions", "text", "result"].
// "relative" = „Казват ли, че са някой близък?“, "family" = the family tiles (P-06).
type Stage = "home" | "practice" | "relative" | "family" | "questions" | "text" | "result";

// What the result screen shows. Like a small Python dataclass.
type ShownResult = {
  level: RiskLevel;
  scriptType: ScriptType; // which known script it looks like (for the map report, P-11)
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
// districtCode: the paired person's district for the map report (null = ask, P-11).
export function CallCheck({
  voiceEnabled = false,
  districtNotice,
  districtCode = null,
}: {
  voiceEnabled?: boolean;
  districtNotice?: ReactNode;
  districtCode?: DistrictCode | null;
}) {
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
  // true = „Обаждането вече приключи — искам да проверя“ (no „Затворете телефона.“).
  const [afterCall, setAfterCall] = useState(false);
  // The running POST /api/checks (a Promise is like a Python asyncio Task).
  // useRef keeps it between renders without redrawing the screen.
  const checkIdRequest = useRef<Promise<string | null>>(Promise.resolve(null));
  // Counts the checks on this screen. A background upload of an OLD check (after
  // „Нова проверка“) must not change the screen any more.
  const run = useRef(0);
  // „Провери истинския“: who is asked, the 45 s countdown and the answer.
  const identity = useIdentityAsk();

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
    identity.reset();
    // The big button asks first whether the caller says they are someone close.
    setStage(startedAfterCall ? "questions" : "relative");
  }

  function goHome() {
    run.current += 1;
    identity.reset();
    setStage("home");
  }

  // „Да“ to „Казват ли, че са някой близък?“: the family tiles; „Не“: the questions.
  function answerRelative(relative: boolean) {
    setQuestionIndex(0);
    setStage(relative ? "family" : "questions");
  }

  // A tile was tapped (or „Никой от тях“): the caller claims to be a relative, so
  // the first question is already answered and the check goes on with the second.
  function continueAsRelative() {
    setAnswers(withAnswer(EMPTY_ANSWERS, "claimedIdentity", "relative"));
    setQuestionIndex(1);
    setStage("questions");
  }

  // „Назад“ on the first question: back to „Казват ли…“ (or home after a call).
  function backFromFirstQuestion() {
    if (afterCall) {
      goHome();
      return;
    }
    identity.reset();
    setStage("relative");
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
        scriptType: verdict.scriptType,
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
        scriptType: outcome.result.verdict.scriptType,
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
      if (text !== null) {
        setMessage(text);
      }
    });
  }, [watchedCheckId]);

  // A "live region": a screen reader reads its text aloud whenever it changes, even
  // if the focus is somewhere else. Hidden on screen (the verdict is shown big).
  const announcement = stage === "result" && result !== null ? bg.verdict[result.level].title : "";

  // The family member's answer replaces the whole screen: „Не съм аз“ always,
  // „Аз съм“ until the person goes back to the check.
  const ask = identity.state;
  const answered =
    ask !== null && (ask.phase === "not_me" || (ask.phase === "its_me" && !ask.dismissed));
  // The waiting header above the questions, the text step and the result.
  const showWaiting =
    ask !== null &&
    !answered &&
    ask.phase !== "its_me" &&
    (stage === "questions" || stage === "text" || stage === "result");

  return (
    // relative z-1: the screen sits above the verdict's flood (protected.css).
    <main className="call-check shell relative z-1 flex max-w-2xl flex-col gap-5 py-6 text-xl md:py-12">
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {ask !== null && ask.phase === "not_me" ? (
        <IdentityNotMe state={ask} districtCode={districtCode} onDone={goHome} />
      ) : null}
      {ask !== null && ask.phase === "its_me" && !ask.dismissed ? (
        <IdentityItsMe state={ask} onContinue={identity.dismiss} onDone={goHome} />
      ) : null}
      {showWaiting && ask !== null ? (
        <IdentityWaiting state={ask} now={identity.now} onRetry={identity.retry} />
      ) : null}
      {answered ? null : (
        <>
          {stage === "home" ? (
            <CheckHome contact={contact} onStart={start} onPractice={() => setStage("practice")}>
              {districtNotice}
            </CheckHome>
          ) : null}
          {stage === "relative" ? (
            <RelativeQuestion onAnswer={answerRelative} onBack={goHome} />
          ) : null}
          {stage === "family" ? (
            <FamilyTiles
              onPick={(people, person) => {
                identity.start(people, person);
                continueAsRelative();
              }}
              onNone={continueAsRelative}
              onBack={() => setStage("relative")}
            />
          ) : null}
          {stage === "practice" ? <PracticeCall onExit={goHome} /> : null}
          {stage === "questions" ? (
            <QuestionWizard
              answers={answers}
              index={questionIndex}
              onAnswer={answer}
              onPick={pick}
              onNext={() => goForward()}
              // On the first question „Назад“ goes back to „Казват ли…“ / the big button.
              onBack={() =>
                questionIndex === 0 ? backFromFirstQuestion() : setQuestionIndex(questionIndex - 1)
              }
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
              scriptType={result.scriptType}
              districtCode={districtCode}
              reasons={result.reasons}
              callContact={result.callContact}
              afterCall={afterCall}
              local={result.local}
              familyMessage={message}
              onNewCheck={goHome}
            />
          ) : null}
        </>
      )}
    </main>
  );
}
