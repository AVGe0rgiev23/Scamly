// Registers our service worker (public/sw.js) for every visitor (task W2-09), so the
// offline "what to do" card works even for someone who never switched on push, like
// the older person's phone. Draws nothing. Used once, in the root layout.
//
// Registering asks the person nothing (no permission question): it only lets the
// browser install the worker in the background. Registering the same file again
// (push.ts does it for push) is harmless: the browser keeps one worker per scope.
"use client";

import { useEffect } from "react";
import { SERVICE_WORKER_SCOPE, SERVICE_WORKER_URL } from "@/lib/push";

export function RegisterServiceWorker() {
  useEffect(() => {
    // Old browsers, and http:// addresses other than localhost, have no service workers.
    if (!("serviceWorker" in navigator)) {
      return;
    }
    // updateViaCache "none": always ask our server for a fresh sw.js (like push.ts).
    navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { scope: SERVICE_WORKER_SCOPE, updateViaCache: "none" })
      .catch(() => {
        // No worker: the site works the same, only without the offline card.
      });
  }, []);
  return null;
}
