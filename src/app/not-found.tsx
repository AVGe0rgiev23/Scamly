// The page shown when an address does not exist (HTTP 404), in Bulgarian.
// Look: the calm error frame (StatusPage) with a still idle halo around a quiet mono
// "404", the title, one sentence and one primary pill home.

import { ArrowLeft } from "lucide-react";
import { StatusPage } from "@/components/auth/StatusPage";
import { ButtonLink } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";

export default function NotFoundPage() {
  return (
    <StatusPage
      code="404"
      halo="idle"
      title={bg.common.notFoundTitle}
      text={bg.common.notFoundText}
      actions={
        <ButtonLink href="/" size="lg">
          <ArrowLeft className="size-5" aria-hidden="true" />
          {bg.common.backHome}
        </ButtonLink>
      }
    />
  );
}
