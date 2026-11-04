// Scamly's service worker (task W2-05): shows web push notifications to family members.
//
// A service worker is a small script the browser keeps in the background, even when
// no Scamly tab is open. It has no page and no `window`: `self` is the worker itself.
// It is plain JavaScript (not TypeScript) because the browser loads it directly from
// /sw.js, without our build. src/lib/push.ts registers it with scope "/".
//
// The server sends (src/server/notifications/pushSender.ts, PushMessage):
//   { "title": "...", "body": "...", "url": "/family/alerts?check=…", "tag": "check-…" }
//
// Here (W2-09, Roberta) the offline "what to do" card will be added: an `install`
// handler that caches the card, and a `fetch` handler that shows it without network.
// Until then this worker caches nothing, so it never serves an old page.

// The icons for the notification. They come with the web app manifest (W2-09); until
// the files exist, the browser simply shows its default icon.
const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-72.png";

// A new version of this file takes over at once (instead of waiting until every
// Scamly tab is closed), so a fix reaches the family's phones quickly.
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
