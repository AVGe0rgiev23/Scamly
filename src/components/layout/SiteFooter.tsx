// The bottom of every page (redesign v3 „Ореол“, Phase 2): a raised panel with two
// columns of links (the app: check, pairing, registration, login; the public tools:
// education cards, report form, scam map, fridge card, privacy). Since D35 the header
// and the phone dock keep only the main links, so every other place is found here.
// Also what Scamly is (a school
// project for the „Джон Атанасов“ tournament, 2026), its authors, its licence and our
// promise of no ads and no tracking. Under it all, a huge faint „Scamly“ is cut off
// by the bottom edge, like a signature that runs off the page; a soft aurora rises
// from below. On a phone (and between 1024 and 1280 px) the theme switch lives here,
// because the header has no room for it there.
// A Server Component with plain links; light and dark come from the tokens.

import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import type { NavLink } from "./accountLinks";
import { LogoMark, Wordmark } from "./Logo";

// The two link columns, each with its heading.
const COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: bg.layout.footerColumnApp,
    links: [
      { href: ROUTES.protected, label: bg.layout.footerCheck },
      { href: ROUTES.pair, label: bg.layout.pair },
      { href: ROUTES.register, label: bg.home.register },
      { href: ROUTES.login, label: bg.layout.login },
    ],
  },
  {
    title: bg.layout.footerColumnTools,
    links: [
      { href: ROUTES.education, label: bg.layout.education },
      { href: ROUTES.report, label: bg.reportForm.footerLink },
      { href: ROUTES.map, label: bg.map.footerLink },
      { href: ROUTES.fridgeCard, label: bg.fridgeCard.link },
      { href: ROUTES.privacy, label: bg.privacy.title },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer mt-24 px-3 pb-3 max-lg:pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-4 print:hidden">
      <div className="surface-raised relative isolate mx-auto max-w-[77.5rem] overflow-hidden rounded-xl">
        {/* The aurora from below and the giant cut-off wordmark: decoration only. */}
        <div
          aria-hidden="true"
          className="site-footer-glow pointer-events-none absolute inset-0 -z-10"
        />
        <p aria-hidden="true" className="site-footer-word pointer-events-none select-none">
          {bg.app.name}
        </p>

        <div className="grid gap-x-8 gap-y-12 px-6 pt-12 md:grid-cols-12 md:px-10 md:pt-14">
          <div className="md:col-span-5">
            <p className="flex items-center gap-3">
              <LogoMark size={36} />
              <Wordmark className="text-[1.75rem] leading-none" />
            </p>
            <p className="mt-5 max-w-[40ch] text-base text-fg">{bg.layout.footerProject}</p>
            <p className="mt-2 max-w-[40ch] text-sm text-fg-muted">{bg.layout.footerPrinciples}</p>
            <div className="mt-8 md:max-lg:hidden xl:hidden">
              <ThemeToggle />
            </div>
          </div>

          <nav
            aria-label={bg.layout.footerNavLabel}
            className="grid gap-x-8 gap-y-10 sm:grid-cols-2 md:col-span-7 md:col-start-6 lg:col-span-6 lg:col-start-7"
          >
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="eyebrow px-3">{column.title}</h2>
                <ul className="mt-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="site-footer-link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mx-6 mt-12 flex flex-col gap-2 border-t border-line pt-6 text-sm text-fg-muted md:mx-10 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-8">
          <p>{bg.layout.footerTournament}</p>
          <p>{bg.layout.footerAuthors}</p>
          <p className="font-mono text-xs tracking-wide text-fg-subtle">
            {bg.layout.footerLicence}
          </p>
        </div>
        {/* Room for the giant wordmark, which overlaps this space and runs off the edge. */}
        <div aria-hidden="true" className="site-footer-word-space" />
      </div>
    </footer>
  );
}
