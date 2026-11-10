// /dev/moderator/reports: preview of /moderator/reports (the report queue) for the
// browser tests (tests/e2e/moderation.spec.ts). No data: the API answers 401 here
// without a moderator login; the tests answer it with page.route().

import { ReportQueue } from "@/components/moderator/ReportQueue";

export default function ReportQueuePreviewPage() {
  return <ReportQueue />;
}
