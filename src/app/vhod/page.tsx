// /vhod („вход“): TEMPORARY login page for family members, moderators and admins.
// Roberta designs the real one in Session F.

import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { LoginForm } from "../_auth-placeholders/forms";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-bold">{bg.auth.loginTitle}</h1>
      <LoginForm />
      <Link href={ROUTES.register} className="text-lg underline">
        {bg.auth.toRegister}
      </Link>
    </main>
  );
}
