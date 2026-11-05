// The bottom bar of every page: what Scamly is (a school project), its licence and
// our promise of no ads and no tracking. A Server Component with plain text.

import { bg } from "@/i18n/bg";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>{bg.layout.footerProject}</p>
        <p>{bg.layout.footerPrinciples}</p>
      </div>
    </footer>
  );
}
