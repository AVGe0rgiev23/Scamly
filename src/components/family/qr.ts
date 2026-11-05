// Turns a text (our pairing link) into the squares of a QR code.
//
// The `qrcode` library (MIT) does the hard part: error correction and the mask
// pattern. We only ask it for the grid of black and white squares (`create`) and
// draw them ourselves as one SVG path, so the QR code is made in the browser and
// the pairing code is never sent to any other website.

import { create } from "qrcode";

// The QR picture as data for an <svg>: `size` squares per side and one path that
// draws every black square ("M x y h1 v1 h-1 z" = a 1×1 square at x, y).
export function qrSquares(text: string): { size: number; path: string } {
  // "M" error correction: about 15 % of the code may be dirty or creased and it
  // still scans.
  const code = create(text, { errorCorrectionLevel: "M" });
  const size = code.modules.size;
  const parts: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      // modules.data is the grid row by row, 1 = black (like a flat Python list).
      if (code.modules.data[row * size + col]) {
        parts.push(`M${col} ${row}h1v1h-1z`);
      }
    }
  }
  return { size, path: parts.join("") };
}
