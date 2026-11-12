// The page shown when an address does not exist (HTTP 404), in Bulgarian.
// Look: a big quiet mono "404" with a flat (idle) signal line, the title, one
// sentence and one primary link home.

import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { SignalLine } from "@/components/ui/SignalLine";
import { bg } from "@/i18n/bg";

export default function NotFoundPage() {
  return (
    <main className="shell flex-1 py-12 md:py-24">
      <div className="max-w-[60ch]">
        <p aria-hidden="true" className="tabular font-mono text-display text-fg-subtle">
          404
        </p>
        <SignalLine state="idle" className="mt-4 mb-10 h-8 max-w-sm text-line-strong" />
        <h1 className="text-h1">{bg.common.notFoundTitle}</h1>
        <p className="mt-4 text-lg text-fg-muted">{bg.common.notFoundText}</p>
        <ButtonLink href="/" size="lg" className="mt-8">
          <ArrowLeft className="size-5" aria-hidden="true" />
          {bg.common.backHome}
        </ButtonLink>
      </div>
    </main>
  );
}
