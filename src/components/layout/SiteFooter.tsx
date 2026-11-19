// Phase 2 rebuilds this.
// The bottom of every page: the public tools (report form, scam map, education
// cards, fridge card), what Scamly is (a school project), its licence and our
// promise of no ads and no tracking. A raised panel with the aurora glowing from
// its top edge. A Server Component with plain links.

import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { LogoMark } from "./Logo";

const LINKS = [
  { href: ROUTES.report, label: bg.reportForm.footerLink },
  { href: ROUTES.map, label: bg.map.footerLink },
  { href: ROUTES.education, label: bg.layout.education },
  { href: ROUTES.fridgeCard, label: bg.fridgeCard.link },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 px-3 pb-3 md:px-4 print:hidden">
      <div className="surface-raised relative isolate mx-auto max-w-[77.5rem] overflow-hidden rounded-xl">
        <div
          aria-hidden="true"
          className="aurora pointer-events-none absolute inset-0 -z-10 opacity-70"
        />
        <div className="grid gap-10 px-6 py-12 md:grid-cols-12 md:px-10">
          <div className="md:col-span-5">
            <p className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight">
              <LogoMark size={24} />
              {bg.app.name}
            </p>
            <p className="mt-4 max-w-[44ch] text-sm text-fg-muted">{bg.layout.footerProject}</p>
            <p className="mt-1 max-w-[44ch] text-sm text-fg-muted">{bg.layout.footerPrinciples}</p>
          </div>
          <ul className="grid content-start gap-x-6 gap-y-1 sm:grid-cols-2 md:col-span-6 md:col-start-7">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-12 items-center rounded-full px-4 text-base font-medium text-fg no-underline transition-colors duration-150 hover:bg-glass-2"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
