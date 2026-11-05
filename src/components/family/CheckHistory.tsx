// „Проверки на обаждания“: the history of one person's call checks, newest first
// (GET /api/checks?personId=…, 20 per page; „Покажи още“ asks for the next page with
// the cursor the API gave). Each check shows its time in Bulgarian time, a verdict
// badge (symbol + word, not only colour), who the caller claimed to be and who
// answered „Обаждам ѝ се сега“. „Подробности“ loads one check (GET /api/checks/:id)
// with the reasons and the answers.
"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { bg } from "@/i18n/bg";
import { callApi, type CheckDto } from "./api";
import { FormMessage, type FormNotice } from "./fields";
import { fill, formatDateTime } from "./format";

type Page = { checks: CheckDto[]; nextCursor: string | null };

type HistoryState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; checks: CheckDto[]; nextCursor: string | null };

function pageUrl(personId: string, cursor: string | null): string {
  // URLSearchParams builds "?personId=…&cursor=…" with the right escaping
  // (like Python's urllib.parse.urlencode).
  const query = new URLSearchParams({ personId });
  if (cursor !== null) {
    query.set("cursor", cursor);
  }
  return `/api/checks?${query.toString()}`;
}

function identityText(check: CheckDto): string {
  const identity = check.answers.claimedIdentity ?? "unknown";
  return fill(bg.family.claimedIdentity, { identity: bg.family.identities[identity] });
}

function acknowledgementText(check: CheckDto): string {
  const ack = check.acknowledgement;
  if (ack === null) {
    return bg.family.notAcknowledged;
  }
  const time = formatDateTime(ack.at);
  return ack.displayName === null
    ? fill(bg.family.acknowledgedBySomeone, { time })
    : fill(bg.family.acknowledgedBy, { name: ack.displayName, time });
}

export function CheckHistory({ personId }: { personId: string }) {
  const [state, setState] = useState<HistoryState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreNotice, setMoreNotice] = useState<FormNotice>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await callApi<Page>(pageUrl(personId, null));
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", checks: result.data.checks, nextCursor: result.data.nextCursor }
          : { kind: "error", message: result.messageBg },
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [personId, attempt]);

  async function showMore() {
    if (state.kind !== "ready" || state.nextCursor === null || loadingMore) return;
    setLoadingMore(true);
    setMoreNotice(null);
    const result = await callApi<Page>(pageUrl(personId, state.nextCursor));
    setLoadingMore(false);
    if (!result.ok) {
      setMoreNotice({ kind: "error", text: result.messageBg });
      return;
    }
    // Add the new page under the old one; skip a check we already show.
    const known = new Set(state.checks.map((check) => check.id));
    const added = result.data.checks.filter((check) => !known.has(check.id));
    setState({
      kind: "ready",
      checks: [...state.checks, ...added],
      nextCursor: result.data.nextCursor,
    });
  }

  if (state.kind === "loading") {
    return (
      <p role="status" className="muted">
        {bg.family.historyLoading}
      </p>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="family-error">
        <p role="alert" className="form-message form-message-error">
          {state.message}
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setState({ kind: "loading" });
            setAttempt(attempt + 1);
          }}
        >
          {bg.family.retry}
        </Button>
      </div>
    );
  }
  if (state.checks.length === 0) {
    return <p className="muted">{bg.family.historyEmpty}</p>;
  }

  return (
    <div className="history">
      <ol className="check-list">
        {state.checks.map((check) => (
          <CheckItem key={check.id} check={check} />
        ))}
      </ol>
      {state.nextCursor !== null ? (
        <Button variant="secondary" onClick={showMore} disabled={loadingMore}>
          {loadingMore ? bg.common.loading : bg.family.showMore}
        </Button>
      ) : null}
      <FormMessage notice={moreNotice} />
    </div>
  );
}

// One check in the list, with a „Подробности“ button that opens its details below.
function CheckItem({ check }: { check: CheckDto }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const time = formatDateTime(check.startedAt);
  return (
    <li className="check-item">
      <p className="check-time">{time}</p>
      <VerdictBadge level={check.verdict?.level ?? null} />
      <p>{identityText(check)}</p>
      <p className="muted">{acknowledgementText(check)}</p>
      <Button
        variant="secondary"
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={open ? bg.family.hideDetails : fill(bg.family.detailsLabel, { time })}
        onClick={() => setOpen(!open)}
      >
        {open ? bg.family.hideDetails : bg.family.showDetails}
      </Button>
      <div id={detailId} className="check-detail-slot">
        {open ? <CheckDetail checkId={check.id} /> : null}
      </div>
    </li>
  );
}

type DetailState =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; check: CheckDto };

// The details of one check, loaded fresh from GET /api/checks/:id (so a new
// „Обаждам ѝ се сега“ is shown too).
function CheckDetail({ checkId }: { checkId: string }) {
  const [state, setState] = useState<DetailState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await callApi<{ check: CheckDto }>(`/api/checks/${checkId}`);
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", check: result.data.check }
          : { kind: "error", message: result.messageBg },
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [checkId]);

  if (state.kind === "loading") {
    return (
      <p role="status" className="muted">
        {bg.family.detailsLoading}
      </p>
    );
  }
  if (state.kind === "error") {
    return (
      <p role="alert" className="form-message form-message-error">
        {state.message}
      </p>
    );
  }

  const { check } = state;
  const answers = check.answers;
  const tri = (value: "yes" | "no" | "unsure" | null) => bg.family.triAnswers[value ?? "none"];
  return (
    <div className="check-detail">
      {check.verdict ? (
        <>
          <p className="contact-name">{check.verdict.headlineBg}</p>
          <h3>{bg.family.reasonsTitle}</h3>
          {check.verdict.reasons.length > 0 ? (
            <ul>
              {check.verdict.reasons.map((reason) => (
                <li key={reason.code}>{reason.textBg}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">{bg.family.noReasons}</p>
          )}
        </>
      ) : null}
      <h3>{bg.family.answersTitle}</h3>
      <dl className="check-answers">
        <dt>{bg.family.asksMoney}</dt>
        <dd>{tri(answers.asksMoney)}</dd>
        {answers.handover !== null ? (
          <>
            <dt>{bg.family.handover}</dt>
            <dd>{bg.family.handoverMethods[answers.handover]}</dd>
          </>
        ) : null}
        <dt>{bg.family.rushing}</dt>
        <dd>{tri(answers.rushing)}</dd>
        <dt>{bg.family.secrecy}</dt>
        <dd>{tri(answers.secrecy)}</dd>
      </dl>
      {answers.textRedacted ? (
        <>
          <h3>{bg.family.callText}</h3>
          <p className="check-text">{answers.textRedacted}</p>
        </>
      ) : null}
      <p className="muted">{acknowledgementText(check)}</p>
    </div>
  );
}
