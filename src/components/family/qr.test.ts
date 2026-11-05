// Unit tests for qrSquares() (qr.ts).

import { describe, expect, it } from "vitest";
import { qrSquares } from "./qr";

describe("qrSquares", () => {
  it("makes a square QR grid for a pairing link", () => {
    const qr = qrSquares("https://scamly.example/svarzhi?kod=482915");
    // QR sizes are 21, 25, 29 … squares (4 more per version).
    expect((qr.size - 21) % 4).toBe(0);
    expect(qr.size).toBeGreaterThanOrEqual(25);
    expect(qr.path.startsWith("M0 0h1v1h-1z")).toBe(true); // corner finder pattern
  });

  it("gives the same picture for the same text and another one for another code", () => {
    const first = qrSquares("https://scamly.example/svarzhi?kod=482915");
    expect(qrSquares("https://scamly.example/svarzhi?kod=482915")).toEqual(first);
    expect(qrSquares("https://scamly.example/svarzhi?kod=482916").path).not.toBe(first.path);
  });
});
