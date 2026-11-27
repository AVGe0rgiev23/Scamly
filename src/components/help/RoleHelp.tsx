// Shared Bulgarian help guide and dashboard link for the signed-in areas.
// Look (Redesign v3 „Ореол“, help.css): an eyebrow and the title; the steps as an
// ordered list drawn as a timeline (halo-ringed number nodes on a thin line, each step
// on a raised panel); beside it (under it on a phone) a glass "device frame" with the
// screenshot of that area, and a ghost „back“ pill with an arrow.
// The screenshots (public/help/<role>.jpg): protected + family were made again in the
// release check (27 Nov) from the /dev preview pages. Which ones exist is the list
// HELP_SCREENSHOTS below (not a check of the disk: on Vercel the files in
// public/ are served from the CDN and are not next to the server code, so a disk
// check would always say "missing"). Without a screenshot the frame shows a quiet
// empty halo instead, as decoration only. A Server Component.
import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { HaloRings } from "@/components/ui/HaloRings";
import { bg } from "@/i18n/bg";
import "./help.css";

// Like a Python Literal type derived from the keys of the help dictionary.
type HelpRole = keyof typeof bg.help.guides;

// The size of each screenshot (fixed width/height attributes, so no layout shift).
// The older person's screen is a phone (portrait), the others are wide browser views.
const SHOT_SIZE: Record<HelpRole, { width: number; height: number }> = {
  protected: { width: 800, height: 1000 },
  family: { width: 1600, height: 1000 },
  moderator: { width: 1600, height: 1000 },
  admin: { width: 1600, height: 1000 },
};

// The roles whose public/help/<role>.jpg exists (moderator and admin: not yet, their
// areas were not restyled). Whoever adds a file adds its role here in the same commit.
const HELP_SCREENSHOTS: readonly HelpRole[] = ["protected", "family"];

function hasScreenshot(role: HelpRole): boolean {
  return HELP_SCREENSHOTS.includes(role);
}

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
  const shot = SHOT_SIZE[role];
  const phone = role === "protected";

  return (
    <section className="help py-2" data-large={large || undefined}>
      <header className="help-head">
        <p className="eyebrow help-eyebrow">{bg.help.link}</p>
        <h1 className="max-w-[60ch] text-h1">{guide.title}</h1>
      </header>
      <div className="help-grid">
        {/* The step numbers are a CSS counter in the nodes, so they are not part of the
            text; the <ol> itself tells screen readers the order. */}
        <ol className={large ? "help-steps text-xl" : "help-steps text-lg"}>
          {guide.steps.map((step) => (
            <li key={step} className="help-step">
              <span className="help-node" aria-hidden="true" />
              <p className="help-card">{step}</p>
            </li>
          ))}
        </ol>
        <div className="help-device" data-shape={phone ? "phone" : "browser"}>
          <div className="help-device-bar" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          {/* Its aspect ratio (help.css, by data-shape) matches SHOT_SIZE. */}
          <div className="help-device-screen">
            {hasScreenshot(role) ? (
              // A plain <img>: the file may be missing at build time, so next/image's
              // static import can't be used; width/height keep its place.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/help/${role}.jpg`}
                alt={guide.screenshotAlt}
                width={shot.width}
                height={shot.height}
                loading="lazy"
                decoding="async"
                className="help-device-img"
              />
            ) : (
              // No screenshot yet: a quiet halo keeps the place (decoration only).
              <div className="help-device-empty" aria-hidden="true">
                <div className="help-device-halo">
                  <HaloRings state="idle" size="100%" animated={false} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ButtonLink href={`/${role}`} variant="ghost" size={large ? "lg" : "md"} className="mt-10">
        <ArrowLeft className="size-5" aria-hidden="true" />
        {bg.help.back}
      </ButtonLink>
    </section>
  );
}
