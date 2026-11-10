// The moderator's report queue (/moderator/reports, W3-04 UI): tabs „Чакащи“,
// „Одобрени“ and „Отхвърлени“, one card per public report, „Покажи още“ for the next
// page, and on a pending card „Одобри“ (one click) and „Отхвърли“ (a window with a
// required reason).
//
// A Client Component: everything comes from our API (/api/moderation/reports), which
// checks the role on every request; RLS checks every row again. The caller's number
// never reaches the browser: only how many OTHER reports name the same number.
// The tabs follow the WAI-ARIA "tabs" pattern, like the admin panel (AdminHub).
"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { callApi } from "@/components/family/api";
import { districtName, fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import type {
  ModerationDecisionDto,
  ModerationPageDto,
  ModerationReportDto,
  ModerationStatus,
} from "@/schemas/moderation";
import { RejectDialog } from "./RejectDialog";
import { callDayText, queueUrl, repeatBadgeText, reportContext, reviewedText } from "./reportQueue";

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
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
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

  // Arrow keys move the selection (and the focus) to the next / previous tab.
  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((tab) => tab.status === status);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    const tab = TABS[next];
    if (tab !== undefined) {
      selectTab(tab.status);
      tabButtons.current[next]?.focus();
    }
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
      <header className="family-heading">
        <Link href={ROUTES.moderator} className="family-back">
          {bg.moderator.backToHub}
        </Link>
        <h1>{bg.moderator.reportsTitle}</h1>
        <p className="muted">{bg.moderator.reportsIntro}</p>
      </header>

      <div
        role="tablist"
        aria-label={bg.moderator.reportsTabsLabel}
        className="admin-tabs"
        onKeyDown={onTabKey}
      >
        {TABS.map((item, index) => (
          <button
            key={item.status}
            ref={(element) => {
              tabButtons.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${tabIds}-tab-${item.status}`}
            aria-controls={`${tabIds}-panel`}
            aria-selected={status === item.status}
            tabIndex={status === item.status ? 0 : -1}
            className="admin-tab"
            onClick={() => selectTab(item.status)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Always in the page, so screen readers hear every new message. */}
      <p
        role="status"
        aria-live="polite"
        className={notice?.kind === "success" ? "form-message form-message-success" : "sr-only"}
      >
        {notice?.kind === "success" ? notice.text : ""}
      </p>
      {notice?.kind === "error" ? (
        <p role="alert" className="form-message form-message-error">
          {notice.text}
        </p>
      ) : null}

      <section
        ref={panel}
        role="tabpanel"
        id={`${tabIds}-panel`}
        aria-labelledby={`${tabIds}-tab-${status}`}
        tabIndex={-1}
        className="admin-panel mod-queue"
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
          <div className="admin-more">
            {moreError ? (
              <p role="alert" className="form-message form-message-error">
                {moreError}
              </p>
            ) : null}
            <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMore()}>
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
      <p role="status" className="muted">
        {bg.moderator.reportsLoading}
      </p>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="family-error">
        <p role="alert" className="form-message form-message-error">
          {state.message}
        </p>
        <Button variant="secondary" onClick={props.onRetry}>
          {bg.moderator.retry}
        </Button>
      </div>
    );
  }
  if (state.reports.length === 0) {
    return <p className="card">{props.empty}</p>;
  }
  return (
    <ul className="person-list">
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
    <li className="card mod-report">
      <h2>{bg.scripts.typeNames[report.scriptType]}</h2>
      <p className="mod-report-meta">
        <span>
          {fill(bg.moderator.reportDistrict, { district: districtName(report.districtCode) })}
        </span>
        <span>{callDayText(report.occurredOn)}</span>
      </p>
      {/* Plain text: React escapes it, so a report can never add HTML to the page. */}
      <p className="mod-report-text">{report.description ?? bg.moderator.reportNoDescription}</p>
      {repeat !== null ? <p className="mod-status mod-repeat">{repeat}</p> : null}
      {reviewed !== null ? <p className="muted">{reviewed}</p> : null}
      {report.status === "rejected" && report.rejectReason !== null ? (
        <p className="mod-report-reason">
          {fill(bg.moderator.rejectReasonShown, { reason: report.rejectReason })}
        </p>
      ) : null}
      {report.status === "pending" ? (
        <div className="mod-report-actions">
          <Button disabled={props.busy} onClick={props.onApprove}>
            {props.approving ? bg.moderator.approving : bg.moderator.approve}
            <span className="sr-only">: {context}</span>
          </Button>
          <Button variant="danger" disabled={props.busy} onClick={props.onReject}>
            {bg.moderator.reject}
            <span className="sr-only">: {context}</span>
          </Button>
        </div>
      ) : null}
    </li>
  );
}
