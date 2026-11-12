// Pairs the protected phone; URL code access stays inside Suspense for prerendering.
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { AuthPage } from "@/components/auth/AuthPage";
import { PairForm } from "@/components/auth/forms";
import { bg } from "@/i18n/bg";

export default function PairPage() {
  return (
    <AuthPage title={bg.pairing.title} description={bg.pairing.intro}>
      <Suspense
        fallback={
          <div>
            <p role="status" className="sr-only">
              {bg.common.loading}
            </p>
            <Skeleton className="h-64 w-full max-w-md" />
          </div>
        }
      >
        <PairForm />
      </Suspense>
    </AuthPage>
  );
}
