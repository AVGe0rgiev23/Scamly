// /dev/nav: a preview of the site's menu for every role (phase 5), for the browser
// tests and the screenshots. The real header reads the login on the server, so it is
// always the guest one here; this page draws the pill and the phone dock of each role
// as if one of its pages were open (the family member on /family/alerts, so the
// sliding light and the live badge can be seen; the badge's GET can be faked with
// page.route). Only with SCAMLY_DEV_PAGES=1 (src/app/dev/layout.tsx).

import { HeaderPreview, type HeaderAccount } from "@/components/layout/SiteHeader";
import { ROUTES } from "@/config/routes";
import { SAMPLE } from "@/content/placeholders";
import { bg } from "@/i18n/bg";

// Each preview: its title, the pretend account (null = guest) and the open page.
const PREVIEWS: { id: string; title: string; account: HeaderAccount | null; path: string }[] = [
  { id: "guest", title: bg.layout.previewRoles.guest, account: null, path: ROUTES.login },
  {
    id: "protected",
    title: bg.layout.previewRoles.protected,
    account: { role: "protected", displayName: SAMPLE.protectedName },
    path: "/protected/pomosht",
  },
  {
    id: "family",
    title: bg.layout.previewRoles.family,
    account: { role: "family", displayName: SAMPLE.familyName },
    path: ROUTES.familyAlerts,
  },
  {
    id: "moderator",
    title: bg.layout.previewRoles.moderator,
    account: { role: "moderator", displayName: SAMPLE.otherFamily[0] },
    path: ROUTES.moderatorReports,
  },
  {
    id: "admin",
    title: bg.layout.previewRoles.admin,
    account: { role: "admin", displayName: SAMPLE.otherFamily[1] },
    path: ROUTES.admin,
  },
];

export default function NavPreviewPage() {
  return (
    <main className="shell flex flex-col gap-12 py-12">
      <h1 className="text-h2">{bg.layout.previewTitle}</h1>
      {PREVIEWS.map((preview) => (
        <section
          key={preview.id}
          id={`nav-${preview.id}`}
          aria-labelledby={`nav-${preview.id}-title`}
          className="flex flex-col gap-4"
        >
          <h2 id={`nav-${preview.id}-title`} className="text-h3">
            {preview.title}
          </h2>
          <HeaderPreview account={preview.account} path={preview.path} />
        </section>
      ))}
    </main>
  );
}
