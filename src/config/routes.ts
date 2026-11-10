// The addresses (paths) of our pages, and which areas need a login.
//
// Used by the proxy (src/proxy.ts) to send logged-out visitors to the right login
// page, and by the login forms to open the right area after login.
// Bulgarian page names are written in Latin letters (/vhod = „вход“), like the
// pairing page /svarzhi („свържи“) in BUILD_PLAN section 5.

import type { Database } from "@/types/database";

// 'family' | 'protected' | 'moderator' | 'admin' (from the database enum).
export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROUTES = {
  home: "/",
  login: "/vhod",
  register: "/registratsia",
  pair: "/svarzhi",
  invite: "/pokana", // accept an invite to become a trusted contact („покана“), W2-08
  forbidden: "/403",
  education: "/kak-raboti", // the public education cards „Как работи измамата“, W3-05
  report: "/signal", // the public report form „Подай сигнал за измама“ („сигнал“), W3-02
  map: "/karta", // the public scam map „Карта на измамите“ („карта“), W3-03
  family: "/family",
  familyAlerts: "/family/alerts", // the live alert page („Сигнали“), W2-03
  moderator: "/moderator",
  moderatorScripts: "/moderator/scripts", // the scam-script editor, W3-05
  moderatorReports: "/moderator/reports", // the report queue („Сигнали“), W3-04
  admin: "/admin",
  protected: "/protected",
} as const;

// Areas for people with an account: a logged-out visitor goes to the login page.
const LOGIN_AREAS: string[] = [ROUTES.family, ROUTES.moderator, ROUTES.admin];
// The older person's area: a logged-out phone goes to the pairing page instead,
// because the older person never has a password.
const DEVICE_AREAS: string[] = [ROUTES.protected];

// True when `pathname` is `area` itself or a page inside it.
// "/family" and "/family/alerts" are inside "/family"; "/familyx" is not.
export function isInside(pathname: string, area: string): boolean {
  return pathname === area || pathname.startsWith(area + "/");
}

// Where to send a visitor who is NOT logged in, or null if the page is open to all.
export function loginPageFor(pathname: string): string | null {
  if (DEVICE_AREAS.some((area) => isInside(pathname, area))) {
    return ROUTES.pair;
  }
  if (LOGIN_AREAS.some((area) => isInside(pathname, area))) {
    return ROUTES.login;
  }
  return null;
}

// The start page of each role, opened right after login or pairing.
export function homePathForRole(role: AppRole): string {
  if (role === "protected") return ROUTES.protected;
  if (role === "moderator") return ROUTES.moderator;
  if (role === "admin") return ROUTES.admin;
  return ROUTES.family;
}

// The base for checking a `next` address; never shown or visited.
const CHECK_ORIGIN = "https://scamly.invalid";

// The `next` parameter of /vhod and /registratsia (W2-14): where to go after login,
// e.g. back to /pokana?t=… . Only a path on OUR site is accepted, never another
// site (an "open redirect" would let a scam link say „влезте в Scamly“ and then
// send the person to a fake page). Returns the safe path, or null.
//
//   "/pokana?t=abc"        → "/pokana?t=abc"
//   "https://evil.example" → null (not a path)
//   "//evil.example"       → null (browsers read "//" as "another site")
//   "/\evil.example"       → null (some browsers read "\" like "/")
export function safeNextPath(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    return null;
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  // No backslash and no invisible control characters (tab, new line, …), which
  // browsers silently drop, so "/\t/evil.example" would become "//evil.example".
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === "\\" || code < 32 || code === 127) {
      return null;
    }
  }
  // Last check: read it as an address on our site; it must stay on our site.
  try {
    const url = new URL(value, CHECK_ORIGIN);
    if (url.origin !== CHECK_ORIGIN) {
      return null;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

// A page address with a safe `next` parameter, e.g. /vhod?next=%2Fpokana%3Ft%3D… .
// encodeURIComponent is like Python's urllib.parse.quote(value, safe="").
export function withNext(page: string, next: string | null): string {
  return next === null ? page : `${page}?next=${encodeURIComponent(next)}`;
}
