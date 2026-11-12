// „Дневник“ in the admin panel (W3-06): the audit log, newest first, 50 lines at a
// time with „Покажи още“. Data: GET /api/admin/audit-log?cursor, which checks the role.
// Each line: when, what (in Bulgarian), who, about what, and a short safe summary;
// a timeline of hairline rows with the time in the data font on the left.
"use client";

import { useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { fill, formatDateTime } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { bg } from "@/i18n/bg";
import type { AuditEntryDto, AuditPageDto } from "@/schemas/admin";
import { actionLabel, targetLabel } from "./adminFormat";

type AuditState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; entries: AuditEntryDto[]; nextCursor: string | null };

export function AuditPanel() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AuditState>({ kind: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await callApi<AuditPageDto>("/api/admin/audit-log");
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", entries: result.data.entries, nextCursor: result.data.nextCursor }
          : { kind: "error", message: result.messageBg },
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [attempt]);

  async function loadMore() {
    if (state.kind !== "ready" || state.nextCursor === null) return;
    setLoadingMore(true);
    setMoreError(null);
    const result = await callApi<AuditPageDto>(
      `/api/admin/audit-log?cursor=${encodeURIComponent(state.nextCursor)}`,
    );
    setLoadingMore(false);
    if (!result.ok) {
      setMoreError(result.messageBg);
      return;
    }
    setState({
      kind: "ready",
      entries: [...state.entries, ...result.data.entries],
      nextCursor: result.data.nextCursor,
    });
  }

  return (
    <div>
      <header className="mb-8 max-w-[60ch]">
        <h2 className="text-h3">{bg.admin.auditTitle}</h2>
        <p className="mt-2 text-fg-muted">{bg.admin.auditIntro}</p>
      </header>
      {state.kind === "loading" ? (
        <>
          <p role="status" className="sr-only">
            {bg.admin.loading}
          </p>
          <SkeletonList rows={5} className="border-t border-line" />
        </>
      ) : null}
      {state.kind === "error" ? (
        <ErrorState
          text={state.message}
          retryLabel={bg.admin.retry}
          onRetry={() => {
            setState({ kind: "loading" });
            setAttempt(attempt + 1);
          }}
        />
      ) : null}
      {state.kind === "ready" && state.entries.length === 0 ? (
        <EmptyState text={bg.admin.auditEmpty} />
      ) : null}
      {state.kind === "ready" && state.entries.length > 0 ? (
        <ol className="border-t border-line" aria-label={bg.admin.auditTitle}>
          {state.entries.map((entry) => (
            <li
              key={entry.id}
              className="grid gap-1 border-b border-line py-4 md:grid-cols-12 md:gap-6"
            >
              {/* Left: when (data font). Right: what, who, about what, the summary. */}
              <time
                dateTime={entry.createdAt}
                className="tabular font-mono text-xs text-fg-subtle md:col-span-3 md:pt-1"
              >
                {formatDateTime(entry.createdAt)}
              </time>
              <div className="min-w-0 md:col-span-9">
                <p className="font-semibold">{actionLabel(entry.action)}</p>
                <p className="text-sm text-fg-muted">
                  {fill(bg.admin.auditBy, { name: entry.actorName ?? bg.admin.auditNoActor })}
                  {entry.targetType ? (
                    <>
                      {" · "}
                      {fill(bg.admin.auditTarget, { target: targetLabel(entry.targetType) })}
                    </>
                  ) : null}
                </p>
                {entry.summary ? (
                  <p className="mt-1 font-mono text-xs break-words text-fg-muted">
                    {entry.summary}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {state.kind === "ready" && state.nextCursor !== null ? (
        <div className="mt-6 flex flex-col items-start gap-3">
          {moreError ? (
            <Notice status="danger" role="alert">
              {moreError}
            </Notice>
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
    </div>
  );
}
