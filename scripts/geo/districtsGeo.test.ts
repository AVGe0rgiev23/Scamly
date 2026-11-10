// Checks the district shapes of the scam map (public/geo/bg-districts.json, W3-03),
// made by scripts/geo/build-districts.mjs: all 28 districts of our database, each
// once, valid polygons inside Bulgaria, and small enough for a phone on 4G.

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";

const FILE = path.resolve(import.meta.dirname, "../../public/geo/bg-districts.json");

type Ring = [number, number][];
type Feature = {
  properties: { code: string };
  geometry:
    { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
};

const geo = JSON.parse(readFileSync(FILE, "utf8")) as { type: string; features: Feature[] };

function rings(feature: Feature): Ring[] {
  return feature.geometry.type === "Polygon"
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat();
}

describe("public/geo/bg-districts.json", () => {
  it("has exactly the 28 district codes of bg.districts (and the districts table), in order", () => {
    expect(geo.type).toBe("FeatureCollection");
    expect(geo.features.map((feature) => feature.properties.code)).toEqual(
      Object.keys(bg.districts),
    );
  });

  it("is smaller than 300 KB", () => {
    expect(statSync(FILE).size).toBeLessThan(300 * 1024);
  });

  it("has closed rings with points inside Bulgaria", () => {
    for (const feature of geo.features) {
      for (const ring of rings(feature)) {
        expect(ring.length).toBeGreaterThanOrEqual(4);
        expect(ring[0]).toEqual(ring.at(-1));
        for (const [lon, lat] of ring) {
          expect(lon).toBeGreaterThan(22.3);
          expect(lon).toBeLessThan(28.7);
          expect(lat).toBeGreaterThan(41.2);
          expect(lat).toBeLessThan(44.3);
        }
      }
    }
  });
});
