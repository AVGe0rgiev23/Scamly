// The list of all scam cards for the moderator (/moderator/scripts, W3-05): published
// cards and drafts as hairline-separated rows (title, type badge, published/draft
// pill, address and keyword count in mono), with „Нова схема“ and „Редактирай“.
// A Client Component: it asks our API (GET /api/scripts?all=1), which checks the role;
// RLS lets only moderators and admins read the drafts.
"use client";

import { ArrowLeft, Pencil, PencilLine, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { fill } from "@/components/family/format";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import type { ScriptDto } from "@/schemas/scripts";
import { BACK_LINK } from "./ModeratorFrame";

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
      <Link href={ROUTES.moderator} className={BACK_LINK}>
        <ArrowLeft className="size-5" aria-hidden="true" />
        {bg.moderator.backToHub}
      </Link>
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-[60ch]">
          <h1 className="text-h1">{bg.moderator.libraryTitle}</h1>
          <p className="mt-4 text-lg text-fg-muted">{bg.moderator.libraryIntro}</p>
        </div>
        <ButtonLink href={`${basePath}/nova`} className="self-start md:self-auto">
          <Plus className="size-5" aria-hidden="true" />
          {bg.moderator.newScript}
        </ButtonLink>
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
      <>
        <p role="status" className="sr-only">
          {bg.moderator.loading}
        </p>
        <SkeletonList rows={4} className="border-t border-line" />
      </>
    );
  }
  if (state.kind === "error") {
    return <ErrorState text={state.message} retryLabel={bg.moderator.retry} onRetry={onRetry} />;
  }
  if (state.scripts.length === 0) {
    return <EmptyState text={bg.moderator.empty} />;
  }
  return (
    <ul className="border-t border-line">
      {state.scripts.map((script) => (
        <li
          key={script.id}
          className="flex flex-col gap-4 border-b border-line py-5 sm:flex-row sm:items-center sm:gap-6"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{script.titleBg}</h2>
            <p className="mt-2 flex flex-wrap items-center gap-2">
              <Badge>{bg.scripts.typeNames[script.scriptType]}</Badge>
              <StatusPill
                status={script.published ? "safe" : "neutral"}
                icon={
                  script.published ? undefined : (
                    <PencilLine className="size-[1.15em]" aria-hidden="true" />
                  )
                }
                className="py-0.5 text-xs"
              >
                {script.published ? bg.moderator.statusPublished : bg.moderator.statusDraft}
              </StatusPill>
            </p>
            <p className="tabular mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-fg-subtle">
              <span className="break-all">
                {ROUTES.education}/{script.slug}
              </span>
              <span>{fill(bg.moderator.keywordCount, { count: script.extraKeywords.length })}</span>
            </p>
          </div>
          <ButtonLink
            href={`${basePath}/${script.id}`}
            variant="secondary"
            size="sm"
            className="self-start sm:self-auto"
          >
            <Pencil className="size-5" aria-hidden="true" />
            {bg.moderator.edit}
            <span className="sr-only">: {script.titleBg}</span>
          </ButtonLink>
        </li>
      ))}
    </ul>
  );
}
