// End-to-end tests for the „Известия на телефона“ card on /family (W2-05), WITHOUT a
// real push service.
//
// How: the card asks our API (GET /api/push/public-key, POST/DELETE
// /api/push/subscriptions), answered here with page.route(), and the browser's push
// parts (Notification, PushManager, navigator.serviceWorker), replaced before the page
// loads by an init script with small fakes we control. The card is shown on the
// preview page /dev/family (the real /family needs a login, see family.spec.ts).
// A real push on a real phone can only be tested by hand.

import { expect, test, type Page } from "@playwright/test";
import { bg } from "@/i18n/bg";

// A made-up VAPID public key: 65 bytes starting with 0x04, as base64url (87 characters).
const PUBLIC_KEY = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString("base64url");

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

// How the fake browser behaves.
type FakeBrowser = {
  supported: boolean; // has PushManager + Notification
  permission: NotificationPermission; // before anyone asks
  answer: NotificationPermission; // what the person taps in the permission question
  subscribed: boolean; // a subscription already exists
  iphone: boolean; // an iPhone in a normal Safari tab
  iphoneUa?: string; // the iPhone's user agent text (filled in by fakeBrowser)
};

const DEFAULT_BROWSER: FakeBrowser = {
  supported: true,
  permission: "default",
  answer: "granted",
  subscribed: false,
  iphone: false,
};

// Replaces the browser's push parts before any page script runs.
async function fakeBrowser(page: Page, options: Partial<FakeBrowser> = {}) {
  const config = { ...DEFAULT_BROWSER, ...options };
  await page.addInitScript(
    (fake: FakeBrowser) => {
      const w = window as unknown as Record<string, unknown>;
      const counters = { asked: 0 };
      w.__pushCounters = counters;

      if (fake.iphone) {
        Object.defineProperty(navigator, "userAgent", { get: () => fake.iphoneUa });
      }
      if (!fake.supported) {
        delete w.PushManager;
        return;
      }

      // Notification: its permission and the question „Разрешавате ли известия?“.
      class FakeNotification {
        static permission: NotificationPermission = fake.permission;
        static async requestPermission() {
          counters.asked++;
          FakeNotification.permission = fake.answer;
          return fake.answer;
        }
      }
      Object.defineProperty(window, "Notification", {
        value: FakeNotification,
        configurable: true,
      });
      if (typeof w.PushManager !== "function") {
        w.PushManager = function PushManager() {};
      }

      // A subscription as the browser's push service would give it.
      type FakeSubscription = {
        endpoint: string;
        options: { applicationServerKey: ArrayBuffer | null };
        toJSON: () => unknown;
        unsubscribe: () => Promise<boolean>;
      };
      let current: FakeSubscription | null = null;
      let registered = fake.subscribed;
      function makeSubscription(key: ArrayBuffer | null): FakeSubscription {
        const subscription: FakeSubscription = {
          endpoint: "https://push.example.invalid/send/abc123",
          options: { applicationServerKey: key },
          toJSON: () => ({
            endpoint: subscription.endpoint,
            expirationTime: null,
            keys: { p256dh: "BPfake-p256dh-key", auth: "fake-auth" },
          }),
          unsubscribe: async () => {
            current = null;
            return true;
          },
        };
        return subscription;
      }
      if (fake.subscribed) {
        current = makeSubscription(null);
      }
      const registration = {
        pushManager: {
          getSubscription: async () => current,
          subscribe: async (options: { applicationServerKey: Uint8Array }) => {
            current = makeSubscription(options.applicationServerKey.slice().buffer);
            return current;
          },
        },
      };
      const container = {
        register: async () => {
          registered = true;
          return registration;
        },
        ready: Promise.resolve(registration),
        getRegistration: async () => (registered ? registration : undefined),
      };
      Object.defineProperty(navigator, "serviceWorker", { value: container, configurable: true });
    },
    { ...config, iphoneUa: IPHONE_UA },
  );
}

// What our fake API received.
type Calls = { saved: unknown[]; deleted: unknown[] };

// Answers our push API (and an empty people list, which is not tested here).
async function mockApi(page: Page, enabled = true): Promise<Calls> {
  const calls: Calls = { saved: [], deleted: [] };
  await page.route("**/api/persons", (route) => route.fulfill({ json: { persons: [] } }));
  await page.route(
    (url) => url.pathname === "/api/push/public-key",
    (route) =>
      route.fulfill({
        json: enabled
          ? { enabled: true, publicKey: PUBLIC_KEY }
          : { enabled: false, publicKey: null },
      }),
  );
  await page.route(
    (url) => url.pathname === "/api/push/subscriptions",
    (route) => {
      const request = route.request();
      if (request.method() === "DELETE") {
        calls.deleted.push(request.postDataJSON());
        return route.fulfill({ json: { ok: true } });
      }
      calls.saved.push(request.postDataJSON());
      return route.fulfill({ status: 201, json: { ok: true } });
    },
  );
  return calls;
}

function card(page: Page) {
  return page.getByRole("region", { name: bg.pushOptIn.title });
}

function askedCount(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __pushCounters: { asked: number } }).__pushCounters.asked,
  );
}

test("„Включи известията“ asks only after the tap, subscribes, and „Изключи“ undoes it", async ({
  page,
}) => {
  await fakeBrowser(page);
  const calls = await mockApi(page);
  await page.goto("/dev/family");

  await expect(card(page)).toContainText(bg.pushOptIn.off);
  // Opening the page never shows the browser's permission question.
  expect(await askedCount(page)).toBe(0);

  await card(page).getByRole("button", { name: bg.pushOptIn.turnOn }).click();
  await expect(card(page)).toContainText(bg.pushOptIn.on);
  expect(await askedCount(page)).toBe(1);
  expect(calls.saved).toHaveLength(1);
  expect(calls.saved[0]).toMatchObject({
    endpoint: "https://push.example.invalid/send/abc123",
    keys: { p256dh: "BPfake-p256dh-key", auth: "fake-auth" },
  });

  await card(page).getByRole("button", { name: bg.pushOptIn.turnOff }).click();
  await expect(card(page)).toContainText(bg.pushOptIn.off);
  expect(calls.deleted).toEqual([{ endpoint: "https://push.example.invalid/send/abc123" }]);
  await expect(card(page).getByRole("button", { name: bg.pushOptIn.turnOn })).toBeVisible();
});

test("an existing subscription shows „включени“ with „Изключи“", async ({ page }) => {
  await fakeBrowser(page, { permission: "granted", subscribed: true });
  await mockApi(page);
  await page.goto("/dev/family");
  await expect(card(page)).toContainText(bg.pushOptIn.on);
  await expect(card(page).getByRole("button", { name: bg.pushOptIn.turnOff })).toBeVisible();
});

test("closing the permission question without „Разреши“ keeps it off with a hint", async ({
  page,
}) => {
  await fakeBrowser(page, { answer: "default" });
  const calls = await mockApi(page);
  await page.goto("/dev/family");
  await card(page).getByRole("button", { name: bg.pushOptIn.turnOn }).click();
  await expect(card(page).getByRole("status")).toHaveText(bg.pushOptIn.notAllowed);
  await expect(card(page)).toContainText(bg.pushOptIn.off);
  expect(calls.saved).toHaveLength(0);
});

test("blocked notifications: explains how to allow them, no button", async ({ page }) => {
  await fakeBrowser(page, { permission: "denied" });
  await mockApi(page);
  await page.goto("/dev/family");
  await expect(card(page)).toContainText(bg.pushOptIn.blocked);
  await expect(card(page).getByRole("button")).toHaveCount(0);
});

test("a browser without web push: says so, no button", async ({ page }) => {
  await fakeBrowser(page, { supported: false });
  await mockApi(page);
  await page.goto("/dev/family");
  await expect(card(page)).toContainText(bg.pushOptIn.unsupported);
  await expect(card(page).getByRole("button")).toHaveCount(0);
});

test("push not set up on the server: „Известията още не са настроени.“, no button", async ({
  page,
}) => {
  await fakeBrowser(page);
  await mockApi(page, false);
  await page.goto("/dev/family");
  await expect(card(page)).toContainText("Известията още не са настроени.");
  await expect(card(page).getByRole("button")).toHaveCount(0);
});

test("iPhone in Safari: the 3-step home screen hint instead of the button, fits 360 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await fakeBrowser(page, { iphone: true, supported: false });
  await mockApi(page);
  await page.goto("/dev/family");
  await expect(card(page)).toContainText(bg.pushOptIn.iosIntro);
  const steps = card(page).getByRole("listitem");
  await expect(steps).toHaveText([
    bg.pushOptIn.iosStepShare,
    bg.pushOptIn.iosStepAdd,
    bg.pushOptIn.iosStepOpen,
  ]);
  await expect(card(page).getByRole("button")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
