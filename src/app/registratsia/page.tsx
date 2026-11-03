// /registratsia („регистрация“): TEMPORARY sign-up page for family members.
// Roberta designs the real one in Session F.

import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { RegisterForm } from "../_auth-placeholders/forms";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-bold">{bg.auth.registerTitle}</h1>
      <RegisterForm />
      <Link href={ROUTES.login} className="text-lg underline">
        {bg.auth.toLogin}
      </Link>
    </main>
  );
}
