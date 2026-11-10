// The drawing of the scam map (W3-03): the 28 districts from public/geo/bg-districts.json
// as a Leaflet GeoJSON layer, coloured by the number of approved reports.
//
// This file imports Leaflet, which needs `window`, so ScamMap.tsx loads it ONLY in the
// browser and only when the page is shown (next/dynamic with ssr: false). The rest of
// the page (waves, legend, table) does not wait for it.
//
// No base map tiles: just the districts on our own background. No requests to a tile
// server (faster on 4G, no third-party tracking, nothing to credit but the borders), and
// the map is fixed (no dragging or zooming), so a finger on the map never traps the
// page's scrolling. Small districts (e.g. Sofia city) are also in the table below.
//
// Accessibility: every district is a focusable button (Tab), with its name and number
// as its label. Focus or hover shows the same text as a tooltip; Enter, Space or a
// click opens the district's panel (onSelect).
"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { bg } from "@/i18n/bg";
import type { DistrictCode, MapStatsDto } from "@/schemas/reports";
import { districtLabel, levelOf } from "./mapData";

export const GEO_URL = "/geo/bg-districts.json";

type Props = {
  stats: MapStatsDto;
  selected: DistrictCode | null;
  onSelect: (code: DistrictCode) => void;
};

// The GeoJSON data L.geoJSON() accepts (the type of its first argument).
type GeoData = Parameters<typeof L.geoJSON>[0];

// One district's drawn shape (a Leaflet layer that has an SVG <path>).
type DistrictLayer = L.Path & {
  feature?: { properties: { code: DistrictCode } };
  setTooltipContent: (content: HTMLElement) => void;
};

export default function DistrictMap({ stats, selected, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const layers = useRef(new Map<DistrictCode, DistrictLayer>());
  // The latest onSelect, so the Leaflet event handlers (made once) never call an old one.
  const select = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  // 1. Create the map once and draw the districts (the shapes are loaded once).
  useEffect(() => {
    const element = container.current;
    if (element === null) return;
    let active = true;
    const map = L.map(element, {
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomSnap: 0, // any zoom, so Bulgaria exactly fills the box
    });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    map.attributionControl.addAttribution(bg.map.mapAttribution);
    const owned = layers.current;

    async function draw() {
      let geo: GeoData;
      try {
        const response = await fetch(GEO_URL);
        if (!response.ok) throw new Error(String(response.status));
        geo = (await response.json()) as GeoData;
      } catch {
        if (active) setFailed(true);
        return;
      }
      if (!active) return;
      const shapes = L.geoJSON(geo, {
        style: () => ({ className: "map-district", weight: 1.5 }),
        onEachFeature: (feature, layer) => {
          const code = (feature.properties as { code: DistrictCode }).code;
          const shape = layer as DistrictLayer;
          owned.set(code, shape);
          shape.bindTooltip("", { sticky: true, direction: "top", className: "map-tooltip" });
          shape.on("click", () => select.current(code));
        },
      });
      // The map needs a view (fitBounds) before the shapes can be drawn on it.
      const fit = () => map.fitBounds(shapes.getBounds(), { padding: [6, 6] });
      fit();
      shapes.addTo(map);
      // Make each <path> a keyboard button.
      for (const [code, shape] of owned) {
        const path = shape.getElement();
        if (path === undefined) continue;
        path.setAttribute("tabindex", "0");
        path.setAttribute("role", "button");
        path.setAttribute("data-code", code);
        path.addEventListener("focus", () => shape.openTooltip());
        path.addEventListener("blur", () => shape.closeTooltip());
        path.addEventListener("keydown", (event) => {
          const key = (event as KeyboardEvent).key;
          if (key === "Enter" || key === " ") {
            event.preventDefault();
            select.current(code);
          }
        });
      }
      // Fit again when the box changes size (phone turned, window resized).
      const observer = new ResizeObserver(() => {
        map.invalidateSize();
        fit();
      });
      observer.observe(element as HTMLDivElement);
      map.on("unload", () => observer.disconnect());
      setReady(true);
    }
    void draw();

    return () => {
      active = false;
      owned.clear();
      map.remove();
    };
  }, []);

  // 2. Colour, label and tooltip of every district for the current numbers.
  useEffect(() => {
    if (!ready) return;
    for (const district of stats.districts) {
      const shape = layers.current.get(district.districtCode);
      const path = shape?.getElement();
      if (shape === undefined || path === undefined) continue;
      const label = districtLabel(district);
      const level = levelOf(district.total);
      for (let other = 0; other <= 4; other++) {
        path.classList.toggle(`map-level-${other}`, other === level);
      }
      path.classList.toggle("map-selected", district.districtCode === selected);
      path.setAttribute("aria-label", label);
      path.setAttribute("aria-pressed", String(district.districtCode === selected));
      // textContent, never HTML: the tooltip shows plain text only.
      const tip = document.createElement("span");
      tip.textContent = label;
      shape.setTooltipContent(tip);
    }
  }, [ready, stats, selected]);

  return (
    <>
      {failed ? (
        <p role="alert" className="form-message form-message-error">
          {bg.map.loadError}
        </p>
      ) : null}
      <div
        ref={container}
        className="map-canvas"
        role="group"
        aria-label={bg.map.mapLabel}
        data-ready={ready ? "true" : "false"}
        hidden={failed}
      />
    </>
  );
}
