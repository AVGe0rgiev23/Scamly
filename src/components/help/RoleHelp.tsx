// Shared Bulgarian help guide and dashboard link for the signed-in areas.
import Link from "next/link";
import { bg } from "@/i18n/bg";

// Like a Python Literal type derived from the keys of the help dictionary.
type HelpRole = keyof typeof bg.help.guides;

export function HelpLink({ role }: { role: HelpRole }) {
  return <Link href={`/${role}/pomosht`}>{bg.help.link}</Link>;
}

export function RoleHelp({ role }: { role: HelpRole }) {
  const guide = bg.help.guides[role];

  return (
    <section>
      <h1>{guide.title}</h1>
      <ol>
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <Link href={`/${role}`}>{bg.help.back}</Link>
    </section>
  );
}
