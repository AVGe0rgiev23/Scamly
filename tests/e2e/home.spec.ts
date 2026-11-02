// End-to-end test for the home page: it must be in Bulgarian and show our tagline.

import { expect, test } from "@playwright/test";
import { bg } from "@/i18n/bg";

test("home page is in Bulgarian and shows the tagline", async ({ page }) => {
  await page.goto("/");

  // The whole page is marked as Bulgarian for browsers and screen readers.
  await expect(page.locator("html")).toHaveAttribute("lang", "bg");

  // The app name is the main heading, and the tagline is visible.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.app.name);
  await expect(page.getByText(bg.app.tagline)).toBeVisible();

  // The browser tab shows the Bulgarian title.
  await expect(page).toHaveTitle(bg.app.metaTitle);
});
