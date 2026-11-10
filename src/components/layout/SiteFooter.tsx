// The bottom bar of every page: what Scamly is (a school project), its licence and
// our promise of no ads and no tracking, and the link to the public report form
// „Подай сигнал за измама“ (W3-02) and to the scam map „Карта на измамите“ (W3-03);
// not in the header, so the phone menu stays on one row. A Server Component with
// plain text.

import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>
          <Link href={ROUTES.report} className="site-footer-link">
            {bg.reportForm.footerLink}
          </Link>
        </p>
        <p>
          <Link href={ROUTES.map} className="site-footer-link">
            {bg.map.footerLink}
          </Link>
        </p>
        <p>{bg.layout.footerProject}</p>
        <p>{bg.layout.footerPrinciples}</p>
      </div>
    </footer>
  );
}
