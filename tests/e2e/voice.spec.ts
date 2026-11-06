// End-to-end tests for voice input on the older person's text step (W2-10), WITHOUT a
// microphone.
//
// How: an init script replaces the browser's SpeechRecognition with a small fake
// before the page loads; the test then makes the fake "hear" words (window.__speak)
// or fail (window.__voiceError), exactly as the real API calls the page back. The
// call check is opened on the preview page /dev/protected, like protected.spec.ts.
// Real Bulgarian speech recognition can only be tested by hand on a phone.

import { expect, test, type Page } from "@playwright/test";
import { bg } from "@/i18n/bg";

const CHECK_ID = "e1000000-0000-4000-8000-0000000000c1";

// Replaces SpeechRecognition with a fake (supported) or removes it (unsupported).
async function fakeSpeech(page: Page, supported: boolean) {
  await page.addInitScript((hasSpeech: boolean) => {
    const w = window as unknown as Record<string, unknown>;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
    if (!hasSpeech) {
      return;
    }
    type Handler = ((event: unknown) => void) | null;
    const log = { created: 0, started: 0, lang: "", interimResults: false };
    w.__voiceLog = log;
    // Every session made by the page; the newest one is the one listening.
    const sessions: FakeRecognition[] = [];
    class FakeRecognition {
      lang = "";
      interimResults = false;
      continuous = false;
      maxAlternatives = 1;
      onresult: Handler = null;
      onerror: Handler = null;
      onend: Handler = null;
      constructor() {
        log.created++;
        sessions.push(this);
      }
      start() {
        log.started++;
        log.lang = this.lang;
        log.interimResults = this.interimResults;
      }
      stop() {
        this.onend?.({});
      }
      abort() {
        this.onend?.({});
      }
    }
    w.webkitSpeechRecognition = FakeRecognition;
    // The test "speaks": one result, final or still a guess.
    w.__speak = (transcript: string, isFinal: boolean) => {
      const current = sessions.at(-1);
      current?.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript } }] });
    };
    w.__voiceError = (code: string) => {
      const current = sessions.at(-1);
      current?.onerror?.({ error: code });
      current?.onend?.({});
    };
  }, supported);
}

// Answers the call check's API (only the start of the check is needed here).
async function mockApi(page: Page) {
  await page.route(
    (url) => url.pathname === "/api/checks",
    (route) => route.fulfill({ status: 201, json: { checkId: CHECK_ID } }),
  );
}

// Big button → four „Не“ answers → the optional text step.
async function openTextStep(page: Page) {
  await page.goto("/dev/protected");
  await page.getByRole("button", { name: bg.protectedCheck.bigButton }).click();
  await page.getByRole("radio", { name: bg.protectedCheck.identities.other, exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("radio", { name: bg.protectedCheck.tri.no, exact: true }).click();
  }
  await expect(page.getByLabel(bg.protectedCheck.textLabel)).toBeFocused();
}

function voiceLog(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __voiceLog: { created: number; started: number; lang: string } })
        .__voiceLog,
  );
}

test("no „Говорете“ button where the browser has no speech recognition; typing works", async ({
  page,
}) => {
  await fakeSpeech(page, false);
  await mockApi(page);
  await openTextStep(page);
  await expect(page.getByRole("button", { name: bg.voice.start })).toHaveCount(0);
  await expect(page.getByText(bg.voice.privacyNote)).toHaveCount(0);
  const field = page.getByLabel(bg.protectedCheck.textLabel);
  await field.fill("Казаха, че са от полицията.");
  await expect(field).toHaveValue("Казаха, че са от полицията.");
});

test("„Говорете“ listens in Bulgarian, shows what it hears and adds it after the typed text", async ({
  page,
}) => {
  await fakeSpeech(page, true);
  await mockApi(page);
  await openTextStep(page);

  const field = page.getByLabel(bg.protectedCheck.textLabel);
  const speak = page.getByRole("button", { name: bg.voice.start });
  await expect(speak).toBeVisible();
  await expect(page.getByText(bg.voice.privacyNote)).toBeVisible();
  // Never starts by itself.
  expect((await voiceLog(page)).created).toBe(0);

  await field.fill("Искат пари.");
  await speak.click();
  expect(await voiceLog(page)).toMatchObject({ started: 1, lang: "bg-BG", interimResults: true });
  const status = page.locator(".voice-input").getByRole("status");
  await expect(status).toHaveText(bg.voice.listening);
  await expect(page.getByRole("button", { name: bg.voice.stop })).toBeVisible();

  // A guess is shown while speaking, but not put in the field yet.
  await page.evaluate(() =>
    (window as unknown as { __speak: (t: string, f: boolean) => void }).__speak(
      "от полицията",
      false,
    ),
  );
  await expect(status).toHaveText("Чувам: „от полицията“");
  await expect(field).toHaveValue("Искат пари.");

  // The final text is added after the typed text.
  await page.evaluate(() =>
    (window as unknown as { __speak: (t: string, f: boolean) => void }).__speak(
      "казаха че са от полицията",
      true,
    ),
  );
  await expect(field).toHaveValue("Искат пари. казаха че са от полицията");

  // „Спри“ ends listening; typing still works.
  await page.getByRole("button", { name: bg.voice.stop }).click();
  await expect(speak).toBeVisible();
  await expect(status).toHaveText(bg.voice.added);
  await field.press("End");
  await field.pressSequentially(" Бързо!");
  await expect(field).toHaveValue("Искат пари. казаха че са от полицията Бързо!");
});

test("a blocked microphone gives a clear message and the field stays usable", async ({ page }) => {
  await fakeSpeech(page, true);
  await mockApi(page);
  await openTextStep(page);
  await page.getByRole("button", { name: bg.voice.start }).click();
  await page.evaluate(() =>
    (window as unknown as { __voiceError: (code: string) => void }).__voiceError("not-allowed"),
  );
  await expect(page.locator(".voice-input").getByRole("status")).toHaveText(
    bg.voice.errorNotAllowed,
  );
  await expect(page.getByRole("button", { name: bg.voice.start })).toBeEnabled();
  await expect(page.getByLabel(bg.protectedCheck.textLabel)).toBeEditable();
});

test("the voice button is big and the text step fits 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await fakeSpeech(page, true);
  await mockApi(page);
  await openTextStep(page);
  await page.getByRole("button", { name: bg.voice.start }).click();
  await page.evaluate(() =>
    (window as unknown as { __speak: (t: string, f: boolean) => void }).__speak(
      "много дълъг текст без интервали ".repeat(4),
      false,
    ),
  );
  const box = await page.getByRole("button", { name: bg.voice.stop }).boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(64);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
