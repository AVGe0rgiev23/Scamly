// /dev/family/proveri?id=…: preview of /family/proveri for the browser tests
// (tests/e2e/identity.spec.ts). No data of its own: everything comes from our API,
// which answers 401 without a login; the tests answer it with page.route().

import { IdentityAnswerPage } from "@/components/family/IdentityAnswerPage";

export default function IdentityAnswerPreviewPage() {
  return <IdentityAnswerPage />;
}
