// /dev/family/alerts: preview of /family/alerts for the browser tests
// (tests/e2e/alerts.spec.ts). No data of its own: everything comes from our API,
// which answers 401 without a login; the tests answer it with page.route().

import { AlertsPage } from "@/components/family/AlertsPage";

export default function AlertsPreviewPage() {
  return <AlertsPage />;
}
