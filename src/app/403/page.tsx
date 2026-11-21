// Explains a denied role without exposing private data or weakening the server guard.
// Look: the calm error frame (StatusPage) with a still red halo around a quiet mono
// "403", the title, one sentence, one primary pill home and a text link to the login.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AUTH_LINK } from "@/components/auth/AuthPage";
import { StatusPage } from "@/components/auth/StatusPage";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export default function ForbiddenPage() {
  return (
    <StatusPage
      code="403"
      halo="danger"
      title={bg.areas.forbiddenTitle}
      text={bg.areas.forbiddenText}
      actions={
        <>
          <ButtonLink href={ROUTES.home} size="lg">
            <ArrowLeft className="size-5" aria-hidden="true" />
            {bg.common.backHome}
          </ButtonLink>
          <Link className={AUTH_LINK} href={ROUTES.login}>
            {bg.auth.toLogin}
          </Link>
        </>
      }
    >
      <p className="mt-2 text-fg-muted">{bg.areas.forbiddenHelp}</p>
    </StatusPage>
  );
}
