// Shared Bulgarian help guide and dashboard link for the signed-in areas.
// Look: the title, the steps as an ordered list with mono numbers, the screenshot in
// a bordered rounded frame and a quiet „back“ link with an arrow.
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
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
  return (
    <Link
      href={`/${role}/pomosht`}
      className="inline-flex min-h-12 items-center gap-2 font-semibold text-accent underline underline-offset-4 hover:text-accent-hover"
    >
      <CircleHelp className="size-5" aria-hidden="true" />
      {bg.help.link}
    </Link>
  );
}

export function RoleHelp({ role }: { role: HelpRole }) {
  const guide = bg.help.guides[role];
  // The older person's screen uses larger text (design rule for their screens).
  const large = role === "protected";

  return (
    <section className="py-2">
      <h1 className="max-w-[60ch] text-h1">{guide.title}</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-12 md:gap-x-6">
        {/* The mono step numbers are a CSS counter, so they are not part of the text. */}
        <ol
          className={`flex max-w-[60ch] flex-col border-t border-line [counter-reset:step] md:col-span-5 ${large ? "text-xl" : "text-lg"}`}
        >
          {guide.steps.map((step) => (
            <li
              key={step}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-3 border-b border-line py-4 [counter-increment:step] before:tabular before:font-mono before:text-base before:text-accent before:content-[counter(step,decimal-leading-zero)]"
            >
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="md:col-span-7">
          <Image
            src={screenshots[role]}
            alt={guide.screenshotAlt}
            sizes="(max-width: 768px) 100vw, 700px"
            className="h-auto w-full max-w-full rounded-lg border border-line"
          />
        </div>
      </div>
      <ButtonLink href={`/${role}`} variant="ghost" size={large ? "lg" : "md"} className="mt-8">
        <ArrowLeft className="size-5" aria-hidden="true" />
        {bg.help.back}
      </ButtonLink>
    </section>
  );
}
