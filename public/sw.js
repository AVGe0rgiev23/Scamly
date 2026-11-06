// Scamly's service worker: shows web push notifications to family members (task W2-05,
// Alex) and the offline "what to do" card when there is no internet (task W2-09).
//
// A service worker is a small script the browser keeps in the background, even when
// no Scamly tab is open. It has no page and no `window`: `self` is the worker itself.
// It is plain JavaScript (not TypeScript) because the browser loads it directly from
// /sw.js, without our build. src/lib/push.ts registers it with scope "/".
//
// The server sends (src/server/notifications/pushSender.ts, PushMessage):
//   { "title": "...", "body": "...", "url": "/family/alerts?check=…", "tag": "check-…" }
//
// The offline "what to do" card (W2-09, Roberta): on `install` the worker saves ONE
// page, /offline (src/app/offline/route.ts). The `fetch` handler below shows it only
// when a page can't load because there is no internet. Everything else always comes
// from the network: we never keep copies of app pages or API data, so nobody ever
// sees an old verdict or an old alert. src/components/pwa/RegisterServiceWorker.tsx
// registers this worker for every visitor (push.ts registers it too, for push).

// The icons for the notification (public/icons/, made by scripts/icons/generate.mjs).
const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-72.png";

// The name of our one cache. Change the number when /offline changes: the new worker
// then saves the new page, and `activate` deletes the old cache.
const CACHE_NAME = "scamly-offline-v1";
const OFFLINE_URL = "/offline";

// Saves the offline card. { cache: "reload" } skips the browser's HTTP cache, so we
// save a fresh copy. If saving fails (e.g. no internet right now), the worker is
// still installed: push must keep working, and the next update tries again.
async function saveOfflinePage() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
  } catch {
    // No offline card this time; the browser shows its own "no internet" page.
  }
}

// A new version of this file takes over at once (instead of waiting until every
// Scamly tab is closed), so a fix reaches the family's phones quickly.
self.addEventListener("install", (event) => {
  event.waitUntil(saveOfflinePage().then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Delete caches of older versions of this worker (only our own "scamly-" ones).
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("scamly-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      // Navigation preload: the browser starts loading the page while this worker is
      // still waking up, so pages don't open slower because of it.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

// Every request of an open Scamly page passes here. We only touch NAVIGATIONS (opening
// a page: a link, the address bar, the home screen icon). For them: the network as
// always; only when it fails (no internet) the saved offline card. Pictures, scripts
// and API calls are not touched at all: without respondWith() the browser does its
// normal request.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") {
    return;
  }
  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) {
          return preloaded;
        }
        return await fetch(event.request);
      } catch {
        const saved = await caches.match(OFFLINE_URL, { cacheName: CACHE_NAME });
        return saved || Response.error();
      }
    })(),
  );
});

// Reads the message the server sent. Anything unexpected becomes a general alert, so
// a family member is never left without a notification.
function readMessage(event) {
  const fallback = { title: "Scamly", body: "", url: "/family", tag: "scamly" };
  if (!event.data) {
    return fallback;
  }
  try {
    const data = event.data.json();
    return {
      title: typeof data.title === "string" ? data.title : fallback.title,
      body: typeof data.body === "string" ? data.body : fallback.body,
      // Only a path on our own site (starts with one "/"), never another site.
      url: typeof data.url === "string" && /^\/(?!\/)/.test(data.url) ? data.url : fallback.url,
      tag: typeof data.tag === "string" ? data.tag : fallback.tag,
    };
  } catch {
    return fallback;
  }
}

// A push message arrived: show it. event.waitUntil() keeps the worker alive until the
// notification is on the screen (browsers require a visible notification per push).
self.addEventListener("push", (event) => {
  const message = readMessage(event);
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: ICON,
      badge: BADGE,
      // Same tag = the red follow-up REPLACES the first notification of that check,
      // and renotify makes the phone ring/vibrate again for it.
      tag: message.tag,
      renotify: true,
      // Stays on the screen until the family member reacts (where supported).
      requireInteraction: true,
      data: { url: message.url },
    }),
  );
});

// The notification was tapped: bring an open Scamly tab to the front and go to the
// alert page, or open a new tab with it.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || "/family";
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      // Only tabs of our own site are listed (a service worker sees nothing else).
      const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (tabs.length > 0) {
        try {
          const tab = await tabs[0].focus();
          await tab.navigate(target);
          return;
        } catch {
          // That tab can't be steered (e.g. it was opened before this worker): fall
          // through and open a new one.
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
