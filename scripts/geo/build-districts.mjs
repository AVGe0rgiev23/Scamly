// Builds public/geo/bg-districts.json: the shapes of Bulgaria's 28 districts
// (области) for the scam map /karta (task W3-03).
//
// Source: Natural Earth 1:10m "Admin 1 – States, Provinces", version 5.1.2, which is
// in the PUBLIC DOMAIN (no permission or credit needed; we credit it anyway).
// Download it once (about 40 MB, not kept in git):
//
//   curl -o /tmp/ne_10m_admin_1.geojson \
//     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson
//   node scripts/geo/build-districts.mjs /tmp/ne_10m_admin_1.geojson
//
// What the script does:
//   1. keeps only Bulgaria's 28 provinces (adm0_a3 = "BGR");
//   2. keeps ONE property, `code` = the ISO 3166-2:BG code (BG-01 … BG-28), the same
//      codes as our `districts` table and bg.districts (names come from bg.ts);
//   3. simplifies: rounds every point to 3 decimals (about 100 m, invisible on a
//      country map) and drops points that became equal to the one before. Neighbouring
//      districts share their border points, so rounding keeps them touching exactly
//      (no gaps or overlaps, unlike line simplification of each shape on its own);
//   4. checks that all 28 codes are there exactly once and the file is < 300 KB.
// Plain JavaScript (.mjs) so it runs with plain `node`, like scripts/icons/generate.mjs.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUTPUT = path.resolve(import.meta.dirname, "../../public/geo/bg-districts.json");
const MAX_BYTES = 300 * 1024;
const DECIMALS = 3;

const input = process.argv[2];
if (!input) {
  console.error(
    "Usage: node scripts/geo/build-districts.mjs <ne_10m_admin_1_states_provinces.geojson>",
  );
  process.exit(1);
}

const source = JSON.parse(readFileSync(input, "utf8"));
const factor = 10 ** DECIMALS;
const round = (value) => Math.round(value * factor) / factor;

// One ring (a closed line of [longitude, latitude] points): round, drop repeats.
function simplifyRing(ring) {
  const out = [];
  for (const [lon, lat] of ring) {
    const point = [round(lon), round(lat)];
    const last = out.at(-1);
    if (!last || last[0] !== point[0] || last[1] !== point[1]) {
      out.push(point);
    }
  }
  if (out.length < 4) {
    throw new Error("a ring became too small after rounding");
  }
  return out;
}

function simplifyGeometry(geometry) {
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(simplifyRing) };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) => polygon.map(simplifyRing)),
    };
  }
  throw new Error(`unexpected geometry ${geometry.type}`);
}

const features = source.features
  .filter((feature) => feature.properties.adm0_a3 === "BGR")
  .map((feature) => ({
    type: "Feature",
    properties: { code: feature.properties.iso_3166_2 },
    geometry: simplifyGeometry(feature.geometry),
  }))
  .sort((a, b) => a.properties.code.localeCompare(b.properties.code));

// Exactly BG-01 … BG-28, each once.
const expected = Array.from({ length: 28 }, (_, i) => `BG-${String(i + 1).padStart(2, "0")}`);
const codes = features.map((feature) => feature.properties.code);
if (JSON.stringify(codes) !== JSON.stringify(expected)) {
  throw new Error(`expected the 28 codes BG-01…BG-28, got: ${codes.join(", ")}`);
}

const output = JSON.stringify({
  type: "FeatureCollection",
  // Where the shapes come from (shown on the map too).
  source: "Natural Earth 1:10m Admin 1 v5.1.2, public domain (naturalearthdata.com)",
  features,
});
if (output.length > MAX_BYTES) {
  throw new Error(`the file is ${output.length} bytes, more than ${MAX_BYTES}`);
}
writeFileSync(OUTPUT, `${output}\n`);
console.log(
  `Wrote ${OUTPUT}: ${features.length} districts, ${(output.length / 1024).toFixed(1)} KB`,
);
