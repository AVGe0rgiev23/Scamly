// Layout of /admin: only for admins (W3-06). The role is checked on the server
// (AdminGate) before the page is shown; the proxy has already sent guests to /vhod.

import { Suspense, type ReactNode } from "react";
import { AdminGate, AdminLoading } from "@/components/admin/AdminGate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
