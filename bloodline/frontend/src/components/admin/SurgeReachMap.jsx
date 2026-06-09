import { useEffect, useRef } from "react";
import { BL } from "../../tokens";

// ── Map config (CDN-loaded MapLibre, same as the donor map) ───────────────────
const MAP_STYLE_URL    = "https://tiles.openfreemap.org/styles/liberty";
const MAPLIBRE_JS_URL  = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS_URL = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

// HSA / Red Cross blood bank locations (approx). Names match ManageSlotsPanel.
const BLOOD_BANKS = [
  { name: "Bloodbank@HSA",         lat: 1.27889, lng: 103.83655 },
  { name: "Bloodbank@Dhoby Ghaut", lat: 1.29980, lng: 103.84550 },
  { name: "Bloodbank@Woodlands",   lat: 1.43020, lng: 103.78900 },
  { name: "Bloodbank@Westgate",    lat: 1.33400, lng: 103.74240 },
  { name: "Bloodbank@One Punggol", lat: 1.40400, lng: 103.90200 },
];

// Singapore-wide bounds for island-wide framing.
const SG_BOUNDS = [[103.60, 1.20], [104.05, 1.48]];

function tierRadiusKm(geoTier) {
  if (geoTier === "5km")  return 5;
  if (geoTier === "15km") return 15;
  return null; // island-wide → no discrete radius
}

let maplibrePromise;
function loadMaplibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (maplibrePromise) return maplibrePromise;
  maplibrePromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MAPLIBRE_CSS_URL;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${MAPLIBRE_JS_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.maplibregl), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = MAPLIBRE_JS_URL;
    script.async = true;
    script.onload = () => resolve(window.maplibregl);
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return maplibrePromise;
}

// GeoJSON polygon approximating a circle of `radiusKm` around (lng,lat).
function circleFeature(lng, lat, radiusKm, points = 72) {
  const coords = [];
  const distX = radiusKm / (111.320 * Math.cos((lat * Math.PI) / 180));
  const distY = radiusKm / 110.574;
  for (let i = 0; i < points; i++) {
    const t = (i / points) * 2 * Math.PI;
    coords.push([lng + distX * Math.cos(t), lat + distY * Math.sin(t)]);
  }
  coords.push(coords[0]);
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] } };
}

function tierFeatureCollection(geoTier) {
  const radius = tierRadiusKm(geoTier);
  if (!radius) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: BLOOD_BANKS.map(b => circleFeature(b.lng, b.lat, radius)),
  };
}

export default function SurgeReachMap({ geoTier, notified, bloodLabel }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const readyRef     = useRef(false);
  const errorRef     = useRef(null);

  // Init once
  useEffect(() => {
    let cancelled = false;
    loadMaplibre()
      .then(maplibregl => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE_URL,
          bounds: SG_BOUNDS,
          fitBoundsOptions: { padding: 24 },
          attributionControl: false,
        });
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

        map.on("load", () => {
          map.addSource("tiers", { type: "geojson", data: tierFeatureCollection(geoTier) });
          map.addLayer({
            id: "tiers-fill", type: "fill", source: "tiers",
            paint: { "fill-color": BL.surge, "fill-opacity": 0.12 },
          });
          map.addLayer({
            id: "tiers-line", type: "line", source: "tiers",
            paint: { "line-color": BL.surge, "line-width": 1.5, "line-opacity": 0.55 },
          });

          // Blood bank markers
          BLOOD_BANKS.forEach(b => {
            const el = document.createElement("div");
            el.style.cssText =
              "width:11px;height:11px;border-radius:50%;background:" + BL.surge +
              ";border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)";
            new maplibregl.Marker({ element: el })
              .setLngLat([b.lng, b.lat])
              .setPopup(new maplibregl.Popup({ offset: 12, closeButton: false }).setText(b.name))
              .addTo(map);
          });

          readyRef.current = true;
        });

        mapRef.current = map;
      })
      .catch(() => {
        errorRef.current = true;
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;height:100%;' +
            'font-family:' + BL.sans + ';font-size:12px;color:' + BL.muted + ';text-align:center;padding:16px">' +
            "Map unavailable — reach figures are still accurate.</div>";
        }
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  // Update the radius rings when the tier changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("tiers");
    if (src) src.setData(tierFeatureCollection(geoTier));
    if (tierRadiusKm(geoTier)) {
      map.fitBounds(SG_BOUNDS, { padding: 24, duration: 400 });
    }
  }, [geoTier]);

  const radius = tierRadiusKm(geoTier);
  const radiusLabel = radius ? `${radius} km radius · ${BLOOD_BANKS.length} blood banks` : "Island-wide · all donors";

  return (
    <div style={{ position: "relative", height: 240, borderRadius: 8, overflow: "hidden", border: `1px solid ${BL.hair}`, background: BL.fill }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Reach overlay */}
      <div style={{
        position: "absolute", left: 10, top: 10, pointerEvents: "none",
        background: "rgba(255,255,255,0.94)", border: `1px solid ${BL.hair}`,
        borderRadius: 6, padding: "8px 10px", boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
      }}>
        <div style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase", color: BL.muted }}>
          Notified in reach{bloodLabel ? ` · ${bloodLabel}` : ""}
        </div>
        <div style={{ fontFamily: BL.mono, fontSize: 24, fontWeight: 700, color: BL.ink, lineHeight: 1.1, marginTop: 2 }}>
          {(notified ?? 0).toLocaleString()}
        </div>
        <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.surge, marginTop: 2 }}>{radiusLabel}</div>
      </div>
    </div>
  );
}
