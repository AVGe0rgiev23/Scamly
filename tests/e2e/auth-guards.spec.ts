// End-to-end tests for the login guards in src/proxy.ts: a visitor who is not logged
// in can't open the private areas and lands on the right Bulgarian page instead.
// (No Supabase project is needed: a guest has no session cookie.)

import { expect, test } from "@playwright/test";
import { bg } from "@/i18n/bg";

test("a guest who opens /family is sent to the login page", async ({ page }) => {
  await page.goto("/family");
  await expect(page).toHaveURL(/\/vhod$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.auth.loginTitle);
});

test("a guest who opens /admin is sent to the login page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/vhod$/);
});

test("a phone that is not paired is sent from /protected to the pairing page", async ({ page }) => {
  await page.goto("/protected");
  await expect(page).toHaveURL(/\/svarzhi$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.pairing.title);
});
