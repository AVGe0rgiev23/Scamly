// The bottom of every page: the public tools (report form, scam map, education
// cards, fridge card), what Scamly is (a school project), its licence and our
// promise of no ads and no tracking. A Server Component with plain links.

import Link from "next/link";
import { SignalLine } from "@/components/ui/SignalLine";
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
    <footer className="mt-24 border-t border-line print:hidden">
      <SignalLine state="idle" className="h-px text-line" />
      <div className="shell grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight">
            <LogoMark size={24} />
            {bg.app.name}
          </p>
          <p className="mt-4 max-w-[44ch] text-sm text-fg-muted">{bg.layout.footerProject}</p>
          <p className="mt-1 max-w-[44ch] text-sm text-fg-muted">{bg.layout.footerPrinciples}</p>
        </div>
        <ul className="grid content-start gap-x-8 sm:grid-cols-2 md:col-span-6 md:col-start-7">
          {LINKS.map((link) => (
            <li key={link.href} className="border-b border-line">
              <Link
                href={link.href}
                className="flex min-h-12 items-center text-base font-medium text-fg no-underline hover:text-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
