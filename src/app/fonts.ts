// The three typefaces of the app, served from our own files (src/fonts/, no request
// to another site). Each file holds only Latin and Cyrillic letters to stay small.
//
// Sofia Sans is drawn by the Bulgarian studio Lettersoup and uses the Bulgarian
// letter shapes („българска кирилица“). JetBrains Mono is for numbers and codes.
// next/font adds a matching fallback font, so the text does not jump while loading.

import localFont from "next/font/local";

// Body text and controls. `variable` puts the font into a CSS variable that
// globals.css reads (like a named constant).
export const sofia = localFont({
  src: "../fonts/SofiaSans.woff2",
  weight: "1 1000",
  variable: "--font-sofia",
  display: "swap",
});

// Headings: the slightly narrower cut of the same family.
export const sofiaCondensed = localFont({
  src: "../fonts/SofiaSansSemiCondensed.woff2",
  weight: "1 1000",
  variable: "--font-sofia-condensed",
  display: "swap",
});

// Data: phone numbers, pairing codes, risk scores, times.
export const jetbrains = localFont({
  src: "../fonts/JetBrainsMono.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
  display: "swap",
  preload: false,
});
