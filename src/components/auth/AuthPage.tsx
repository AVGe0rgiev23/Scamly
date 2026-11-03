// Shared server-rendered frame for sign-in, registration and device pairing.
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { bg } from "@/i18n/bg";

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
    <main className="auth-page">
      <header className="auth-heading">
        <p className="auth-brand">{bg.app.name}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </header>
      <Card className="auth-card">{children}</Card>
      {footer ? <nav className="auth-footer">{footer}</nav> : null}
    </main>
  );
}
