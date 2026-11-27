// The small live badge on the family's „Сигнали“ link (header pill and phone dock):
// how many „Ти ли си?“ questions are waiting for this family member.
//
// Cheap on purpose: ONE GET /api/identity-checks when the page opens, after every
// navigation and when the tab comes back to the front. No Realtime channel and no
// polling for the menu (the alert page itself is live). Any error simply shows no
// badge: the menu must never break a page. Read aloud as part of the link
// („Сигнали, 1 въпрос чака отговор“).
"use client";

import { useEffect, useState } from "react";
import { badgeLabel } from "./siteNav";

// Asks the API how many questions wait; null when it cannot be known.
async function countPending(): Promise<number | null> {
  try {
    const response = await fetch("/api/identity-checks", {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    // `as`: we trust the shape of our own API's answer (a type hint, no runtime check).
    const body = (await response.json()) as { pending?: unknown[] };
    return Array.isArray(body.pending) ? body.pending.length : null;
  } catch {
    return null;
  }
}

// The header pill and the dock both show the badge; they share one request per page
// (a module-level variable, like a Python module global).
let shared: { key: string; promise: Promise<number | null> } | null = null;

function countOnce(key: string): Promise<number | null> {
  if (shared === null || shared.key !== key) {
    shared = { key, promise: countPending() };
  }
  return shared.promise;
}

// `pathname` comes from the menu (it already knows the page), so a new page asks again.
export function NavBadge({ pathname }: { pathname: string | null }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // `alive` stops a late answer from an old page from changing the new one.
    let alive = true;
    const load = (fresh: boolean) => {
      const key = fresh ? `${pathname ?? ""}@${Date.now()}` : (pathname ?? "");
      void countOnce(key).then((value) => {
        if (alive) setCount(value ?? 0);
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") load(true);
    };
    load(false);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  if (count <= 0) return null;
  return (
    <span className="site-badge">
      <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
      <span className="sr-only">, {badgeLabel(count)}</span>
    </span>
  );
}
