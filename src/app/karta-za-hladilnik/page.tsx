// The public A5 fridge card with a permanent QR link to phone pairing (W3-10), with
// the D34 story („Провери истинския“), and under it the small phone sticker (#24, P-04).
// On screen (Ореол v3): the card is drawn as paper (always the light theme) held by a
// halo magnet on a stage with a soft aurora, like the fridge-card preview of the
// family's "add a person" form; next to it (below on a phone) a short hint and the
// print button. On paper: the card fills the first A5 page, the sticker (with a dashed
// cut line) is alone on a second page; black on white (print colours from globals.css,
// page size and the rest from fridgeCard.css).

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
    <main className="fridge shell py-10 md:py-16">
      <div className="fridge-layout">
        <div className="fridge-stage">
          <div className="fridge-stage-glow" aria-hidden="true" />
          {/* Paper: the light theme inside, whatever the page's theme is. */}
          <article className="fridge-card" data-theme="light">
            <h1 className="fridge-title">{card.title}</h1>
            <p className="fridge-hook">{card.hook}</p>
            <ol className="fridge-steps">
              {card.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="fridge-check">{card.check}</p>
            <div className="fridge-qr">
              <div className="fridge-qr-code">
                <QrCode text={PAIRING_URL} label={card.qrLabel} />
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <p className="fridge-pairing">{card.pairing}</p>
                <a href={PAIRING_URL} className="fridge-url">
                  {PAIRING_URL}
                </a>
              </div>
            </div>
          </article>
        </div>
        <aside className="fridge-aside no-print">
          <p className="eyebrow fridge-eyebrow">{card.link}</p>
          <p className="mt-4 max-w-[34ch] text-lg text-fg-muted">{card.screenHint}</p>
          <div className="mt-8">
            <PrintButton />
          </div>
        </aside>
      </div>
      {/* The phone sticker (#24): a small second printable item, about 85 × 55 mm. */}
      <section className="fridge-sticker-area" aria-labelledby="fridge-sticker-title">
        <h2 id="fridge-sticker-title" className="eyebrow fridge-eyebrow no-print">
          {card.stickerTitle}
        </h2>
        <p className="no-print mt-3 max-w-[48ch] text-fg-muted">{card.stickerHint}</p>
        {/* Paper again: the light theme inside, like the card. */}
        <div className="fridge-sticker" data-theme="light">
          <p className="fridge-sticker-text">{card.sticker}</p>
          <p className="fridge-sticker-rule">{card.stickerRule}</p>
        </div>
      </section>
    </main>
  );
}
