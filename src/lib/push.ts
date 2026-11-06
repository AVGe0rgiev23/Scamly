// Web push in the browser (task W2-05): the helpers behind the „Известия на телефона“
// card (src/components/family/PushOptIn.tsx) and the iPhone hint. No UI here.
//
//   isPushEnabledOnServer()  should the button be shown at all? (FEATURE_PUSH + keys)
//   isPushSupported()        can this browser do web push?
//   isIosNeedsHomeScreen()   iPhone/iPad not opened from the home screen: show the hint
//                            „Добавете Scamly към началния екран…“ (risk R2, D7)
//   getPushPermission()      "granted" | "denied" | "default" | "unsupported"
//   isSubscribedToPush()     is push already on in this browser?
//   subscribeToPush()        the button: asks permission, subscribes, tells our server
//   unsubscribeFromPush()    switch off (also call it on logout, so the next person
//                            using this browser doesn't get our alerts)
//   unsubscribeFromPushBeforeLogout()  the same for „Изход“, never waits long
//
// IMPORTANT for the button: call subscribeToPush() DIRECTLY in the click handler.
// Browsers (Safari above all) only show the permission question in answer to a tap.
//
// How it works: the browser's push service (Google, Apple, Mozilla, Microsoft) gives
// this browser an address (endpoint) + two keys; we send them to
// POST /api/push/subscriptions. When the family must be alerted, our server sends an
// encrypted message to that address, and our service worker (public/sw.js) shows it.

import type { PushPublicKeyDto } from "@/schemas/push";

// Where the service worker is served (public/sw.js) and the pages it may control.
// Exported for src/components/pwa/RegisterServiceWorker.tsx (W2-09).
export const SERVICE_WORKER_URL = "/sw.js";
export const SERVICE_WORKER_SCOPE = "/";

// ---------------------------------------------------------------------------------
// Pure helpers (no browser needed, unit-tested in push.test.ts)
// ---------------------------------------------------------------------------------

// The parts of the browser's global objects that isPushSupported() looks at. All of
// them may be missing (`?` = optional, like a Python field with default None).
export type PushSupportScope = {
  navigator?: { serviceWorker?: unknown };
  PushManager?: unknown;
  Notification?: unknown;
};

// True when this browser can do web push: it has service workers, the Push API and
// notifications. On an iPhone this is only true when Scamly was opened from the home
// screen (iOS 16.4+); in a normal Safari tab PushManager is missing.
// Service workers also need HTTPS (or localhost), otherwise navigator.serviceWorker
// is missing too.
export function isPushSupported(
  scope: PushSupportScope = globalThis as unknown as PushSupportScope,
): boolean {
  return (
    scope.navigator !== undefined &&
    scope.navigator.serviceWorker !== undefined &&
    typeof scope.PushManager === "function" &&
    typeof scope.Notification === "function"
  );
}

// What isIosNeedsHomeScreen() needs to know about the device.
export type DeviceInfo = {
  userAgent: string;
  maxTouchPoints: number; // how many fingers the screen can sense (0 = no touch screen)
  standalone: boolean; // opened from the home screen icon (not in a browser tab)
};

// iPhone, iPod or iPad. Since iPadOS 13 an iPad says "Macintosh" like a Mac, but a Mac
// has no touch screen, so "Macintosh" + touch means iPad.
export function isIosDevice(device: DeviceInfo): boolean {
  if (/iPhone|iPad|iPod/.test(device.userAgent)) {
    return true;
  }
  return /Macintosh/.test(device.userAgent) && device.maxTouchPoints > 1;
}

// On an iPhone / iPad, web push only works after "Add to Home Screen" (iOS 16.4+),
// when Scamly is opened from that icon. True = show the hint instead of the button.
export function needsHomeScreenForPush(device: DeviceInfo): boolean {
  return isIosDevice(device) && !device.standalone;
}

// The VAPID public key comes as base64url text ("BEl6…", with "-" and "_" instead of
// "+" and "/", and without "=" at the end). pushManager.subscribe() wants the raw
// bytes. Like Python's base64.urlsafe_b64decode(text + "==").
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replaceAll("-", "+").replaceAll("_", "/");
  const text = atob(base64); // one character per byte
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i);
  }
  return bytes;
}

// True when two byte sequences are the same (used to notice a changed server key).
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------------
// Browser functions (they use window, navigator, fetch)
// ---------------------------------------------------------------------------------

// The real device facts of this browser.
function currentDevice(): DeviceInfo {
  // Safari's own flag for "opened from the home screen" (not in the standard types).
  const safariNavigator = navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      safariNavigator.standalone === true,
  };
}

// iPhone / iPad in a normal browser tab: push can't work until Scamly is added to the
// home screen and opened from there. Show the hint. (false outside a browser.)
export function isIosNeedsHomeScreen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return needsHomeScreenForPush(currentDevice());
}

// The notification permission of this site, or "unsupported".
export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) {
    return "unsupported";
  }
  return Notification.permission;
}

// Asks our server whether push is on, and for its public key (null = push is off).
async function fetchPublicKey(): Promise<string | null> {
  const response = await fetch("/api/push/public-key", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as PushPublicKeyDto;
  return body.enabled ? body.publicKey : null;
}

// Should the „Включи известията“ button be shown? (server switch + this browser)
export async function isPushEnabledOnServer(): Promise<boolean> {
  try {
    return (await fetchPublicKey()) !== null;
  } catch {
    return false;
  }
}

// This browser's current subscription, or null.
async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
  if (registration === undefined) {
    return null;
  }
  return registration.pushManager.getSubscription();
}

// Is push on in this browser? (The subscription exists in the browser; our server
// stores it at the same moment, in subscribeToPush.)
export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return false;
  }
  try {
    return (await currentSubscription()) !== null;
  } catch {
    return false;
  }
}

// Sends the subscription to our server. "taken" = it belongs to another account.
async function saveOnServer(subscription: PushSubscription): Promise<"ok" | "taken" | "error"> {
  const response = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    // toJSON() gives { endpoint, expirationTime, keys: { p256dh, auth } }.
    body: JSON.stringify(subscription.toJSON()),
  });
  if (response.ok) {
    return "ok";
  }
  return response.status === 409 ? "taken" : "error";
}

// A new subscription at the browser's push service, signed for our server's key.
// userVisibleOnly: we promise that every push shows a notification (browsers require it).
function newSubscription(
  registration: ServiceWorkerRegistration,
  key: Uint8Array<ArrayBuffer>,
): Promise<PushSubscription> {
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}

// What subscribeToPush() can answer (the UI shows a message for each).
export type SubscribeResult =
  | "subscribed" // done: notifications will arrive
  | "ios_home_screen" // iPhone / iPad: add Scamly to the home screen first
  | "unsupported" // this browser can't do web push
  | "denied" // the person said no (or blocked notifications for this site)
  | "disabled" // push is switched off on the server
  | "failed"; // something else went wrong (network, push service); try again

// The button: switch push on for this browser and the logged-in account.
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (isIosNeedsHomeScreen()) {
    return "ios_home_screen";
  }
  if (!isPushSupported()) {
    return "unsupported";
  }
  try {
    // 1. Ask first, while we are still inside the tap (see the top of this file).
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return "denied";
    }
    // 2. Register the service worker. updateViaCache "none": always fetch a fresh sw.js.
    await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: SERVICE_WORKER_SCOPE,
      updateViaCache: "none",
    });
    const registration = await navigator.serviceWorker.ready;

    // 3. The server's public key (null = push is switched off on the server).
    const publicKey = await fetchPublicKey();
    if (publicKey === null) {
      return "disabled";
    }
    const key = urlBase64ToUint8Array(publicKey);

    // 4. Reuse this browser's subscription, unless it was made for an old key.
    let subscription = await registration.pushManager.getSubscription();
    if (subscription !== null) {
      const oldKey = subscription.options.applicationServerKey;
      if (oldKey === null || !sameBytes(new Uint8Array(oldKey), key)) {
        await subscription.unsubscribe();
        subscription = null;
      }
    }
    if (subscription === null) {
      subscription = await newSubscription(registration, key);
    }

    // 5. Tell our server. If this browser's address still belongs to the account that
    //    used it before, make a brand-new address (the old one stops working) and retry.
    let saved = await saveOnServer(subscription);
    if (saved === "taken") {
      await subscription.unsubscribe();
      subscription = await newSubscription(registration, key);
      saved = await saveOnServer(subscription);
    }
    return saved === "ok" ? "subscribed" : "failed";
  } catch {
    return "failed";
  }
}

// Switch push off for this browser. true = it is off now (or was never on).
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return true;
  }
  try {
    const subscription = await currentSubscription();
    if (subscription === null) {
      return true;
    }
    // Server first (needs the login), then the browser.
    await fetch("/api/push/subscriptions", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

// „Изход“: switch push off for this browser before the session ends (the server
// needs the login to delete the subscription), so the next person using this browser
// doesn't get our alerts. Best effort: it never fails and never makes „Изход“ wait
// longer than `timeoutMs`, even with a slow network or a stuck push service.
// `unsubscribe` is a parameter only so the unit tests can pass a fake.
export async function unsubscribeFromPushBeforeLogout(
  unsubscribe: () => Promise<boolean> = unsubscribeFromPush,
  timeoutMs = 1500,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  try {
    // Promise.race: whichever finishes first (like Python's asyncio.wait FIRST_COMPLETED).
    await Promise.race([unsubscribe().catch(() => false), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
