// What the site navigation shows, as plain data and functions (no React), so it can
// be unit-tested: the guest menu, the links of the phone's bottom bar („dock“) for
// each role, which link is the current page, and where the header stays quiet
// (the older person's check screens).
//
// The logged-in links come from accountLinks.ts, so the header, the dock and the old
// tests agree on one list.

import { isInside, ROUTES, type AppRole } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { accountLinkFor, extraLinksFor, type NavLink } from "./accountLinks";

// The menu for a guest in the header pill, in the order it is shown. A list of
// objects, like a Python list of dicts.
export const GUEST_LINKS: NavLink[] = [
  { href: ROUTES.education, label: bg.layout.education },
  { href: ROUTES.pair, label: bg.layout.pair },
  { href: ROUTES.register, label: bg.layout.register },
  { href: ROUTES.login, label: bg.layout.login },
];

// The picture of a dock link. A string, not a React component, so the server can
// pass it to the client dock (like an enum value in Python).
export type DockIcon =
  | "home"
  | "education"
  | "map"
  | "report"
  | "login"
  | "family"
  | "alerts"
  | "moderator"
  | "admin"
  | "check";

export type DockLink = NavLink & { icon: DockIcon };

// The dock has room for five labelled icons on a 360 px phone.
export const DOCK_SIZE = 5;

const HOME: DockLink = { href: ROUTES.home, label: bg.layout.dockHome, icon: "home" };
const EDUCATION: DockLink = {
  href: ROUTES.education,
  label: bg.layout.dockEducation,
  icon: "education",
};
const MAP: DockLink = { href: ROUTES.map, label: bg.layout.dockMap, icon: "map" };
const REPORT: DockLink = { href: ROUTES.report, label: bg.layout.dockReport, icon: "report" };
const LOGIN: DockLink = { href: ROUTES.login, label: bg.layout.dockLogin, icon: "login" };

// The icon and the short dock word for each role's own area.
const AREA_ICON: Record<AppRole, DockIcon> = {
  family: "family",
  moderator: "moderator",
  admin: "admin",
  protected: "check",
};

// The bottom bar of a phone: home, the person's own area (and its extra link), then
// the public tools until five are shown. A guest gets the public tools and „Вход“
// (the check itself is the bright pill at the top).
export function dockLinksFor(role: AppRole | null): DockLink[] {
  if (role === null) {
    return [HOME, EDUCATION, MAP, REPORT, LOGIN];
  }
  const area = accountLinkFor(role);
  const own: DockLink[] = [
    {
      href: area.href,
      // „Проверка на обаждане“ is too long under an icon; the other area names fit.
      label: role === "protected" ? bg.layout.dockProtected : area.label,
      icon: AREA_ICON[role],
    },
    ...extraLinksFor(role).map((link): DockLink => ({ ...link, icon: "alerts" })),
  ];
  return [HOME, ...own, EDUCATION, MAP, REPORT].slice(0, DOCK_SIZE);
}

// The bright „Провери обаждане“ pill is for a guest (a phone that may be paired)
// and for the older person's phone. A relative, a moderator or an admin would only
// reach a „no access“ page there, so they do not get it.
export function showsCheckCta(role: AppRole | null): boolean {
  return role === null || role === "protected";
}

// Is `href` the page the person is on? The home page only on "/" itself, every
// other link also on the pages inside it (/kak-raboti/politsai is under /kak-raboti).
export function isCurrentPath(pathname: string | null, href: string): boolean {
  if (pathname === null) return false;
  if (href === ROUTES.home) return pathname === ROUTES.home;
  return isInside(pathname, href);
}

// The older person's check screens (and their /dev preview): one big button and
// nothing else, so the dock and the header pill's button are not shown there.
export function isProtectedFlow(pathname: string | null): boolean {
  if (pathname === null) return false;
  return isInside(pathname, ROUTES.protected) || isInside(pathname, "/dev/protected");
}
