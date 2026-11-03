// Pairs the protected phone; URL code access stays inside Suspense for prerendering.
import { Suspense } from "react";
import { AuthPage } from "@/components/auth/AuthPage";
import { PairForm } from "@/components/auth/forms";
import { bg } from "@/i18n/bg";

export default function PairPage() {
  return (
    <AuthPage title={bg.pairing.title} description={bg.pairing.intro}>
      <Suspense fallback={<p role="status">{bg.common.loading}</p>}>
        <PairForm />
      </Suspense>
    </AuthPage>
  );
}
