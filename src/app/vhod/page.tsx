// Family, moderator and administrator sign-in with the shared accessible form.
import Link from "next/link";
import { AUTH_LINK, AuthPage } from "@/components/auth/AuthPage";
import { KeepNextLink, LoginForm } from "@/components/auth/forms";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export default function LoginPage() {
  return (
    <AuthPage
      title={bg.auth.loginTitle}
      description={bg.auth.loginIntro}
      footer={
        <>
          <KeepNextLink href={ROUTES.register}>{bg.auth.toRegister}</KeepNextLink>
          <Link href={ROUTES.pair} className={AUTH_LINK}>
            {bg.auth.toPair}
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthPage>
  );
}
