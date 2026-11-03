// Family, moderator and administrator sign-in with the shared accessible form.
import Link from "next/link";
import { AuthPage } from "@/components/auth/AuthPage";
import { LoginForm } from "@/components/auth/forms";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export default function LoginPage() {
  return (
    <AuthPage
      title={bg.auth.loginTitle}
      description={bg.auth.loginIntro}
      footer={
        <>
          <Link href={ROUTES.register}>{bg.auth.toRegister}</Link>
          <Link href={ROUTES.pair}>{bg.auth.toPair}</Link>
        </>
      }
    >
      <LoginForm />
    </AuthPage>
  );
}
