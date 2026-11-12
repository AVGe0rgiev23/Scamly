// „Проверки на обаждания“: the history of one person's call checks, newest first
// (GET /api/checks?personId=…, 20 per page; „Покажи още“ asks for the next page with
// the cursor the API gave). Each check shows its time in Bulgarian time, a verdict
// badge (icon + word, not only colour), who the caller claimed to be and who
// answered „Обаждам ѝ се сега“. „Подробности“ loads one check (GET /api/checks/:id)
// with the reasons and the answers.
// Look: hairline-separated rows (`.check-list > li`), the time in the data font, the
// details open inside the row on a quiet panel.
"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { SkeletonList, SkeletonText } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
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

export function identityText(check: CheckDto): string {
  const identity = check.answers.claimedIdentity ?? "unknown";
  return fill(bg.family.claimedIdentity, { identity: bg.family.identities[identity] });
}

export function acknowledgementText(check: CheckDto): string {
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
      <div>
        <p role="status" className="sr-only">
          {bg.family.historyLoading}
        </p>
        <SkeletonList rows={3} className="border-t border-line" />
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <ErrorState
        text={state.message}
        retryLabel={bg.family.retry}
        onRetry={() => {
          setState({ kind: "loading" });
          setAttempt(attempt + 1);
        }}
      />
    );
  }
  if (state.checks.length === 0) {
    return <EmptyState text={bg.family.historyEmpty} />;
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <ol className="check-list w-full border-t border-line">
        {state.checks.map((check) => (
          <CheckItem key={check.id} check={check} />
        ))}
      </ol>
      {state.nextCursor !== null ? (
        <Button variant="secondary" onClick={showMore} loading={loadingMore}>
          {loadingMore ? bg.common.loading : bg.family.showMore}
        </Button>
      ) : null}
      <div className="w-full empty:hidden">
        <FormMessage notice={moreNotice} />
      </div>
    </div>
  );
}

// One check in the list, with a „Подробности“ button that opens its details below.
function CheckItem({ check }: { check: CheckDto }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const time = formatDateTime(check.startedAt);
  return (
    <li className="border-b border-line py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <VerdictBadge level={check.verdict?.level ?? null} />
        <p className="tabular font-mono text-sm text-fg-muted">{time}</p>
      </div>
      <p className="mt-2 text-fg">{identityText(check)}</p>
      <p className="text-sm text-fg-muted">{acknowledgementText(check)}</p>
      <Button
        variant="ghost"
        className="mt-2 -ml-3"
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={open ? bg.family.hideDetails : fill(bg.family.detailsLabel, { time })}
        onClick={() => setOpen(!open)}
      >
        {open ? bg.family.hideDetails : bg.family.showDetails}
        {open ? (
          <ChevronUp className="size-5" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-5" aria-hidden="true" />
        )}
      </Button>
      <div id={detailId}>{open ? <CheckDetail checkId={check.id} /> : null}</div>
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
      <div className="mt-3 rounded-md bg-surface-1 p-4">
        <p role="status" className="sr-only">
          {bg.family.detailsLoading}
        </p>
        <SkeletonText lines={4} />
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <Notice status="danger" role="alert" className="mt-3">
        {state.message}
      </Notice>
    );
  }

  const { check } = state;
  const answers = check.answers;
  const tri = (value: "yes" | "no" | "unsure" | null) => bg.family.triAnswers[value ?? "none"];
  return (
    <div className="appear mt-3 flex flex-col gap-4 rounded-md border border-line bg-surface-1 p-4 md:p-5">
      {check.verdict ? (
        <div>
          <p className="font-display text-lg font-semibold text-fg">{check.verdict.headlineBg}</p>
          <h3 className="mt-3 text-base font-semibold text-fg-muted">{bg.family.reasonsTitle}</h3>
          {check.verdict.reasons.length > 0 ? (
            <ul className="mt-1 list-disc pl-5 text-fg">
              {check.verdict.reasons.map((reason) => (
                <li key={reason.code}>{reason.textBg}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-fg-muted">{bg.family.noReasons}</p>
          )}
        </div>
      ) : null}
      <div>
        <h3 className="text-base font-semibold text-fg-muted">{bg.family.answersTitle}</h3>
        <dl className="mt-1 grid grid-cols-1 gap-x-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <dt className="pt-2 text-fg-muted sm:pb-2">{bg.family.asksMoney}</dt>
          <dd className="pb-2 font-medium text-fg sm:pt-2">{tri(answers.asksMoney)}</dd>
          {answers.handover !== null ? (
            <>
              <dt className="border-t border-line pt-2 text-fg-muted sm:pb-2">
                {bg.family.handover}
              </dt>
              <dd className="pb-2 font-medium text-fg sm:border-t sm:border-line sm:pt-2">
                {bg.family.handoverMethods[answers.handover]}
              </dd>
            </>
          ) : null}
          <dt className="border-t border-line pt-2 text-fg-muted sm:pb-2">{bg.family.rushing}</dt>
          <dd className="pb-2 font-medium text-fg sm:border-t sm:border-line sm:pt-2">
            {tri(answers.rushing)}
          </dd>
          <dt className="border-t border-line pt-2 text-fg-muted sm:pb-2">{bg.family.secrecy}</dt>
          <dd className="pb-2 font-medium text-fg sm:border-t sm:border-line sm:pt-2">
            {tri(answers.secrecy)}
          </dd>
        </dl>
      </div>
      {answers.textRedacted ? (
        <div>
          <h3 className="text-base font-semibold text-fg-muted">{bg.family.callText}</h3>
          <p className="mt-1 rounded-sm bg-surface-2 p-3 break-words whitespace-pre-wrap text-fg">
            {answers.textRedacted}
          </p>
        </div>
      ) : null}
      <p className="text-sm text-fg-muted">{acknowledgementText(check)}</p>
    </div>
  );
}
