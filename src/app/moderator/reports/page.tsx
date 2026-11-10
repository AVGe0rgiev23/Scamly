// /moderator/reports: the queue of public reports „Сигнали за проверка“ (W3-04 UI).
// The role guard is in ../layout.tsx; the list is loaded from our API in the browser.

import { ReportQueue } from "@/components/moderator/ReportQueue";

export default function ModeratorReportsPage() {
  return <ReportQueue />;
}
