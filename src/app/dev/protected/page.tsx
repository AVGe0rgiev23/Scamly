// /dev/protected: preview of /protected (the call check) for the browser tests.
// CallCheckPage reads the voice switch at request time, so it needs <Suspense>.
// The „Помощ“ button is shown as on the real page, so the preview looks the same.

import { CircleHelp } from "lucide-react";
import { Suspense } from "react";
import { CallCheckPage } from "@/components/protected/CallCheckPage";
import { ButtonLink } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";

export default function ProtectedPreviewPage() {
  return (
    <>
      <Suspense fallback={null}>
        <CallCheckPage />
      </Suspense>
      <div className="shell relative z-1 max-w-2xl pb-6">
        <ButtonLink href="/protected/pomosht" variant="secondary" size="xl" className="w-full">
          <CircleHelp className="size-6 shrink-0" aria-hidden="true" />
          {bg.help.link}
        </ButtonLink>
      </div>
    </>
  );
}
