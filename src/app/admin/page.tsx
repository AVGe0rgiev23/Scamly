// /admin: the admin's panel (W3-06) with three tabs: users and roles, statistics, audit
// log. The role guard is in layout.tsx; every number comes from /api/admin/*.

import { AdminHub } from "@/components/admin/AdminHub";

export default function AdminPage() {
  return <AdminHub />;
}
