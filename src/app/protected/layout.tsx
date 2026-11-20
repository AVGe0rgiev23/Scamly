// Layout of /protected: only for the role "protected" (a paired phone). The role is
// checked on the server (ProtectedGate) before the page is shown; the proxy has
// already sent phones that are not paired to /svarzhi.

import { Suspense, type ReactNode } from "react";
import { ProtectedGate, ProtectedLoading } from "@/components/protected/ProtectedGate";
// The call check's own styles (the big button, halo dots, the verdict moment).
import "@/components/protected/protected.css";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ProtectedLoading />}>
      <ProtectedGate>{children}</ProtectedGate>
    </Suspense>
  );
}
