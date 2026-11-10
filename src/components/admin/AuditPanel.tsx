// „Дневник“ in the admin panel (W3-06): the audit log, newest first, 50 lines at a
// time with „Покажи още“. Data: GET /api/admin/audit-log?cursor, which checks the role.
// Each line: when, what (in Bulgarian), who, about what, and a short safe summary.
"use client";

import { useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { fill, formatDateTime } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
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
    <div className="admin-section">
      <h2>{bg.admin.auditTitle}</h2>
      <p className="muted">{bg.admin.auditIntro}</p>
      {state.kind === "loading" ? (
        <p role="status" className="muted">
          {bg.admin.loading}
        </p>
      ) : null}
      {state.kind === "error" ? (
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
            {bg.admin.retry}
          </Button>
        </div>
      ) : null}
      {state.kind === "ready" && state.entries.length === 0 ? (
        <p className="card">{bg.admin.auditEmpty}</p>
      ) : null}
      {state.kind === "ready" && state.entries.length > 0 ? (
        <ol className="admin-audit" aria-label={bg.admin.auditTitle}>
          {state.entries.map((entry) => (
            <li key={entry.id} className="admin-audit-row">
              <p className="admin-audit-head">
                <strong>{actionLabel(entry.action)}</strong>
                <time dateTime={entry.createdAt} className="muted">
                  {formatDateTime(entry.createdAt)}
                </time>
              </p>
              <p>
                {fill(bg.admin.auditBy, { name: entry.actorName ?? bg.admin.auditNoActor })}
                {entry.targetType ? (
                  <>
                    {" · "}
                    {fill(bg.admin.auditTarget, { target: targetLabel(entry.targetType) })}
                  </>
                ) : null}
              </p>
              {entry.summary ? <p className="admin-audit-summary">{entry.summary}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
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
    </div>
  );
}
