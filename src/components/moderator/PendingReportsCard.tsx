// The „Сигнали за проверка“ panel on the moderator hub (/moderator, W3-04 UI): the wide
// panel with a link to the report queue and the number of pending reports as a big
// monospaced figure plus a pill in words. The number comes from the
// FIRST page of the queue (25 reports), so a full page shows „25+“: the hub needs
// "is there work?", not an exact count, and one small request is enough.
// A Client Component: the API (/api/moderation/reports) checks the role.
"use client";

import { ArrowRight, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { fill } from "@/components/family/format";
import { StatusPill } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { bg } from "@/i18n/bg";
import type { ModerationPageDto } from "@/schemas/moderation";
import { pendingCountText, queueUrl } from "./reportQueueHelpers";

// null = still loading or the count could not be read (the link still works).
type Count = { text: string; none: boolean } | null;

export function PendingReportsCard({ href }: { href: string }) {
  const [count, setCount] = useState<Count>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await callApi<ModerationPageDto>(queueUrl("pending", null));
      if (!active) return;
      setLoaded(true);
      if (result.ok) {
        const shown = result.data.reports.length;
        setCount({
          text: pendingCountText(shown, result.data.nextCursor),
          none: shown === 0,
        });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  // „Броене…“ while loading, „Няма чакащи сигнали.“ for an empty queue, else nothing.
  let statusText = "";
  if (!loaded) statusText = bg.moderator.reportsCardLoading;
  else if (count?.none === true) statusText = bg.moderator.reportsCardNone;

  return (
    <li className="grid-lines flex flex-col rounded-lg border border-line-strong bg-surface-1 p-6 md:col-span-7 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-h3">{bg.moderator.reportsCardTitle}</h2>
        {count !== null && !count.none ? (
          <StatusPill status="info" icon={<Clock className="size-[1.15em]" aria-hidden="true" />}>
            {fill(bg.moderator.reportsCardPending, { count: count.text })}
          </StatusPill>
        ) : null}
      </div>
      {/* The big number: only a picture of the count (the pill and the status line say
          it in words). The line keeps its height while the number loads. */}
      <p
        className="tabular mt-6 flex h-[1em] items-center font-mono text-h1 leading-none font-semibold"
        aria-hidden="true"
      >
        {!loaded ? <Skeleton className="h-[0.8em] w-24" /> : null}
        {loaded && count !== null ? (
          <span className={count.none ? "text-fg-subtle" : undefined}>{count.text}</span>
        ) : null}
      </p>
      <p className="mt-4 text-fg-muted">{bg.moderator.reportsCardText}</p>
      <p role="status" className={statusText === "" ? "sr-only" : "mt-1 text-sm text-fg-subtle"}>
        {statusText}
      </p>
      <ButtonLink href={href} className="mt-6 self-start">
        {bg.moderator.reportsCardLink}
        <ArrowRight className="size-5" aria-hidden="true" />
      </ButtonLink>
    </li>
  );
}
