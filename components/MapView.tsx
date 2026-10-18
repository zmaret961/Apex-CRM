"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Map, {
  Source,
  Layer,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Company } from "@/lib/types";
import CompanyDrawer from "./CompanyDrawer";

const STATUS_COLOR: Record<string, string> = {
  customer: "#34d399",
  prospect: "#60a5fa",
  researched: "#6b7280",
};

// Free CARTO dark basemap — no token required.
const BASEMAP = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const INDUSTRIES = [
  "Finance", "Fintech", "Crypto", "Data Infrastructure", "Dev Tools",
  "Enterprise Software", "AI / ML", "Security", "Media", "Consumer",
  "Healthcare", "Real Estate", "Big Tech",
];

export default function MapView() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [industry, setIndustry] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [minFit, setMinFit] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [mapRef, setMapRef] = useState<MapRef | null>(null);
  const [hovered, setHovered] = useState<Company | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams();
    if (industry) p.set("industry", industry);
    if (status) p.set("status", status);
    if (minFit) p.set("minFit", String(minFit));
    fetch(`/api/companies?${p}`)
      .then((r) => r.json())
      .then((list) => {
        setCompanies(list);
        setLoaded(true);
      });
  }, [industry, status, minFit]);

  // Deep link: /?focus=<id> opens the company drawer and flies to its pin
  // (used by the ⌘K palette and Focus page). Re-runs when the URL changes,
  // so ⌘K also works while already on the map.
  const searchParams = useSearchParams();
  const focusId = Number(searchParams.get("focus")) || null;
  useEffect(() => {
    if (!focusId || !mapRef) return;
    const fly = (c: { lng: number; lat: number }) =>
      mapRef.easeTo({ center: [c.lng, c.lat], zoom: 13.5, duration: 900 });
    const c = companies.find((x) => x.id === focusId);
    if (c) {
      setSelected(focusId);
      fly(c);
      return;
    }
    // The company may be hidden by the active filters — fetch it directly.
    let cancelled = false;
    fetch(`/api/companies/${focusId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.company) return;
        setSelected(focusId);
        fly(d.company);
      });
    return () => {
      cancelled = true;
    };
  }, [focusId, companies, mapRef]);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: companies.map((c) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
        properties: {
          id: c.id,
          name: c.name,
          status: c.status,
          fitScore: c.fitScore,
          color: STATUS_COLOR[c.status] ?? "#6b7280",
        },
      })),
    }),
    [companies]
  );

  const onClick = useCallback(
    (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || !mapRef) return;
      const clusterId = f.properties?.cluster_id;
      if (clusterId != null) {
        // Zoom into cluster
        const source = mapRef.getMap().getSource("companies") as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
          mapRef.easeTo({ center: [lng, lat], zoom: (zoom ?? 12) + 0.5, duration: 500 });
        });
        return;
      }
      const id = f.properties?.id;
      if (id != null) setSelected(id);
    },
    [mapRef]
  );

  const onMove = useCallback(
    (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f && f.properties?.id) {
        const c = companies.find((x) => x.id === f.properties!.id);
        setHovered(c ?? null);
        setCursor({ x: e.point.x, y: e.point.y });
      } else {
        setHovered(null);
        setCursor(null);
      }
    },
    [companies]
  );

  return (
    <div className="relative h-full w-full">
      <Map
        ref={setMapRef}
        mapLib={maplibregl}
        mapStyle={BASEMAP}
        initialViewState={{ longitude: -73.9857, latitude: 40.7280, zoom: 11.6 }}
        maxBounds={[[-76.5, 39.0], [-70.5, 42.5]]}
        interactiveLayerIds={["clusters", "pins"]}
        onClick={onClick}
        onMouseMove={onMove}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="bottom-right" />
        <Source
          id="companies"
          type="geojson"
          data={geojson}
          cluster
          clusterMaxZoom={13}
          clusterRadius={44}
        >
          {/* glow halo */}
          <Layer
            id="pin-glow"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-radius": 14,
              "circle-color": ["get", "color"],
              "circle-opacity": 0.28,
              "circle-blur": 1,
            }}
          />
          <Layer
            id="pins"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-radius": 6,
              "circle-color": ["get", "color"],
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "rgba(255,255,255,0.75)",
            }}
          />
          <Layer
            id="clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-radius": ["step", ["get", "point_count"], 16, 8, 20, 25, 26],
              "circle-color": "rgba(109,141,255,0.35)",
              "circle-stroke-width": 1,
              "circle-stroke-color": "rgba(150,170,255,0.5)",
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": "{point_count_abbreviated}",
              "text-size": 12,
              "text-font": ["Noto Sans Regular", "Arial Unicode MS Regular"],
            }}
            paint={{ "text-color": "#e5e7ff" }}
          />
        </Source>
      </Map>

      {/* hover tooltip */}
      {hovered && cursor && (
        <div
          className="glass pointer-events-none absolute z-30 rounded-xl px-3 py-2 text-sm"
          style={{ left: cursor.x + 14, top: cursor.y + 14 }}
        >
          <div className="font-medium text-white">{hovered.name}</div>
          <div className="text-xs text-gray-400">
            {hovered.industry} · fit {hovered.fitScore}
          </div>
        </div>
      )}

      {/* filter bar */}
      <div className="glass absolute left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-2.5">
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="interactive rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm text-gray-300 [&>option]:bg-base-900"
        >
          <option value="">All industries</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="interactive rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm text-gray-300 [&>option]:bg-base-900"
        >
          <option value="">All statuses</option>
          <option value="customer">Customers</option>
          <option value="prospect">Prospects</option>
          <option value="researched">Researched</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          Fit ≥ {minFit}
          <input
            type="range" min={0} max={100} step={5} value={minFit}
            onChange={(e) => setMinFit(Number(e.target.value))}
            className="w-24 accent-accent"
          />
        </label>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-400">
          {companies.length} companies
        </span>
      </div>

      {/* filtered-to-zero notice */}
      {loaded && companies.length === 0 && (
        <div className="glass absolute left-1/2 top-40 z-30 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm text-gray-300">
          No companies match these filters —
          <button
            onClick={() => {
              setIndustry("");
              setStatus("");
              setMinFit(0);
            }}
            className="ml-1.5 text-accent-soft hover:underline"
          >
            reset
          </button>
        </div>
      )}

      {/* legend */}
      <div className="glass absolute bottom-6 left-6 z-30 space-y-1.5 rounded-2xl px-4 py-3 text-xs">
        <Legend color="#34d399" label="Devin customer" />
        <Legend color="#60a5fa" label="High-fit prospect" />
        <Legend color="#6b7280" label="Researched / low-fit" />
      </div>

      <CompanyDrawer
        companyId={selected}
        onClose={() => setSelected(null)}
        onAdded={() => {
          // Refresh pins so pin state reflects pipeline changes immediately.
          fetch("/api/companies").then((r) => r.json()).then(setCompanies);
        }}
      />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-300">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
      />
      {label}
    </div>
  );
}
