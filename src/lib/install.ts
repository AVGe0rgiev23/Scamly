// "Install Scamly as an app" in the browser (task W2-09): the helpers behind the
// „Инсталирай Scamly“ card (src/components/pwa/InstallPrompt.tsx). No UI here.
//
// Android / Chrome (and Edge) fire a `beforeinstallprompt` event when the site can be
// installed (it has a web app manifest, src/app/manifest.ts, and is not installed
// yet). We keep that event and call its prompt() when the person taps „Инсталирай“;
// the browser then shows its own „Инсталиране?“ question. Safari on iPhone never
// fires it: there the card shows the 3 steps by hand instead (isIosNeedsHomeScreen()
// in src/lib/push.ts).
//
// The event can fire early, before React has drawn the card, so we listen as soon as
// this file is loaded in the browser and remember it here.

// The event is not in TypeScript's standard types yet (Chrome-only), so we describe
// the two parts we use. `extends Event` = "is an Event, plus these", like a Python
// subclass.
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// localStorage key: the person pressed „Не сега“ (we don't ask again on this browser).
const DISMISSED_KEY = "scamly-install-dismissed";

let savedEvent: BeforeInstallPromptEvent | null = null;
// Who wants to hear when savedEvent changes (the card). A Set is like a Python set.
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop Chrome's own small banner; our card asks instead.
    event.preventDefault();
    savedEvent = event as BeforeInstallPromptEvent;
    notify();
  });
  // Installed (by our button or from the browser menu): nothing to offer any more.
  window.addEventListener("appinstalled", () => {
    savedEvent = null;
    notify();
  });
}

// For React's useSyncExternalStore: listen for changes; returns "stop listening".
export function subscribeToInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The saved event, or null when the browser can't install Scamly right now.
export function getInstallPromptEvent(): BeforeInstallPromptEvent | null {
  return savedEvent;
}

// „Инсталирай“: shows the browser's install question. Must be called in the tap
// handler. An event can be used only once, so it is forgotten afterwards.
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = savedEvent;
  if (event === null) {
    return "unavailable";
  }
  savedEvent = null;
  notify();
  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome;
  } catch {
    return "dismissed";
  }
}

// Did the person press „Не сега“ on this browser? Browser storage may be blocked
// (private mode), so every read and write is wrapped in try/catch.
export function isInstallDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberInstallDismissed(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Not remembered: the card comes back on the next visit, which is harmless.
  }
}
