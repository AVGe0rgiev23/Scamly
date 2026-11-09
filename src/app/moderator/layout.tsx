// Layout of /moderator and every page inside it: only for moderators and admins.
// The role is checked on the server (ModeratorGate) before any page of the area is
// shown; the proxy has already sent guests away to /vhod.

import { Suspense, type ReactNode } from "react";
import { ModeratorGate, ModeratorLoading } from "@/components/moderator/ModeratorGate";

export default function ModeratorLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ModeratorLoading />}>
      <ModeratorGate>{children}</ModeratorGate>
    </Suspense>
  );
}
