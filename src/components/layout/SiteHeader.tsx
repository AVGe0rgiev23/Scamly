// The top bar of every page: the Scamly logo (a link to the home page), the main menu
// and the compact theme switch.
//
// The menu depends on who is looking:
//   - a guest sees „Вход“, „Регистрация“, „Свържи телефон“ and „Как работи измамата“
//     (the public education cards, W3-05);
//   - a logged-in person sees the link to their own area (e.g. „Моите близки“; a
//     family member also „Сигнали“), their name and „Изход“ (the older person's
//     phone: area link and name, never „Изход“).
//
// A Server Component: plain HTML with links. Who is logged in is read on the server
// (getActor), so the login cookie never has to be read by browser code. Reading the
// cookie is request data, so with Cache Components it must sit inside <Suspense>:
// the guest menu is the fallback and is pre-rendered into every page's static shell;
// the real menu streams in at request time. Only the theme switch and the logout
// button are Client Components.

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LogoutButton } from "@/components/auth/forms";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ROUTES, type AppRole } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { readPublicEnv } from "@/lib/publicEnv";
import { getActor } from "@/server/auth/actor";
import { accountLinkFor, extraLinksFor, showsLogout, type NavLink } from "./accountLinks";
import { LogoMark } from "./Logo";

// The menu for a guest, in the order it is shown. A list of objects, like a Python
// list of dicts.
const GUEST_LINKS: NavLink[] = [
  { href: ROUTES.login, label: bg.layout.login },
  { href: ROUTES.register, label: bg.layout.register },
  { href: ROUTES.pair, label: bg.layout.pair },
  { href: ROUTES.education, label: bg.layout.education },
];

// The little the header needs to know about a logged-in person.
type HeaderAccount = { role: AppRole; displayName: string };

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-(--z-index-header) border-b border-line bg-canvas print:hidden">
      {/* On a phone the menu gets its own row under the logo; nothing is hidden behind
          a "hamburger" button, because older people do not look for hidden menus. */}
      <div className="shell flex flex-wrap items-center gap-x-6 md:min-h-16 md:flex-nowrap">
        <Link
          href={ROUTES.home}
          className="flex min-h-14 items-center gap-2.5 font-display text-xl font-bold tracking-tight text-fg no-underline"
        >
          <LogoMark />
          <span>{bg.app.name}</span>
          {/* sr-only: hidden on screen, read by screen readers. */}
          <span className="sr-only">, {bg.layout.homeLink}</span>
        </Link>
        <div className="order-last w-full min-w-0 md:order-none md:w-auto md:flex-1">
          <Suspense fallback={<SiteNav account={null} />}>
            <AccountNav />
          </Suspense>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

// Reads who is logged in (at request time), then draws the menu for them.
async function AccountNav() {
  return <SiteNav account={await readHeaderAccount()} />;
}

// Who is logged in, or null for a guest. The header must never break a page, so any
// error counts as "guest": the private areas still check the login and the role
// themselves (requirePageRole), and the API checks every request.
async function readHeaderAccount(): Promise<HeaderAccount | null> {
  // "Only at request time": never render this in advance at `next build`.
  await connection();
  // Without Supabase settings (e.g. in CI) nobody can be logged in.
  if (readPublicEnv() === null) {
    return null;
  }
  try {
    const actor = await getActor();
    return actor === null ? null : { role: actor.role, displayName: actor.profile.display_name };
  } catch (error) {
    // Let Next.js's own signals (e.g. "this needs request data") pass through.
    unstable_rethrow(error);
    return null;
  }
}

// One menu link: at least 48 px high, with an underline that marks hover.
const NAV_LINK =
  "flex min-h-12 items-center whitespace-nowrap px-2.5 text-sm font-medium text-fg-muted no-underline hover:text-fg md:text-base";
const NAV_LIST = "-mx-2.5 flex items-center overflow-x-auto md:mx-0 md:justify-end md:gap-1";

// The menu itself: guest links, or the logged-in person's area link, name and logout.
function SiteNav({ account }: { account: HeaderAccount | null }) {
  if (account === null) {
    return (
      <nav aria-label={bg.layout.navLabel}>
        <ul className={NAV_LIST}>
          {GUEST_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={NAV_LINK}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  const area = accountLinkFor(account.role);
  return (
    <nav aria-label={bg.layout.navLabel}>
      <ul className={NAV_LIST}>
        <li>
          <Link href={area.href} className={NAV_LINK}>
            {area.label}
          </Link>
        </li>
        {extraLinksFor(account.role).map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={NAV_LINK}>
              {link.label}
            </Link>
          </li>
        ))}
        <li className="ml-auto flex min-h-12 items-center whitespace-nowrap px-2.5 text-sm text-fg-muted md:ml-4">
          {/* On a phone „Влезли сте като“ is only read aloud, to save space. */}
          <span className="max-md:sr-only">{bg.layout.signedInAs}&nbsp;</span>
          <strong className="font-semibold text-fg">{account.displayName}</strong>
        </li>
        {showsLogout(account.role) ? (
          <li>
            <LogoutButton />
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
