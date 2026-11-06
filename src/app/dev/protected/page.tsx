// /dev/protected: preview of /protected (the call check) for the browser tests.
// CallCheckPage reads the voice switch at request time, so it needs <Suspense>.

import { Suspense } from "react";
import { CallCheckPage } from "@/components/protected/CallCheckPage";

export default function ProtectedPreviewPage() {
  return (
    <Suspense fallback={null}>
      <CallCheckPage />
    </Suspense>
  );
}
