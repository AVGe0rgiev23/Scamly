// /dev/family/person: preview of /family/[personId] for the browser tests, always
// with the made-up id PREVIEW_PERSON_ID (a fixed address, so no Suspense is needed).

import { PersonDashboard } from "@/components/family/PersonDashboard";
import { PREVIEW_PERSON_ID } from "@/components/family/preview";

export default function PersonPreviewPage() {
  return <PersonDashboard personId={PREVIEW_PERSON_ID} />;
}
