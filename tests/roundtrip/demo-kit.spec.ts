// P-12: the juror demo kit, end to end, on a REAL local Supabase (no faked API).
//
// Like the defense: `npm run demo:kit` prints a pairing code and the juror's invite;
//   phone  — the demo phone of Мария pairs with the code;
//   juror  — a juror's phone opens the invite, registers in a few taps and is placed
//            first in Мария's list („Георги“);
// Мария presses the big button, says the caller claims to be Георги, the juror
// answers „Не съм аз“ and the phone turns red. Then `npm run demo:reset` removes
// the juror again, and `demo:reset -- --all` the whole demo family.
//
// Run with `npm run e2e:roundtrip` (scripts/e2e/roundtrip.sh starts Supabase and sets
// the local keys; the script is started with exactly those, never .env.local).

import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { fill } from "@/components/family/format";
import { bg } from "@/i18n/bg";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(SUPABASE_URL);
const JUROR = {
  name: "Жури Тестов",
  email: `juror-${Date.now().toString(36)}@test.scamly.invalid`,
  password: "Juror-test-password-1",
};

// Runs scripts/demo-kit.ts with the local keys of this test run (never .env.local).
function demoKit(...args: string[]): string {
  return execFileSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "--tsconfig",
      "scripts/tsconfig.seed.json",
      "scripts/demo-kit.ts",
      ...args,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, SCAMLY_DEMO_KIT: "1", SCAMLY_DEMO_SITE_URL: "http://localhost:3100" },
    },
  );
}

test.beforeAll(() => {
  test.skip(!LOCAL, "Needs a local Supabase (npm run e2e:roundtrip)");
  demoKit("reset", "--all"); // a clean start, also after an interrupted run
});

test.afterAll(() => {
  if (LOCAL) demoKit("reset", "--all");
});

test("the demo kit turns a juror's phone into the real Георги in a few taps", async ({
  browser,
}) => {
  // 1. Alex runs the kit: a pairing code (no phone yet) and the juror's link.
  const kit = demoKit("kit");
  const code = /enter: (\d{6})/.exec(kit)?.[1] ?? "";
  const link = /^(http:\/\/localhost:3100\/pokana\?t=\S+)$/m.exec(kit)?.[1] ?? "";
  expect(code).toMatch(/^\d{6}$/);
  expect(link).not.toBe("");
  // No key or pepper of this run is ever printed.
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "PAIRING_PEPPER", "HASH_PEPPER"]) {
    const secret = process.env[name] ?? "";
    if (secret !== "") expect(kit).not.toContain(secret);
  }

  const phoneContext = await browser.newContext({ viewport: { width: 393, height: 851 } });
  const jurorContext = await browser.newContext({ viewport: { width: 393, height: 851 } });
  const phone = await phoneContext.newPage();
  const juror = await jurorContext.newPage();

  // 2. The demo phone pairs once.
  await phone.goto("/svarzhi");
  await phone.getByLabel(bg.pairing.codeLabel).fill(code);
  await phone.getByRole("button", { name: bg.pairing.button, exact: true }).click();
  await expect(phone).toHaveURL(/\/protected$/, { timeout: 20_000 });

  // 3. The juror scans the QR: invite → „Регистрация“ → back to the invite → place 1.
  await juror.goto(link);
  // (The footer has a plain „Регистрация“ too: use the invite's own, which comes back.)
  await expect(juror.getByText(bg.invitePage.guestText)).toBeVisible();
  await juror
    .getByRole("main")
    .getByRole("link", { name: bg.invitePage.registerButton, exact: true })
    .click();
  await juror.getByLabel(bg.auth.displayNameLabel).fill(JUROR.name);
  await juror.getByLabel(bg.auth.emailLabel).fill(JUROR.email);
  await juror.getByLabel(bg.auth.passwordLabel, { exact: true }).fill(JUROR.password);
  await juror.getByRole("button", { name: bg.auth.registerButton, exact: true }).click();
  await expect(
    juror.getByText(fill(bg.invitePage.success, { name: bg.seed.personName, n: 1 })),
  ).toBeVisible({ timeout: 20_000 });
  await juror.goto("/family/alerts");

  // 4. Мария: the big button → „Да“ → the first tile is the juror („Георги“).
  await phone.getByRole("button", { name: bg.protectedCheck.bigButton }).click();
  await phone.getByRole("radio", { name: bg.protectedCheck.tri.yes, exact: true }).click();
  const firstTile = phone.locator(".check-ask-tiles > li").first();
  await expect(firstTile).toContainText(bg.demoKit.jurorName);
  await phone.getByRole("button", { name: bg.demoKit.jurorName, exact: true }).click();

  // 5. The juror's question arrives live; „Не съм аз“.
  await juror
    .getByRole("link", { name: bg.identityAnswer.open })
    .first()
    .click({ timeout: 20_000 });
  await juror.getByRole("button", { name: bg.identityAnswer.notMe }).click();

  // 6. Мария's phone turns red.
  await expect(
    phone.getByRole("heading", { level: 1, name: `Това НЕ е ${bg.demoKit.jurorName}.` }),
  ).toBeVisible({ timeout: 20_000 });

  await phoneContext.close();
  await jurorContext.close();

  // 7. After the demo: the juror's link and account are removed, the family stays.
  const reset = demoKit("reset");
  expect(reset).toContain("Juror links removed: 1; juror accounts deleted: 1");
  expect(reset).toContain("Demo family kept");
  // A second kit run reuses the family and the paired phone: no new pairing code.
  expect(demoKit("kit")).toContain("Demo phone: already paired (kept).");
});
