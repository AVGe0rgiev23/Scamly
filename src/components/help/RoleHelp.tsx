// Shared Bulgarian help guide and dashboard link for the signed-in areas.
import Image from "next/image";
import Link from "next/link";
import { bg } from "@/i18n/bg";
import adminScreenshot from "../../../public/help/admin.jpg";
import familyScreenshot from "../../../public/help/family.jpg";
import moderatorScreenshot from "../../../public/help/moderator.jpg";
import protectedScreenshot from "../../../public/help/protected.jpg";

// Like a Python Literal type derived from the keys of the help dictionary.
type HelpRole = keyof typeof bg.help.guides;

const screenshots = {
  admin: adminScreenshot,
  family: familyScreenshot,
  moderator: moderatorScreenshot,
  protected: protectedScreenshot,
};

export function HelpLink({ role }: { role: HelpRole }) {
  return <Link href={`/${role}/pomosht`}>{bg.help.link}</Link>;
}

export function RoleHelp({ role }: { role: HelpRole }) {
  const guide = bg.help.guides[role];

  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <h1 className="text-3xl font-bold">{guide.title}</h1>
      <ol className="list-decimal space-y-3 pl-6">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <Image
        src={screenshots[role]}
        alt={guide.screenshotAlt}
        sizes="(max-width: 768px) 100vw, 768px"
        className="h-auto max-w-full rounded-lg border"
      />
      <Link href={`/${role}`}>{bg.help.back}</Link>
    </section>
  );
}
