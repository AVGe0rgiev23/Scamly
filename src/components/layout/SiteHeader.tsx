// The top bar of every page: the Scamly logo (a link to the home page), the main menu
// and the compact theme switch.
// A Server Component: plain HTML with links. Only the theme switch inside it is a
// Client Component, so only its small piece of JavaScript is sent to the browser.

import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
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
        <ThemeToggle />
      </div>
    </header>
  );
}
