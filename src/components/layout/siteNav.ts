// What the site navigation shows, as plain data and functions (no React), so it can
// be unit-tested: the links of the header pill and of the phone's bottom bar („dock“)
// for each role, which link is the current page, and where the dock stays away
// (the older person's check screen).
//
// Few links on purpose (D35, phase 5), and the header and the dock show the SAME
// items, so a person who switches from the laptop to the phone finds them again:
//   guest      Как работи · Вход (+ the bright „Провери“ pill); the dock adds Начало
//              and Провери, because a phone has no room for the pill's twin;
//   protected  Провери · Помощ (never „Изход“, see accountLinks.ts);
//   family     Семейство · Сигнали (with a live badge) · Помощ (+ „Изход“);
//   moderator  Модерация · Сигнали · Помощ (+ „Изход“);
//   admin      Администрация · Помощ (+ „Изход“).
// Pairing, registration, the education cards, the report form, the map and the
// fridge card are in the footer (SiteFooter.tsx).

import { isInside, ROUTES, type AppRole } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { accountLinkFor, type NavLink } from "./accountLinks";

// „Как работи“ jumps to the three steps on the home page (the section id="how").
export const HOW_IT_WORKS_HREF = `${ROUTES.home}#how`;

// The picture of a link in the dock. A string, not a React component, so the server
// can pass it to the client dock (like an enum value in Python).
export type DockIcon =
  "home" | "how" | "login" | "family" | "alerts" | "moderator" | "admin" | "check" | "help";

// One item of the menu: where it goes, its word, its dock icon and, for the family's
// „Сигнали“, the live badge with the open „Ти ли си?“ questions.
export type NavItem = NavLink & { icon: DockIcon; badge?: "identity" };

// The dock used to have its own type; it now shows the same items.
export type DockLink = NavItem;

const HOME: NavItem = { href: ROUTES.home, label: bg.layout.dockHome, icon: "home" };
const HOW: NavItem = { href: HOW_IT_WORKS_HREF, label: bg.layout.howItWorks, icon: "how" };
const CHECK: NavItem = { href: ROUTES.protected, label: bg.layout.dockCheck, icon: "check" };
const LOGIN: NavItem = { href: ROUTES.login, label: bg.layout.login, icon: "login" };

// The menu for a guest in the header pill, in the order it is shown. A list of
// objects, like a Python list of dicts.
export const GUEST_LINKS: NavItem[] = [HOW, LOGIN];

// The icon of each role's own area (like a Python dict with one key per role).
const AREA_ICON: Record<AppRole, DockIcon> = {
  family: "family",
  moderator: "moderator",
  admin: "admin",
  protected: "check",
};

// The help page of each area, e.g. /family/pomosht.
function helpLinkFor(role: AppRole): NavItem {
  return { href: `/${role}/pomosht`, label: bg.layout.navHelp, icon: "help" };
}

// The header links of a person (or of a guest, role null).
export function navLinksFor(role: AppRole | null): NavItem[] {
  if (role === null) return GUEST_LINKS;
  const area: NavItem = { ...accountLinkFor(role), icon: AREA_ICON[role] };
  const links: NavItem[] = [area];
  if (role === "family") {
    links.push({
      href: ROUTES.familyAlerts,
      label: bg.layout.accountFamilyAlerts,
      icon: "alerts",
      badge: "identity",
    });
  }
  if (role === "moderator") {
    links.push({
      href: ROUTES.moderatorReports,
      label: bg.layout.accountModeratorReports,
      icon: "alerts",
    });
  }
  links.push(helpLinkFor(role));
  return links;
}

// The bottom bar of a phone: the same items as the header. A guest also gets
// Начало and Провери (the header's bright pill has no room on a phone's dock),
// so at most four items, each at least 80 px wide on a 360 px phone.
export function dockLinksFor(role: AppRole | null): NavItem[] {
  if (role === null) return [HOME, HOW, CHECK, LOGIN];
  return navLinksFor(role);
}

// The bright „Провери“ pill is for a guest (a phone that may be paired). The older
// person's phone has „Провери“ as its first menu item already; a relative, a
// moderator or an admin would only reach a „no access“ page there.
export function showsCheckCta(role: AppRole | null): boolean {
  return role === null;
}

// Is `href` the page the person is on? The home page only on "/" itself, every
// other link also on the pages inside it (/kak-raboti/politsai is under /kak-raboti).
// A link with a #part (the home page's „Как работи“) is never "the current page".
export function isCurrentPath(pathname: string | null, href: string): boolean {
  if (pathname === null || href.includes("#")) return false;
  if (href === ROUTES.home) return pathname === ROUTES.home;
  return isInside(pathname, href);
}

// The one link of a menu that is the current page: the most specific match, so on
// /family/alerts only „Сигнали“ is lit, not „Семейство“ too. null: none of them.
export function currentHref(pathname: string | null, links: NavLink[]): string | null {
  let best: string | null = null;
  for (const link of links) {
    if (isCurrentPath(pathname, link.href) && (best === null || link.href.length > best.length)) {
      best = link.href;
    }
  }
  return best;
}

// The older person's check screen (and its /dev preview): one big button and
// nothing else, so the dock and the bright pill are not shown there. Its help page
// (/protected/pomosht) does show the dock, so „Провери“ is one tap away.
export function isProtectedFlow(pathname: string | null): boolean {
  if (pathname === null) return false;
  return pathname === ROUTES.protected || isInside(pathname, "/dev/protected");
}

// The words read aloud after „Сигнали“ when questions are waiting (0 → nothing).
export function badgeLabel(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return bg.layout.navBadgeOne;
  return bg.layout.navBadgeMany.replace("{count}", String(count));
}
