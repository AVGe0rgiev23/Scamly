// Creates a family account; confirmation and errors are handled by the shared form.
import Link from "next/link";
import { AuthPage } from "@/components/auth/AuthPage";
import { RegisterForm } from "@/components/auth/forms";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export default function RegisterPage() {
  return (
    <AuthPage
      title={bg.auth.registerTitle}
      description={bg.auth.registerIntro}
      footer={<Link href={ROUTES.login}>{bg.auth.toLogin}</Link>}
    >
      <RegisterForm />
    </AuthPage>
  );
}
