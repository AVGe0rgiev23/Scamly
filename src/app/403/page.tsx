// Explains a denied role without exposing private data or weakening the server guard.
// Look: a big quiet mono "403" with a jagged signal line, the title, one sentence and
// one primary link home (plus a text link to the login page).
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AUTH_LINK } from "@/components/auth/AuthPage";
import { ButtonLink } from "@/components/ui/Button";
import { SignalLine } from "@/components/ui/SignalLine";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export default function ForbiddenPage() {
  return (
    <main className="shell py-12 md:py-24">
      <div className="max-w-[60ch]">
        <p aria-hidden="true" className="tabular font-mono text-display text-fg-subtle">
          403
        </p>
        <SignalLine state="alert" className="mt-4 mb-10 h-8 max-w-sm" />
        <h1 className="text-h1">{bg.areas.forbiddenTitle}</h1>
        <p className="mt-4 text-lg text-fg-muted">{bg.areas.forbiddenText}</p>
        <p className="mt-2 text-fg-muted">{bg.areas.forbiddenHelp}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <ButtonLink href={ROUTES.home} size="lg">
            <ArrowLeft className="size-5" aria-hidden="true" />
            {bg.common.backHome}
          </ButtonLink>
          <Link className={AUTH_LINK} href={ROUTES.login}>
            {bg.auth.toLogin}
          </Link>
        </div>
      </div>
    </main>
  );
}
