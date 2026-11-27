// W2-11: the whole demo flow, end to end, on a REAL local Supabase (no faked API).
//
// Two browsers run side by side, like at the defense:
//   family  — a family member's laptop: logs in, adds grandma, creates a pairing code,
//             then watches the live alert page;
//   grandma — the older person's phone: pairs with the code, presses the big button,
//             answers the questions and sees the verdict.
// Then the family member presses „Обаждам ѝ се сега“ and grandma's phone shows
// „<name> ще ви се обади веднага.“ — the round trip of W2-03 + W2-04.
//
// Run with `npm run e2e:roundtrip` (scripts/e2e/roundtrip.sh starts Supabase first).

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { fill } from "@/components/family/format";
import { bg } from "@/i18n/bg";

// The local Supabase from scripts/e2e/roundtrip.sh. The service key is only used here,
// in the test process, to create the family account (no e-mail to confirm locally).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// A fresh account for every run, so runs never disturb each other.
const RUN = Date.now().toString(36);
const FAMILY = {
  email: `roundtrip-${RUN}@test.scamly.invalid`,
  password: `Roundtrip-${RUN}-password`,
  name: "Мария Тестова",
};
const GRANDMA = "Баба Елена";

let familyUserId: string | null = null;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test.beforeAll(async () => {
  test.skip(
    SUPABASE_URL === "" || SERVICE_KEY === "",
    "Needs a local Supabase (npm run e2e:roundtrip)",
  );
  const client = admin();
  const created = await client.auth.admin.createUser({
    email: FAMILY.email,
    password: FAMILY.password,
    email_confirm: true,
    user_metadata: { display_name: FAMILY.name },
  });
  if (created.error) throw created.error;
  familyUserId = created.data.user.id;
  // New accounts are family members by default; set it explicitly, like the seed does.
  const role = await client
    .from("profiles")
    .update({ role: "family", email_alerts: false })
    .eq("id", familyUserId);
  if (role.error) throw role.error;
});

test.afterAll(async () => {
  // Deleting the account also deletes grandma, her checks and the paired phone.
  if (familyUserId !== null) await admin().auth.admin.deleteUser(familyUserId);
});

test("grandma checks a call, the family is alerted live and answers, grandma sees who calls", async ({
  browser,
}) => {
  const familyContext = await browser.newContext();
  const grandmaContext = await browser.newContext({ viewport: { width: 393, height: 851 } });
  const family = await familyContext.newPage();
  const grandma = await grandmaContext.newPage();

  // 1. The family member logs in and adds grandma.
  await family.goto("/vhod");
  await family.getByLabel(bg.auth.emailLabel).fill(FAMILY.email);
  await family.getByLabel(bg.auth.passwordLabel).fill(FAMILY.password);
  await family.getByRole("button", { name: bg.auth.loginButton, exact: true }).click();
  await expect(family).toHaveURL(/\/family$/);

  await family.goto("/family/new");
  await family.getByLabel(bg.family.nameLabel).fill(GRANDMA);
  await family.getByLabel(bg.family.district).selectOption("BG-02");
  await family.getByRole("button", { name: bg.family.createButton, exact: true }).click();
  await expect(family).toHaveURL(/\/family\/[0-9a-f-]{36}$/);

  // 2. A pairing code for grandma's phone (the person page has two tabs; codes live
  //    under „Настройки“, P-10).
  const phonesTab = family.getByRole("tab", { name: new RegExp(`^${bg.family.tabSettings}`) });
  await phonesTab.click();
  await expect(phonesTab).toHaveAttribute("aria-selected", "true");
  await family.getByRole("button", { name: bg.family.pairingButton, exact: true }).click();
  const codeText = (await family.locator(".pairing-code").textContent()) ?? "";
  // The element holds the code twice (big digits + a screen-reader copy): first 6 digits.
  const code = codeText.replace(/\D/g, "").slice(0, 6);
  expect(code).toMatch(/^\d{6}$/);

  // 3. Grandma's phone pairs with the code and opens the call check.
  await grandma.goto("/svarzhi");
  await grandma.getByLabel(bg.pairing.codeLabel).fill(code);
  await grandma.getByRole("button", { name: bg.pairing.button, exact: true }).click();
  await expect(grandma).toHaveURL(/\/protected$/, { timeout: 20_000 });

  // 4. The family member opens the live alert page before anything happens.
  await family.goto("/family/alerts");
  await expect(family.getByRole("heading", { level: 1, name: bg.alerts.title })).toBeVisible();

  // 5. A suspicious call: grandma presses the big button and answers with one tap each.
  await grandma.getByRole("button", { name: bg.protectedCheck.bigButton }).click();
  // „Казват ли, че са някой близък?“ → „Не“: the 30-second check.
  await grandma.getByRole("radio", { name: bg.protectedCheck.tri.no, exact: true }).click();
  const answers = [
    bg.protectedCheck.identities.police,
    bg.protectedCheck.tri.yes, // they ask for money
    bg.protectedCheck.handoverMethods.throw,
    bg.protectedCheck.tri.yes, // rushing
    bg.protectedCheck.tri.yes, // secrecy
  ];
  for (const answer of answers) {
    await grandma.getByRole("radio", { name: answer, exact: true }).click();
  }
  await grandma.getByRole("button", { name: bg.protectedCheck.check, exact: true }).click();
  await expect(grandma.getByRole("heading", { level: 1, name: bg.verdict.red.title })).toBeVisible({
    timeout: 15_000,
  });

  // 6. The alert reaches the family page by itself (Realtime, or the 5 s safety poll),
  //    already showing the red verdict, and the family member answers it.
  const alert = family.locator(".check-list > li").filter({ hasText: GRANDMA }).first();
  await expect(alert).toBeVisible({ timeout: 20_000 });
  await expect(alert.locator(".verdict-badge")).toHaveText(bg.verdictBadge.red, {
    timeout: 20_000,
  });
  await alert.getByRole("button", { name: new RegExp(`^${bg.alerts.callNow}`) }).click();
  await expect(alert.getByText(bg.alerts.youResponded)).toBeVisible();

  // 7. Grandma's phone shows who is calling back, without reloading.
  const owner = FAMILY.name;
  await expect(grandma.getByText(fill(bg.checks.acknowledgedBy, { name: owner }))).toBeVisible({
    timeout: 20_000,
  });

  await familyContext.close();
  await grandmaContext.close();
});
