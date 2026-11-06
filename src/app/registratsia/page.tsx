// Creates a family account; confirmation and errors are handled by the shared form.
import { AuthPage } from "@/components/auth/AuthPage";
import { KeepNextLink, RegisterForm } from "@/components/auth/forms";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export default function RegisterPage() {
  return (
    <AuthPage
      title={bg.auth.registerTitle}
      description={bg.auth.registerIntro}
      footer={<KeepNextLink href={ROUTES.login}>{bg.auth.toLogin}</KeepNextLink>}
    >
      <RegisterForm />
    </AuthPage>
  );
}
