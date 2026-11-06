// /family/alerts („Сигнали“, task W2-03): the live list of call checks of everyone
// the family member looks after, with „Обаждам ѝ се сега“ (W2-04). The role guard is
// in ../layout.tsx; the list itself loads from our API in the browser
// (src/components/family/AlertsPage.tsx). Push notifications and alert e-mails link
// here as /family/alerts?check=<id>.

import { AlertsPage } from "@/components/family/AlertsPage";

export default function FamilyAlertsPage() {
  return <AlertsPage />;
}
