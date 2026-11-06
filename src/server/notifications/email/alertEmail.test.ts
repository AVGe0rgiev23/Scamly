// Unit tests for the alert e-mail text (alertEmail.ts): content, HTML escaping, and
// that no phone numbers or call details can get in.

import { describe, expect, it } from "vitest";
import {
  buildAlertEmail,
  cleanName,
  escapeHtml,
  fillTemplate,
  formatBulgarianTime,
} from "@/server/notifications/email/alertEmail";
import type { AlertPayload } from "@/server/services/alertService";

const SITE = "https://scamly.vercel.app";
const SENT_AT = new Date("2026-11-09T10:05:00Z"); // 12:05 in Sofia
const STARTED: AlertPayload = {
  kind: "started",
  checkId: "0f1e2d3c-0000-4000-8000-000000000001",
  protectedPersonId: "person-maria",
  personName: "Мария Петрова",
  riskLevel: null,
};
const RED: AlertPayload = { ...STARTED, kind: "verdict", riskLevel: "red" };

describe("helpers", () => {
  it("escapes the five HTML special characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("fills a template in one pass (a value is never filled again)", () => {
    expect(fillTemplate("{name} at {time}", { name: "{time}", time: "12:05" })).toBe(
      "{time} at 12:05",
    );
  });

  it("puts a name on one line", () => {
    expect(cleanName("  Мария\r\nBcc: x@evil.test\t ")).toBe("Мария Bcc: x@evil.test");
  });

  it("writes the time in Bulgarian, in Bulgarian time", () => {
    expect(formatBulgarianTime(SENT_AT)).toBe("9 ноември в 12:05 ч.");
  });
});

describe("buildAlertEmail", () => {
  it("says who started the check, when, the risk so far and where to look", () => {
    const email = buildAlertEmail({ payload: STARTED, siteUrl: SITE, sentAt: SENT_AT });

    expect(email.subject).toBe("Scamly: Мария Петрова проверява съмнително обаждане");
    expect(email.text).toContain("Мария Петрова получи съмнително обаждане");
    // The proofread sentence ends with the time: one full stop after „ч.“, not two.
    expect(email.text).toContain("Проверката в Scamly започна на 9 ноември в 12:05 ч.\n");
    expect(email.text).not.toContain("ч..");
    expect(email.text).toContain("Ниво на риска: още не е известно");
    expect(email.text).toContain(`${SITE}/family/alerts?check=${STARTED.checkId}`);
    expect(email.html).toContain(`href="${SITE}/family/alerts?check=${STARTED.checkId}"`);
    expect(email.html).toContain('<html lang="bg">');
  });

  it("has a red follow-up wording for a red verdict", () => {
    const email = buildAlertEmail({ payload: RED, siteUrl: SITE, sentAt: SENT_AT });
    // „Внимание!“ first, so it is seen in a short inbox line.
    expect(email.subject.startsWith("Внимание! Проверката на")).toBe(true);
    expect(email.text).toContain("признаци на телефонна измама");
    expect(email.text).toContain("Ниво на риска: високо");
  });

  it("never says 'safe' (D9), even for a green level", () => {
    const email = buildAlertEmail({
      payload: { ...STARTED, kind: "verdict", riskLevel: "green" },
      siteUrl: SITE,
      sentAt: SENT_AT,
    });
    expect(email.text.toLowerCase()).not.toMatch(/безопас|сигурно/);
  });

  it("escapes a malicious display name in the HTML", () => {
    const evil = `<script>alert(1)</script><a href="https://evil.test">Банка</a>`;
    const email = buildAlertEmail({
      payload: { ...STARTED, personName: evil },
      siteUrl: SITE,
      sentAt: SENT_AT,
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain('href="https://evil.test"');
    expect(email.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    // Exactly one link: ours.
    expect(email.html.match(/<a /g)).toHaveLength(1);
  });

  it("contains no phone numbers or call details, only the name, time and link", () => {
    const email = buildAlertEmail({ payload: RED, siteUrl: SITE, sentAt: SENT_AT });
    for (const part of [email.subject, email.text, email.html]) {
      // No phone-like digit groups (0888 123 456, +359…). The check id is in the link,
      // so we look at the text with the link removed.
      const withoutLink = part.replaceAll(STARTED.checkId, "");
      expect(withoutLink).not.toMatch(/\+?\d[\d\s]{6,}\d/);
    }
  });
});
