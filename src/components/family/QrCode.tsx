// Draws a QR code as an inline SVG picture. Always black squares on white with a
// white border ("quiet zone" of 4 squares), also in dark mode: phone cameras read
// dark-on-light codes most reliably.
"use client";

import { useMemo } from "react";
import { qrSquares } from "./qr";

const QUIET_ZONE = 4;

export function QrCode({ text, label }: { text: string; label: string }) {
  // useMemo: compute the squares again only when the text changes (like a cache).
  const qr = useMemo(() => qrSquares(text), [text]);
  const full = qr.size + QUIET_ZONE * 2;
  return (
    <svg
      className="qr-code block h-auto w-full rounded-sm"
      viewBox={`0 0 ${full} ${full}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={full} height={full} fill="#ffffff" />
      <path d={qr.path} fill="#000000" transform={`translate(${QUIET_ZONE} ${QUIET_ZONE})`} />
    </svg>
  );
}
