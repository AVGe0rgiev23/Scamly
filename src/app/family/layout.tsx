// Layout of /family and every page inside it: only for the role "family".
// The role is checked on the server (FamilyGate) before any page of the area is
// shown; the proxy has already sent guests away to /vhod. The look of the area
// (Redesign v3 Phase 4) is in src/components/family/family.css, imported here.

import { Suspense, type ReactNode } from "react";
import { FamilyGate, FamilyLoading } from "@/components/family/FamilyGate";
import "@/components/family/family.css";

export default function FamilyLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<FamilyLoading />}>
      <FamilyGate>{children}</FamilyGate>
    </Suspense>
  );
}
