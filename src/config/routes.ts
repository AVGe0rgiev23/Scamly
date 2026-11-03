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
  forbidden: "/403",
  family: "/family",
  moderator: "/moderator",
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
