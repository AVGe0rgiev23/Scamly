// Pairs the protected phone; URL code access stays inside Suspense for prerendering.
// Look: the AuthPage frame in its large form (older people): calm halo rings that
// "wait for the code", a very large code well and a 64 px button.
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { AuthPage } from "@/components/auth/AuthPage";
import { PairForm } from "@/components/auth/forms";
import { bg } from "@/i18n/bg";

export default function PairPage() {
  return (
    <AuthPage title={bg.pairing.title} description={bg.pairing.intro} large>
      <Suspense
        fallback={
          // The shape of the form: the label, the big code well, the hint, the button.
          <div className="flex flex-col gap-4">
            <p role="status" className="sr-only">
              {bg.common.loading}
            </p>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-18 w-full max-w-80 rounded-md" />
            <Skeleton className="h-6 w-full max-w-md" />
            <Skeleton className="mt-2 h-16 w-full rounded-full sm:w-40" />
          </div>
        }
      >
        <PairForm />
      </Suspense>
    </AuthPage>
  );
}
