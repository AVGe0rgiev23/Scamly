// /family/proveri?id=… („Провери истинския“, P-06): the family member's answer screen
// „Ти ли си?“ with „Не съм аз — обаждам ти се сега!“ and „Аз съм“. The role guard is
// in ../layout.tsx; the question loads from our API in the browser
// (src/components/family/IdentityAnswerPage.tsx). The push „Някой се представя за теб“
// and the list on /family/alerts link here.

import { IdentityAnswerPage } from "@/components/family/IdentityAnswerPage";

export default function FamilyIdentityPage() {
  return <IdentityAnswerPage />;
}
