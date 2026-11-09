// „Отпечатай картата“: opens the browser's print window for the education card, so a
// grandchild can print it for a grandparent (W3-05). A Client Component, because
// printing happens in the browser. The page's print styles (globals.css, @media print)
// hide the header, the menu and the buttons.
"use client";

import { bg } from "@/i18n/bg";

export function PrintButton() {
  return (
    <button
      type="button"
      className="button button-secondary edu-no-print"
      onClick={() => window.print()}
    >
      {bg.education.print}
    </button>
  );
}
