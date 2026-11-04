// The alert e-mail itself: subject, plain text and simple HTML (W2-06).
//
// All wording comes from bg.alertEmail (src/i18n/bg.ts). The e-mail says only:
//   who started the check (the protected person's display name), when,
//   the risk level if it is known, and a link to the family alert page.
// Never phone numbers, never what the caller said, never other personal data:
// an e-mail can be forwarded, printed or read by someone else.
//
// HTML safety: a display name is typed by a user, so it could contain "<script>"
// or a fake link. Every value is escaped (escapeHtml) before it goes into the HTML.

import type { RiskLevel } from "@/engine";
import { bg } from "@/i18n/bg";
import type { AlertPayload } from "@/server/services/alertService";

export type AlertEmailContent = {
  subject: string;
  text: string;
  html: string;
};

// Replaces {name}, {time}, ... in a template with the given values, in ONE pass, so a
// value that itself contains "{time}" is not replaced again.
// Record<string, string> is like Python's dict[str, str].
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole: string, key: string) => {
    const value = values[key];
    return value === undefined ? whole : value;
  });
}

// Makes text safe to put inside HTML (like Python's html.escape(text, quote=True)).
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// A display name on one line: control characters (new lines, tabs...) become spaces,
// so a name can't add fake lines to the subject or the text.
export function cleanName(name: string): string {
  return name
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// „9 ноември в 12:05 ч.“ in Bulgarian time (Europe/Sofia), whatever the server's zone.
export function formatBulgarianTime(date: Date): string {
  const day = new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "long",
  }).format(date);
  const time = new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return fillTemplate(bg.alertEmail.timeFormat, { date: day, time });
}

// The link to the family alert page for this check.
export function alertPageLink(siteUrl: string, checkId: string): string {
  return `${siteUrl}/family/alerts?check=${encodeURIComponent(checkId)}`;
}

function riskText(level: RiskLevel | null): string {
  if (level === null) {
    return bg.alertEmail.risk.pending;
  }
  return bg.alertEmail.risk[level];
}

// Builds the whole e-mail for one alert. `sentAt` is "now" (when the check started,
// or when the verdict arrived).
export function buildAlertEmail(input: {
  payload: AlertPayload;
  siteUrl: string;
  sentAt: Date;
}): AlertEmailContent {
  const texts = bg.alertEmail;
  const values = {
    name: cleanName(input.payload.personName),
    time: formatBulgarianTime(input.sentAt),
    link: alertPageLink(input.siteUrl, input.payload.checkId),
  };

  const isVerdict = input.payload.kind === "verdict";
  const subject = fillTemplate(isVerdict ? texts.redSubject : texts.startedSubject, values);
  const intro = fillTemplate(isVerdict ? texts.redText : texts.startedText, values);
  const risk = `${texts.riskLabel} ${riskText(input.payload.riskLevel)}`;
  const callNow = fillTemplate(texts.callNow, values);
  const footer = fillTemplate(texts.footer, values);

  const text = [
    texts.greeting,
    "",
    intro,
    risk,
    "",
    callNow,
    "",
    fillTemplate(texts.openText, values),
    "",
    "--",
    footer,
  ].join("\n");

  // Simple HTML that every e-mail program can show: no images, no CSS files.
  // Every piece of text goes through escapeHtml().
  const html = [
    "<!doctype html>",
    '<html lang="bg">',
    '<body style="font-family: Arial, sans-serif; font-size: 18px; line-height: 1.5; color: #111111;">',
    `<p>${escapeHtml(texts.greeting)}</p>`,
    `<p>${escapeHtml(intro)}</p>`,
    `<p><strong>${escapeHtml(risk)}</strong></p>`,
    `<p>${escapeHtml(callNow)}</p>`,
    `<p><a href="${escapeHtml(values.link)}" style="display: inline-block; padding: 12px 20px; background: #b00020; color: #ffffff; text-decoration: none; border-radius: 6px;">${escapeHtml(texts.openButton)}</a></p>`,
    `<p style="font-size: 14px; color: #555555;">${escapeHtml(footer)}</p>`,
    "</body>",
    "</html>",
  ].join("\n");

  return { subject, text, html };
}
