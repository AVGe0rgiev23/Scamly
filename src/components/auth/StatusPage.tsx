// The calm frame of the error pages 403 (no access) and 404 (no such page).
// Look (auth.css section 4): a large still halo (HaloRings: `danger` for 403, `idle`
// for 404) with the code in thin mono type as a quiet graphic (under the idle rings, inside
// the one danger ring), and next
// to it (under it on a phone) the title, one sentence and one primary pill home.
// The code is decoration (aria-hidden): the h1 says the same in words.
// A Server Component; the site header and footer stay around it.
import type { ReactNode } from "react";
import { HaloRings } from "@/components/ui/HaloRings";
import type { HaloState } from "@/components/ui/halo/haloMath";
import "./auth.css";

export function StatusPage({
  code,
  halo,
  title,
  text,
  children,
  actions,
}: {
  code: string;
  halo: HaloState;
  title: string;
  text: string;
  children?: ReactNode; // more sentences under the main one
  actions: ReactNode;
}) {
  return (
    <main className="auth shell flex-1">
      <div className="auth-aurora" aria-hidden="true" />
      <div className="auth-status-grid">
        <div className="auth-status-visual" data-state={halo} aria-hidden="true">
          <div className="auth-status-rings">
            <HaloRings state={halo} size="100%" animated={false} />
          </div>
          <span className="auth-status-code tabular">{code}</span>
        </div>
        <div className="auth-status-text">
          <h1 className="text-h1">{title}</h1>
          <p className="mt-5 text-lg text-fg-muted">{text}</p>
          {children}
          <div className="auth-status-actions">{actions}</div>
        </div>
      </div>
    </main>
  );
}
