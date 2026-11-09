// The list of all scam cards for the moderator (/moderator/scripts, W3-05): published
// cards and drafts, with „Нова схема“ and „Редактирай“.
// A Client Component: it asks our API (GET /api/scripts?all=1), which checks the role;
// RLS lets only moderators and admins read the drafts.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import type { ScriptDto } from "@/schemas/scripts";

type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; scripts: ScriptDto[] };

// basePath: where the editor pages are (/moderator/scripts; the preview passes its own).
export function ScriptLibrary({ basePath = ROUTES.moderatorScripts }: { basePath?: string }) {
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0); // a new number = load again

  useEffect(() => {
    let active = true; // an old, slow answer must not overwrite a newer one
    async function load() {
      const result = await callApi<{ scripts: ScriptDto[] }>("/api/scripts?all=1");
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", scripts: result.data.scripts }
          : { kind: "error", message: result.messageBg },
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <>
      <header className="family-heading">
        <Link href={ROUTES.moderator} className="family-back">
          {bg.moderator.backToHub}
        </Link>
        <h1>{bg.moderator.libraryTitle}</h1>
        <p className="muted">{bg.moderator.libraryIntro}</p>
        <div>
          <Link href={`${basePath}/nova`} className="button button-primary">
            {bg.moderator.newScript}
          </Link>
        </div>
      </header>
      <ScriptRows
        state={state}
        basePath={basePath}
        onRetry={() => {
          setState({ kind: "loading" });
          setAttempt(attempt + 1);
        }}
      />
    </>
  );
}

function ScriptRows({
  state,
  basePath,
  onRetry,
}: {
  state: ListState;
  basePath: string;
  onRetry: () => void;
}) {
  if (state.kind === "loading") {
    return (
      <p role="status" className="muted">
        {bg.moderator.loading}
      </p>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="family-error">
        <p role="alert" className="form-message form-message-error">
          {state.message}
        </p>
        <Button variant="secondary" onClick={onRetry}>
          {bg.moderator.retry}
        </Button>
      </div>
    );
  }
  if (state.scripts.length === 0) {
    return <p className="card">{bg.moderator.empty}</p>;
  }
  return (
    <ul className="person-list">
      {state.scripts.map((script) => (
        <li key={script.id} className="card mod-script">
          <p className="edu-type">{bg.scripts.typeNames[script.scriptType]}</p>
          <h2>{script.titleBg}</h2>
          <p className="mod-script-meta">
            <span className={script.published ? "mod-status mod-status-live" : "mod-status"}>
              {script.published ? bg.moderator.statusPublished : bg.moderator.statusDraft}
            </span>{" "}
            <span className="muted">
              {ROUTES.education}/{script.slug} ·{" "}
              {fill(bg.moderator.keywordCount, { count: script.extraKeywords.length })}
            </span>
          </p>
          <Link href={`${basePath}/${script.id}`} className="button button-secondary">
            {bg.moderator.edit}
            <span className="sr-only">: {script.titleBg}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
