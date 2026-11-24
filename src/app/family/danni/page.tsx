// Family data controls, protected by the family layout's role gate.
import Link from "next/link";
import { AccountDeletion } from "@/components/family/AccountDeletion";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export default function FamilyDataPage() {
  const copy = bg.accountData;
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-h1">{copy.title}</h1>
      <section className="surface-raised space-y-3 rounded-xl p-6">
        <h2 className="text-h3">{copy.exportTitle}</h2>
        <p className="text-fg-muted">{copy.exportIntro}</p>
        <a
          href="/api/me/export"
          download
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          {copy.exportButton}
        </a>
      </section>
      <AccountDeletion />
      <Link href={ROUTES.privacy} className="underline underline-offset-4">
        {bg.privacy.title}
      </Link>
    </div>
  );
}
