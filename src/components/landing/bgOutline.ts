// The outline of Bulgaria's 28 districts as SVG paths, for the small drawn maps on the
// home page (the bento cell and the map card). It reads public/geo/bg-districts.json
// (Natural Earth, public domain) on the server at build time, so the browser only gets
// a few kilobytes of finished path text and never downloads the GeoJSON.
//
// Projection: plain "equirectangular" (longitude → x, latitude → y), with x shrunk by
// cos(latitude) so the country is not stretched sideways. Good enough for a picture;
// the real scam map (/karta) uses Leaflet.

import geo from "../../../public/geo/bg-districts.json";

export type DistrictPath = { code: string; d: string };

// The country's box in degrees (a little wider than the data).
const WEST = 22.3;
const NORTH = 44.27;
const MID_LATITUDE = 42.7;
const X_SCALE = Math.cos((MID_LATITUDE * Math.PI) / 180);

// The drawing is WIDTH units wide; points closer than MIN_STEP units are dropped.
export const OUTLINE_WIDTH = 600;
const UNITS_PER_DEGREE = OUTLINE_WIDTH / ((28.65 - WEST) * X_SCALE);
export const OUTLINE_HEIGHT = Math.round((NORTH - 41.2) * UNITS_PER_DEGREE);
const MIN_STEP = 2.2;

type Ring = number[][];
type Feature = { properties: { code: string }; geometry: { type: string; coordinates: Ring[] } };

// One longitude/latitude pair → a point in the drawing (rounded to 0.1 unit).
export function project(lon: number, lat: number): [number, number] {
  const x = (lon - WEST) * X_SCALE * UNITS_PER_DEGREE;
  const y = (NORTH - lat) * UNITS_PER_DEGREE;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

// One ring of a polygon → "M x y L x y … Z", skipping points that are too close.
export function ringToPath(ring: Ring): string {
  const kept: [number, number][] = [];
  for (const pair of ring) {
    const point = project(pair[0] ?? 0, pair[1] ?? 0);
    const last = kept[kept.length - 1];
    if (last && Math.hypot(point[0] - last[0], point[1] - last[1]) < MIN_STEP) continue;
    kept.push(point);
  }
  if (kept.length < 3) return "";
  return `M${kept.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
}

// Every district (only Polygons are in the file) → its path. Computed once per build.
export const DISTRICT_PATHS: DistrictPath[] = (geo.features as Feature[]).map((feature) => ({
  code: feature.properties.code,
  d: feature.geometry.coordinates.map(ringToPath).join(""),
}));
