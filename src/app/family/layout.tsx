// Layout of /family and every page inside it: only for the role "family".
// The role is checked on the server (FamilyGate) before any page of the area is
// shown; the proxy has already sent guests away to /vhod.

import { Suspense, type ReactNode } from "react";
import { FamilyGate, FamilyLoading } from "@/components/family/FamilyGate";

export default function FamilyLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<FamilyLoading />}>
      <FamilyGate>{children}</FamilyGate>
    </Suspense>
  );
}
