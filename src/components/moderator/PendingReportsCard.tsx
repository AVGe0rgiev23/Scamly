// The „Сигнали за проверка“ card on the moderator hub (/moderator, W3-04 UI): a link
// to the report queue with the number of pending reports. The number comes from the
// FIRST page of the queue (25 reports), so a full page shows „25+“: the hub needs
// "is there work?", not an exact count, and one small request is enough.
// A Client Component: the API (/api/moderation/reports) checks the role.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { fill } from "@/components/family/format";
import { bg } from "@/i18n/bg";
import type { ModerationPageDto } from "@/schemas/moderation";
import { pendingCountText, queueUrl } from "./reportQueue";

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
    <li className="card mod-hub-card">
      <h2>
        {bg.moderator.reportsCardTitle}{" "}
        {count !== null && !count.none ? (
          <span className="mod-badge mod-badge-count">
            {fill(bg.moderator.reportsCardPending, { count: count.text })}
          </span>
        ) : null}
      </h2>
      <p>{bg.moderator.reportsCardText}</p>
      <p role="status" className={statusText === "" ? "sr-only" : "muted"}>
        {statusText}
      </p>
      <Link href={href} className="button button-primary">
        {bg.moderator.reportsCardLink}
      </Link>
    </li>
  );
}
