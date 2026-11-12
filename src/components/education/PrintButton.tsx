// „Отпечатай картата“: opens the browser's print window for the education card, so a
// grandchild can print it for a grandparent (W3-05). A Client Component, because
// printing happens in the browser. The button itself is hidden on paper (`no-print`
// and `print:hidden`); the page's print styles (globals.css) hide the header and menu.
"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";

export function PrintButton() {
  return (
    <Button
      variant="secondary"
      size="lg"
      className="no-print print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="size-5" aria-hidden="true" />
      {bg.education.print}
    </Button>
  );
}
