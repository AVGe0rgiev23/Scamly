// The one bright pill of the header: „Провери обаждане“, with the icon disc at its
// end (the primary ButtonLink). It opens the check, /protected: a paired phone goes
// straight in, any other visitor is sent to the pairing page first by the proxy
// (the same target as the home page's start button).
//
// Not shown on the check screens themselves (/protected and its /dev preview): the
// older person is already there and the screen must stay clean. usePathname needs a
// <Suspense> boundary with Cache Components; the fallback shows the pill.
"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { isProtectedFlow } from "./siteNav";

function CtaPill() {
  return (
    // Below 640 px the words are one step smaller, so logo and pill fit a 360 px phone.
    <ButtonLink
      href={ROUTES.protected}
      size="md"
      className="site-cta shrink-0 whitespace-nowrap max-sm:pl-4 max-sm:text-[0.9375rem]"
    >
      {bg.layout.checkCta}
    </ButtonLink>
  );
}

function CtaUnlessProtectedFlow() {
  const pathname = usePathname();
  return isProtectedFlow(pathname) ? null : <CtaPill />;
}

export function HeaderCta() {
  return (
    <Suspense fallback={<CtaPill />}>
      <CtaUnlessProtectedFlow />
    </Suspense>
  );
}
