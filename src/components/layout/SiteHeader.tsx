// The top bar of every page: the Scamly logo (a link to the home page) and the main menu.
// A Server Component: it is plain HTML with links, so no JavaScript is sent for it.

import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { LogoMark } from "./Logo";

// The menu entries, in the order they are shown. A list of objects, like a Python
// list of dicts.
const NAV_LINKS = [
  { href: ROUTES.login, label: bg.layout.login },
  { href: ROUTES.register, label: bg.layout.register },
  { href: ROUTES.pair, label: bg.layout.pair },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href={ROUTES.home} className="site-logo">
          <LogoMark />
          <span>{bg.app.name}</span>
          {/* sr-only: hidden on screen, read by screen readers. */}
          <span className="sr-only">, {bg.layout.homeLink}</span>
        </Link>
        <nav aria-label={bg.layout.navLabel} className="site-nav">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
