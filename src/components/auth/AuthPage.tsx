// Shared server-rendered frame for sign-in, registration, device pairing and invites.
// Look (Redesign v3 „Ореол“, auth.css): an entry into the product. On a desktop a
// two-part composition: at the left a raised panel with the eyebrow, the title, the
// form and the links; at the right a stage with a large still halo (HaloRings) and
// the page's intro set large over a soft aurora. On a phone the stage becomes a short
// halo band with the intro inside the panel, right above the form.
// The reading order is always: title, intro, form, links (a CSS grid places them).
// `large` is for the older person's pairing page: a bigger halo and larger intro.
import type { ReactNode } from "react";
import { HaloRings } from "@/components/ui/HaloRings";
import type { HaloState } from "@/components/ui/halo/haloMath";
import { bg } from "@/i18n/bg";
import "./auth.css";

// The look of the small text links under the auth forms (48 px tall tap area).
export const AUTH_LINK =
  "inline-flex min-h-12 items-center font-semibold text-accent underline underline-offset-4 hover:text-accent-hover";

export function AuthPage({
  title,
  description,
  children,
  footer,
  halo = "calm",
  large = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  halo?: HaloState;
  large?: boolean;
}) {
  return (
    <main className="auth shell" data-large={large || undefined}>
      <div className="auth-aurora" aria-hidden="true" />
      <div className="auth-grid">
        {/* The two surfaces are decoration only; the content is drawn over them. */}
        <div className="auth-panel-bg" aria-hidden="true" />
        <div className="auth-stage-bg" aria-hidden="true">
          <div className="auth-stage-halo">
            <HaloRings state={halo} size="100%" />
          </div>
        </div>
        <header className="auth-head">
          <p className="eyebrow auth-eyebrow">{bg.app.name}</p>
          <h1 className="text-h2">{title}</h1>
        </header>
        <p className={large ? "auth-intro text-xl" : "auth-intro text-lg"}>{description}</p>
        <div className="auth-form">{children}</div>
        {footer ? <nav className="auth-foot">{footer}</nav> : null}
      </div>
    </main>
  );
}
