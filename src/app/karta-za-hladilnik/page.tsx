// The public A5 fridge card with a permanent QR link to phone pairing (W3-10).

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
    <main className="fridge-card-page">
      <article className="fridge-card">
        <h1>{card.title}</h1>
        <ol>
          {card.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>{card.check}</p>
        <div className="fridge-card-pairing">
          <QrCode text={PAIRING_URL} label={card.qrLabel} />
          <div>
            <p>{card.pairing}</p>
            <a href={PAIRING_URL}>{PAIRING_URL}</a>
          </div>
        </div>
      </article>
      <PrintButton />
    </main>
  );
}
