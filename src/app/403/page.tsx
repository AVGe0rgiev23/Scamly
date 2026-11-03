// Explains a denied role without exposing private data or weakening the server guard.
import Link from "next/link";
import { AuthPage } from "@/components/auth/AuthPage";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export default function ForbiddenPage() {
  return (
    <AuthPage
      title={bg.areas.forbiddenTitle}
      description={bg.areas.forbiddenText}
      footer={<Link href={ROUTES.home}>{bg.common.backHome}</Link>}
    >
      <p>{bg.areas.forbiddenHelp}</p>
      <Link className="auth-action-link" href={ROUTES.login}>
        {bg.auth.toLogin}
      </Link>
    </AuthPage>
  );
}
