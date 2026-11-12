// The moderator's report queue (/moderator/reports, W3-04 UI): tabs „Чакащи“,
// „Одобрени“ and „Отхвърлени“ (ui/Tabs), one hairline-separated row per public report,
// „Покажи още“ for the next page, and on a pending row „Одобри“ (one click) and
// „Отхвърли“ (a window with a required reason).
//
// A Client Component: everything comes from our API (/api/moderation/reports), which
// checks the role on every request; RLS checks every row again. The caller's number
// never reaches the browser: only how many OTHER reports name the same number.
// The tabs follow the WAI-ARIA "tabs" pattern (ui/Tabs handles the arrow keys).
"use client";

import { ArrowLeft, Check, Repeat, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { callApi } from "@/components/family/api";
import { districtName, fill } from "@/components/family/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Notice as NoticeBox } from "@/components/ui/Notice";
import { SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import type {
  ModerationDecisionDto,
  ModerationPageDto,
  ModerationReportDto,
  ModerationStatus,
} from "@/schemas/moderation";
import { BACK_LINK } from "./ModeratorFrame";
import { RejectDialog } from "./RejectDialog";
import {
  callDayText,
  queueUrl,
  repeatBadgeText,
  reportContext,
  reviewedText,
} from "./reportQueueHelpers";

const TABS: { status: ModerationStatus; label: string; empty: string }[] = [
  { status: "pending", label: bg.moderator.tabPending, empty: bg.moderator.emptyPending },
  { status: "approved", label: bg.moderator.tabApproved, empty: bg.moderator.emptyApproved },
  { status: "rejected", label: bg.moderator.tabRejected, empty: bg.moderator.emptyRejected },
];

type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; reports: ModerationReportDto[]; nextCursor: string | null };
// The message under the tabs: a success (read politely) or an error (read at once).
type Notice = { kind: "success" | "error"; text: string } | null;

export function ReportQueue() {
  const tabIds = useId();
  const [status, setStatus] = useState<ModerationStatus>("pending");
  const [attempt, setAttempt] = useState(0); // a new number = load again
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<ModerationReportDto | null>(null);
  const [rejectPending, setRejectPending] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);
  // A new number = move the focus to the list. In an effect, so it runs after the
  // reject window has closed (a child's effects run before its parent's).
  const [focusList, setFocusList] = useState(0);

  useEffect(() => {
    if (focusList > 0) panel.current?.focus();
  }, [focusList]);

  useEffect(() => {
    let active = true; // an old, slow answer must not overwrite a newer one
    async function load() {
      const result = await callApi<ModerationPageDto>(queueUrl(status, null));
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", reports: result.data.reports, nextCursor: result.data.nextCursor }
          : { kind: "error", message: result.messageBg },
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [status, attempt]);

  // Shows another tab (or the same one again): the list loads from the first page.
  function reload(next: ModerationStatus) {
    setState({ kind: "loading" });
    setMoreError(null);
    setStatus(next);
    setAttempt((count) => count + 1);
  }

  function selectTab(next: ModerationStatus) {
    if (next === status) return;
    setNotice(null);
    reload(next);
  }

  async function loadMore() {
    if (state.kind !== "ready" || state.nextCursor === null) return;
    setLoadingMore(true);
    setMoreError(null);
    const result = await callApi<ModerationPageDto>(queueUrl(status, state.nextCursor));
    setLoadingMore(false);
    if (!result.ok) {
      setMoreError(result.messageBg);
      return;
    }
    setState({
      kind: "ready",
      reports: [...state.reports, ...result.data.reports],
      nextCursor: result.data.nextCursor,
    });
  }

  // A decided report leaves the „Чакащи“ list; the focus moves to the list itself,
  // because the button that had it is gone.
  function removeReport(id: string) {
    // The "(previous) => next" form: after an `await`, `state` here may be old.
    setState((previous) =>
      previous.kind === "ready"
        ? { ...previous, reports: previous.reports.filter((report) => report.id !== id) }
        : previous,
    );
    setFocusList((count) => count + 1);
  }

  // 409: another moderator decided first. Say so and load the list again.
  function showConflict() {
    setNotice({ kind: "error", text: bg.moderator.conflictNotice });
    reload(status);
    setFocusList((count) => count + 1);
  }

  async function approve(report: ModerationReportDto) {
    setNotice(null);
    setApprovingId(report.id);
    const result = await callApi<{ report: ModerationDecisionDto }>(
      `/api/moderation/reports/${report.id}`,
      "PATCH",
      { decision: "approve" },
    );
    setApprovingId(null);
    if (result.ok) {
      removeReport(report.id);
      setNotice({ kind: "success", text: bg.moderator.approvedNotice });
    } else if (result.status === 409) {
      showConflict();
    } else {
      setNotice({ kind: "error", text: result.messageBg });
    }
  }

  async function reject(reason: string) {
    if (rejecting === null) return;
    const report = rejecting;
    setRejectPending(true);
    setRejectError(null);
    const result = await callApi<{ report: ModerationDecisionDto }>(
      `/api/moderation/reports/${report.id}`,
      "PATCH",
      { decision: "reject", rejectReason: reason },
    );
    setRejectPending(false);
    if (result.ok) {
      setRejecting(null);
      removeReport(report.id);
      setNotice({ kind: "success", text: bg.moderator.rejectedNotice });
    } else if (result.status === 409) {
      setRejecting(null);
      showConflict();
    } else {
      setRejectError(result.messageBg); // stays in the window: the moderator can retry
    }
  }

  const tab = TABS.find((item) => item.status === status) ?? TABS[0];

  return (
    <>
      <Link href={ROUTES.moderator} className={BACK_LINK}>
        <ArrowLeft className="size-5" aria-hidden="true" />
        {bg.moderator.backToHub}
      </Link>
      <header className="mb-10 max-w-[60ch]">
        <h1 className="text-h1">{bg.moderator.reportsTitle}</h1>
        <p className="mt-4 text-lg text-fg-muted">{bg.moderator.reportsIntro}</p>
      </header>

      <Tabs
        label={bg.moderator.reportsTabsLabel}
        tabs={TABS.map((item) => ({ id: item.status, label: item.label }))}
        value={status}
        onChange={selectTab}
        tabId={(id) => `${tabIds}-tab-${id}`}
        panelId={() => `${tabIds}-panel`}
      />

      {/* Always in the page, so screen readers hear every new message. */}
      <div role="status" aria-live="polite" className={notice?.kind === "success" ? "mt-6" : ""}>
        {notice?.kind === "success" ? (
          <NoticeBox status="safe" className="appear">
            {notice.text}
          </NoticeBox>
        ) : null}
      </div>
      {notice?.kind === "error" ? (
        <NoticeBox status="danger" role="alert" className="appear mt-6">
          {notice.text}
        </NoticeBox>
      ) : null}

      <section
        ref={panel}
        role="tabpanel"
        id={`${tabIds}-panel`}
        aria-labelledby={`${tabIds}-tab-${status}`}
        tabIndex={-1}
        className="mt-2"
      >
        <QueueRows
          state={state}
          empty={tab?.empty ?? ""}
          approvingId={approvingId}
          busy={approvingId !== null || rejectPending}
          onApprove={(report) => void approve(report)}
          onReject={(report) => {
            setNotice(null);
            setRejectError(null);
            setRejecting(report);
          }}
          onRetry={() => reload(status)}
        />
        {state.kind === "ready" && state.nextCursor !== null ? (
          <div className="mt-6 flex flex-col items-start gap-3">
            {moreError ? (
              <NoticeBox status="danger" role="alert">
                {moreError}
              </NoticeBox>
            ) : null}
            <Button
              variant="secondary"
              loading={loadingMore}
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? bg.admin.loadingMore : bg.admin.showMore}
            </Button>
          </div>
        ) : null}
      </section>

      <RejectDialog
        open={rejecting !== null}
        context={rejecting === null ? "" : reportContext(rejecting)}
        pending={rejectPending}
        error={rejectError}
        onSubmit={(reason) => void reject(reason)}
        onCancel={() => setRejecting(null)}
      />
    </>
  );
}

function QueueRows(props: {
  state: ListState;
  empty: string;
  approvingId: string | null;
  busy: boolean;
  onApprove: (report: ModerationReportDto) => void;
  onReject: (report: ModerationReportDto) => void;
  onRetry: () => void;
}) {
  const { state } = props;
  if (state.kind === "loading") {
    return (
      <>
        <p role="status" className="sr-only">
          {bg.moderator.reportsLoading}
        </p>
        <SkeletonList rows={3} />
      </>
    );
  }
  if (state.kind === "error") {
    return (
      <ErrorState text={state.message} retryLabel={bg.moderator.retry} onRetry={props.onRetry} />
    );
  }
  if (state.reports.length === 0) {
    return <EmptyState text={props.empty} />;
  }
  return (
    <ul>
      {state.reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          approving={props.approvingId === report.id}
          busy={props.busy}
          onApprove={() => props.onApprove(report)}
          onReject={() => props.onReject(report)}
        />
      ))}
    </ul>
  );
}

// One report: a row between hairlines. Left: the type of scheme, where and when, the
// text and the badges; right (below on a phone): the two decisions.
function ReportCard(props: {
  report: ModerationReportDto;
  approving: boolean;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { report } = props;
  const repeat = repeatBadgeText(report.sameNumberReports);
  const reviewed = reviewedText(report);
  const context = reportContext(report);
  return (
    <li className="flex flex-col gap-4 border-b border-line py-6 md:flex-row md:items-start md:gap-8">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold">{bg.scripts.typeNames[report.scriptType]}</h2>
        <p className="tabular mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm text-fg-muted">
          <span>
            {fill(bg.moderator.reportDistrict, { district: districtName(report.districtCode) })}
          </span>
          <span>{callDayText(report.occurredOn)}</span>
        </p>
        {/* Plain text: React escapes it, so a report can never add HTML to the page. */}
        <p
          className={cn(
            "mt-3 max-w-[65ch] break-words",
            report.description === null && "text-fg-subtle",
          )}
        >
          {report.description ?? bg.moderator.reportNoDescription}
        </p>
        {repeat !== null ? (
          <p className="mt-3">
            <Badge status="caution">
              <Repeat className="size-4" aria-hidden="true" />
              {repeat}
            </Badge>
          </p>
        ) : null}
        {reviewed !== null ? (
          <p className="tabular mt-3 text-sm text-fg-subtle">{reviewed}</p>
        ) : null}
        {report.status === "rejected" && report.rejectReason !== null ? (
          <p className="mt-2 border-l-2 border-line-strong pl-3 text-sm text-fg-muted">
            {fill(bg.moderator.rejectReasonShown, { reason: report.rejectReason })}
          </p>
        ) : null}
      </div>
      {report.status === "pending" ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={props.approving}
            disabled={props.busy}
            onClick={props.onApprove}
          >
            {props.approving ? null : <Check className="size-5" aria-hidden="true" />}
            {props.approving ? bg.moderator.approving : bg.moderator.approve}
            <span className="sr-only">: {context}</span>
          </Button>
          <Button variant="ghost" size="sm" disabled={props.busy} onClick={props.onReject}>
            <X className="size-5" aria-hidden="true" />
            {bg.moderator.reject}
            <span className="sr-only">: {context}</span>
          </Button>
        </div>
      ) : null}
    </li>
  );
}
