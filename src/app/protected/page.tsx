// /protected: the home of the older person's paired phone: the call check (W2-01).
// The role guard is in layout.tsx; everything on the screen runs in the browser and
// talks only to our API (which checks the phone's login again on every request).
// CallCheckPage reads the voice switch (W2-10) on the server first.
//
// Under the check: help as a big labelled button („Помощ“), never a tiny icon. It
// sits above the verdict's flood (relative z-1, like the check itself).

import { CircleHelp } from "lucide-react";
import { CallCheckPage } from "@/components/protected/CallCheckPage";
import { ButtonLink } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";

export default function ProtectedPage() {
  return (
    <>
      <CallCheckPage />
      <div className="shell relative z-1 max-w-2xl pb-6">
        <ButtonLink href="/protected/pomosht" variant="secondary" size="xl" className="w-full">
          <CircleHelp className="size-6 shrink-0" aria-hidden="true" />
          {bg.help.link}
        </ButtonLink>
      </div>
    </>
  );
}
