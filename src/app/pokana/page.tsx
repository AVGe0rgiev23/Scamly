// /pokana?t=<token>: accept an invite to become a trusted contact („покана“), W2-14.
// The page itself is open to everyone; the API checks the login and the role.
// The token is in the address, so this page sends no Referer anywhere (header
// `Referrer-Policy: no-referrer` in next.config.ts, plus the same <meta> tag here).
// Reading the address (useSearchParams) stays inside <Suspense>, like /svarzhi, so
// the frame is pre-rendered (Cache Components).

import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPage } from "@/components/auth/AuthPage";
import { InviteAccept } from "@/components/auth/InviteAccept";
import { bg } from "@/i18n/bg";

export const metadata: Metadata = {
  title: bg.invitePage.title,
  referrer: "no-referrer",
  // Invite links are private: search engines should never list them.
  robots: { index: false, follow: false },
};

export default function InvitePage() {
  return (
    <AuthPage title={bg.invitePage.title} description={bg.invitePage.intro}>
      <Suspense fallback={<p role="status">{bg.common.loading}</p>}>
        <InviteAccept />
      </Suspense>
    </AuthPage>
  );
}
