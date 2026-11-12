// The public A5 fridge card with a permanent QR link to phone pairing (W3-10).
// On screen: the card in a bordered A5-shaped panel with a print button below it.
// On paper: only the card, filling an A5 page, black on white (print colours from
// globals.css, page size from fridgeCard.css).

import type { Metadata } from "next";
import { PrintButton } from "@/components/education/PrintButton";
import { QrCode } from "@/components/family/QrCode";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import "./fridgeCard.css";

const PAIRING_URL = `https://scamly-ag777.vercel.app${ROUTES.pair}`;

export const metadata: Metadata = {
  title: `${bg.fridgeCard.link} | ${bg.app.name}`,
};

export default function FridgeCardPage() {
  const card = bg.fridgeCard;

  return (
    <main className="shell flex flex-col items-start gap-8 py-10 md:py-16 print:block print:max-w-none print:p-0">
      <article className="flex w-full max-w-[34rem] flex-col gap-6 rounded-lg border-2 border-line-strong bg-surface-1 p-6 sm:aspect-[148/210] sm:p-10 print:aspect-auto print:max-w-none print:rounded-none print:border-0 print:p-0">
        <h1 className="text-h1">{card.title}</h1>
        <ol className="flex flex-col gap-4 text-xl [counter-reset:step]">
          {card.steps.map((step) => (
            <li
              key={step}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-3 font-semibold [counter-increment:step] before:tabular before:font-mono before:text-xl before:text-accent before:content-[counter(step)]"
            >
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="border-t border-line pt-4 text-lg">{card.check}</p>
        <div className="mt-auto grid grid-cols-[7rem_1fr] items-start gap-5 border-t border-line pt-6 sm:grid-cols-[9rem_1fr]">
          <QrCode text={PAIRING_URL} label={card.qrLabel} />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-base">{card.pairing}</p>
            <a
              href={PAIRING_URL}
              className="tabular font-mono text-sm break-all text-accent underline underline-offset-4"
            >
              {PAIRING_URL}
            </a>
          </div>
        </div>
      </article>
      <PrintButton />
    </main>
  );
}
