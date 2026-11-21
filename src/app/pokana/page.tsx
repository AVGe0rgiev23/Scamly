// /pokana?t=<token>: accept an invite to become a trusted contact („покана“), W2-14.
// The page itself is open to everyone; the API checks the login and the role.
// The token is in the address, so this page sends no Referer anywhere (header
// `Referrer-Policy: no-referrer` in next.config.ts, plus the same <meta> tag here).
// Reading the address (useSearchParams) stays inside <Suspense>, like /svarzhi, so
// the frame is pre-rendered (Cache Components).
// Look: the AuthPage frame; every state of the invite is shown inside its panel.

import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
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
      <Suspense
        fallback={
          // The shape of the first answer: two lines of text and two pills.
          <div className="flex flex-col gap-4">
            <p role="status" className="sr-only">
              {bg.common.loading}
            </p>
            <SkeletonText lines={2} className="max-w-sm" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Skeleton className="h-14 w-full rounded-full sm:w-32" />
              <Skeleton className="h-14 w-full rounded-full sm:w-40" />
            </div>
          </div>
        }
      >
        <InviteAccept />
      </Suspense>
    </AuthPage>
  );
}
