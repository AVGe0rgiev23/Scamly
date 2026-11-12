// Shared server-rendered frame for sign-in, registration, device pairing and invites.
// Desktop: a 12-column split, the title and the form in the left five columns and a
// quiet "instrument panel" (measuring-paper lines, a calm signal line, the intro in
// large text) on the right. Phone: one column, title, intro, form, links.
import type { ReactNode } from "react";
import { SignalLine } from "@/components/ui/SignalLine";
import { bg } from "@/i18n/bg";

// The look of the small text links under the auth forms (48 px tall tap area).
export const AUTH_LINK =
  "inline-flex min-h-12 items-center font-semibold text-accent underline underline-offset-4 hover:text-accent-hover";

export function AuthPage({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="shell py-10 md:py-16">
      <div className="grid gap-y-8 md:grid-cols-12 md:gap-x-6">
        <header className="md:col-span-5 md:col-start-1 md:row-start-1">
          <p className="mb-3 font-mono text-xs text-fg-subtle">{bg.app.name}</p>
          <h1 className="text-h1">{title}</h1>
        </header>
        {/* On a phone only the intro shows here; the panel look starts at md. */}
        <div className="md:col-span-6 md:col-start-7 md:row-span-3 md:row-start-1 md:flex md:min-h-[26rem] md:flex-col md:justify-between md:rounded-lg md:border md:border-line md:bg-surface-1 md:p-10 md:grid-lines">
          <SignalLine state="calm" className="hidden h-12 text-fg-subtle md:block" />
          <p className="max-w-[40ch] text-lg text-fg-muted md:text-xl">{description}</p>
        </div>
        <div className="md:col-span-5 md:col-start-1 md:row-start-2">{children}</div>
        {footer ? (
          <nav className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-4 md:col-span-5 md:col-start-1 md:row-start-3">
            {footer}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
