// The top of every page (redesign v3 „Ореол“, Phase 2): a floating glass pill 12 px
// below the top edge, at most 1100 px wide and centred. In it: the logo (a link to
// the home page), the menu with a sliding spotlight (desktop), the theme switch and
// the one bright pill „Провери обаждане“. After 40 px of scrolling the pill shrinks a
// little and its glass gets more frosted (CSS only, globals.css .site-header-pill).
//
// On a phone the pill keeps only the logo and the bright pill; the menu moves to a
// glass dock at the bottom of the screen with labelled icons (SiteDock), and the
// theme switch moves to the footer (also between 1024 and 1280 px, where the menu
// needs its room). Nothing is hidden behind a "hamburger" button,
// because older people do not look for hidden menus.
//
// The menu depends on who is looking:
//   - a guest sees „Как работи измамата“, „Свържи телефон“, „Регистрация“, „Вход“
//     and the bright pill;
//   - a logged-in person sees the link to their own area (e.g. „Моите близки“; a
//     family member also „Сигнали“), their name and „Изход“ (the older person's
//     phone: area link, name and the bright pill, never „Изход“).
//
// A Server Component: plain HTML with links. Who is logged in is read on the server
// (getActor), so the login cookie never has to be read by browser code. Reading the
// cookie is request data, so with Cache Components it must sit inside <Suspense>:
// the guest version is the fallback and is pre-rendered into every page's static
// shell; the real one streams in at request time. Three small parts depend on the
// person (menu, right-hand actions, dock); React's cache() makes them share one
// getActor call per request. Only the menu, the dock, the theme switch, the bright
// pill and the logout button are Client Components.

import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { LogoutButton } from "@/components/auth/forms";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { AppRole } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { readPublicEnv } from "@/lib/publicEnv";
import { getActor } from "@/server/auth/actor";
import { accountLinkFor, extraLinksFor, showsLogout } from "./accountLinks";
import { HeaderCta } from "./HeaderCta";
import { Logo } from "./Logo";
import { SiteDock } from "./SiteDock";
import { dockLinksFor, GUEST_LINKS, showsCheckCta } from "./siteNav";
import { SpotlightNav } from "./SpotlightNav";

// The little the header needs to know about a logged-in person.
type HeaderAccount = { role: AppRole; displayName: string };

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-(--z-index-header) px-3 pt-3 print:hidden">
      <div className="site-header-pill relative mx-auto max-w-[68.75rem] rounded-full">
        {/* Two glass layers: the normal glass, and a more frosted one on top that
            fades in while the page scrolls (its opacity is the only thing animated). */}
        <span aria-hidden="true" className="site-header-glass site-glass" />
        <span aria-hidden="true" className="site-header-frost" />
        <div className="relative flex min-h-15 items-center gap-2 py-1.5 pr-1.5 pl-2 lg:min-h-16 lg:gap-3">
          <Logo />
          <div className="flex min-w-0 flex-1 justify-center max-lg:hidden">
            <Suspense fallback={<HeaderNav account={null} />}>
              <AccountHeaderNav />
            </Suspense>
          </div>
          {/* Between 1024 and 1280 px the menu needs the room, so the switch is in the
              footer there (and on a phone). */}
          <ThemeToggle className="ml-auto max-md:hidden lg:ml-0 lg:max-xl:hidden" />
          <div className="flex min-w-0 items-center gap-2 max-md:ml-auto">
            <Suspense fallback={<HeaderActions account={null} />}>
              <AccountHeaderActions />
            </Suspense>
          </div>
        </div>
      </div>
      <Suspense fallback={<SiteDock label={bg.layout.navLabel} links={dockLinksFor(null)} />}>
        <AccountDock />
      </Suspense>
    </header>
  );
}

// Who is logged in, or null for a guest. The header must never break a page, so any
// error counts as "guest": the private areas still check the login and the role
// themselves (requirePageRole), and the API checks every request.
// cache(): the three parts below ask in the same request, and get one answer (like
// Python's functools.cache, but only for the duration of one request).
const readHeaderAccount = cache(async (): Promise<HeaderAccount | null> => {
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
});

async function AccountHeaderNav() {
  return <HeaderNav account={await readHeaderAccount()} />;
}

async function AccountHeaderActions() {
  return <HeaderActions account={await readHeaderAccount()} />;
}

async function AccountDock() {
  const account = await readHeaderAccount();
  return <SiteDock label={bg.layout.navLabel} links={dockLinksFor(account?.role ?? null)} />;
}

// The menu in the pill: the guest links, or the person's area link (+ extra link).
function HeaderNav({ account }: { account: HeaderAccount | null }) {
  const links =
    account === null ? GUEST_LINKS : [accountLinkFor(account.role), ...extraLinksFor(account.role)];
  return <SpotlightNav label={bg.layout.navLabel} links={links} />;
}

// The right-hand end of the pill: the person's name and „Изход“ when logged in, and
// the bright „Провери обаждане“ pill for a guest and the older person's phone.
function HeaderActions({ account }: { account: HeaderAccount | null }) {
  return (
    <>
      {account === null ? null : (
        <p
          className={
            "flex min-h-12 min-w-0 items-center px-2 text-sm whitespace-nowrap text-fg-muted " +
            (showsCheckCta(account.role) ? "max-lg:hidden" : "")
          }
        >
          {/* „Влезли сте като“ is only read aloud on smaller screens, to save space. */}
          <span className="max-xl:sr-only">{bg.layout.signedInAs}&nbsp;</span>
          <strong className="max-w-[9rem] truncate font-semibold text-fg">
            {account.displayName}
          </strong>
        </p>
      )}
      {account !== null && showsLogout(account.role) ? <LogoutButton /> : null}
      {showsCheckCta(account?.role ?? null) ? <HeaderCta /> : null}
    </>
  );
}
