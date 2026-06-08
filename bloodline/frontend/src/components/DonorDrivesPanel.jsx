import { useState, useEffect, useMemo, useRef } from "react";
import { getDrives, getSlots, createBooking, bookSlot, getMyBookings } from "../api";
import { BL } from "../tokens";

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOOD_TYPES   = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const INVITE_STATUSES  = ["Critical", "High", "Low"];
const ORGANIZER_NAME   = "Bryan";
const TARGET_RSVPS     = 18;
const DEFAULT_MAP_CENTER = { lat: 1.3521, lng: 103.8198 };
const SESSION_TABS     = [
  { id: "all", label: "All" },
  { id: "drive", label: "Drives" },
  { id: "slot", label: "Bloodbank" },
];
const MAPCN_STYLE_URL   = "https://tiles.openfreemap.org/styles/liberty";
const MAPLIBRE_JS_URL   = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS_URL  = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
const DONATION_TIME_OPTIONS = [
  "09:00", "09:30", "10:00", "10:30", "11:00",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

const TYPE_BADGE = {
  drive: { label: "DRIVE", bg: "#fff4e0", fg: "#b86a00" },
  slot:  { label: "BLOODBANK", bg: "#e0eeff", fg: "#1a5cbf" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pickRandom(items) { return items[Math.floor(Math.random() * items.length)]; }
function coordLabel(lat, lng) { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
function nextDateValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}
function dateLabel(dateValue) {
  if (!dateValue) return "";
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-SG", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function timeLabel(timeValue) {
  if (!timeValue) return "";
  return timeValue;
}
function streetLabel(result, fallback) {
  const a = result?.address ?? {};
  return a.road
    ?? a.pedestrian
    ?? a.footway
    ?? a.cycleway
    ?? a.neighbourhood
    ?? a.suburb
    ?? a.city
    ?? result?.name
    ?? result?.display_name
    ?? fallback;
}

// ── Small components ──────────────────────────────────────────────────────────

function AppHeader({ sub, title }) {
  return (
    <div style={{ padding: "0 0 10px" }}>
      {sub && <div style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: BL.muted, marginBottom: 2 }}>{sub}</div>}
      <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>{title}</div>
    </div>
  );
}

function Tag({ children, color, bg }) {
  return (
    <span style={{
      fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase",
      color: color || BL.muted,
      ...(bg ? { background: bg, padding: "2px 6px", borderRadius: 3 } : {}),
    }}>
      {children}
    </span>
  );
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

function MapcnLocationMap({ location, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const [mapError, setMapError] = useState("");

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let cancelled = false;

    loadMaplibre()
      .then(maplibregl => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: MAPCN_STYLE_URL,
          center: [location.lng, location.lat],
          zoom: 15,
          attributionControl: false,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
        map.on("click", e => {
          onSelectRef.current({
            lat: e.lngLat.lat,
            lng: e.lngLat.lng,
            label: coordLabel(e.lngLat.lat, e.lngLat.lng),
            needsReverseGeocode: true,
          });
        });

        const markerEl = document.createElement("div");
        markerEl.style.width = "18px";
        markerEl.style.height = "18px";
        markerEl.style.borderRadius = "18px";
        markerEl.style.background = BL.red;
        markerEl.style.border = "2px solid #fff";
        markerEl.style.boxShadow = "0 2px 8px rgba(26,25,23,0.28)";

        markerRef.current = new maplibregl.Marker({ element: markerEl })
          .setLngLat([location.lng, location.lat])
          .addTo(map);
        mapRef.current = map;
      })
      .catch(() => setMapError("Map failed to load. You can still search or use current location."));

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const lngLat = [location.lng, location.lat];
    markerRef.current.setLngLat(lngLat);
    mapRef.current.easeTo({ center: lngLat, zoom: 15, duration: 350 });
  }, [location.lat, location.lng]);

  return (
    <div style={{ position: "relative", height: 210, border: `1px solid ${BL.hair}`, borderRadius: 8, overflow: "hidden", background: BL.fill, marginBottom: 10 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", left: 10, bottom: 10, maxWidth: "calc(100% - 20px)", background: "rgba(255,255,255,0.92)", border: `1px solid ${BL.hair}`, borderRadius: 6, padding: "6px 8px", fontFamily: BL.sans, fontSize: 11, color: BL.ink, boxShadow: "0 4px 14px rgba(26,25,23,0.12)", pointerEvents: "none" }}>
        Location: {location.label ?? coordLabel(location.lat, location.lng)}
      </div>
      {mapError && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: BL.fill, fontFamily: BL.sans, fontSize: 12, color: BL.muted, textAlign: "center" }}>
          {mapError}
        </div>
      )}
    </div>
  );
}

// ── Squad RSVP modal ──────────────────────────────────────────────────────────

function SquadRsvpModal({ item, onClose }) {
  const [copied, setCopied] = useState(false);
  const msg = `Hey squad! Let's donate blood together 🩸\n\n${item.name ?? item.location}\n${item.date}${item.startTime ? ` · ${item.startTime}` : ""}\n${item.location}\n\nRSVP here: <link>`;

  function share() {
    if (navigator.share) {
      navigator.share({ title: "Squad blood donation", text: msg, url: "<link>" }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(26,25,23,0.32)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, background: BL.card, borderRadius: "12px 12px 0 0", padding: 24, paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink, marginBottom: 3 }}>Squad RSVP</div>
            <Tag>Invite your whole squad at once</Tag>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: BL.muted, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ background: BL.fill, borderRadius: 8, padding: 14, marginBottom: 16, fontFamily: BL.sans, fontSize: 13, color: BL.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {msg}
        </div>

        <button
          onClick={share}
          style={{
            width: "100%", padding: "13px 0",
            background: BL.ink, color: "#fff", border: "none", borderRadius: 8,
            fontFamily: BL.sans, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 50,
          }}
        >
          {copied ? "Copied to clipboard ✓" : "Share with squad →"}
        </button>
        <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.faint, textAlign: "center", marginTop: 8 }}>
          Opens WhatsApp, Messages, or any share sheet
        </div>
      </div>
    </div>
  );
}

// ── Host a Drive bubble ───────────────────────────────────────────────────────

function HostDriveBubble({ onInviteSent }) {
  const [show,         setShow]         = useState(false);
  const [step,         setStep]         = useState("group");
  const [group,        setGroup]        = useState("");
  const [selectedDate, setSelectedDate] = useState(nextDateValue);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedBloodTypes, setSelectedBloodTypes] = useState([]);
  const [mapCenter,    setMapCenter]    = useState(DEFAULT_MAP_CENTER);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationStatus, setLocationStatus] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const inviteStatus    = useMemo(() => pickRandom(INVITE_STATUSES), []);
  const totalMembers    = useMemo(() => 96 + Math.floor(Math.random() * 65), []);
  const activeLocation  = selectedLocation ?? mapCenter;
  const selectedDateLabel = dateLabel(selectedDate);
  const selectedDateTimeLabel = selectedDate && selectedTime
    ? `${selectedDateLabel} · ${timeLabel(selectedTime)}`
    : "";
  const selectedBloodTypeLabel = selectedBloodTypes.length > 0 ? selectedBloodTypes.join(", ") : "Any blood type";

  useEffect(() => {
    if (!show || selectedLocation || !navigator.geolocation) return;
    setLocationStatus("Finding your current location...");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Current location", needsReverseGeocode: true };
        setMapCenter(next);
        selectLocation(next);
        setLocationStatus("");
      },
      () => setLocationStatus("Location access is off. Search or tap the map to choose a location.")
    );
  }, [show, selectedLocation]);

  function close() { setShow(false); setStep("group"); }
  function goBack() {
    if (step === "review") { setStep("blood"); return; }
    if (step === "blood") { setStep("time"); return; }
    setStep("group");
  }

  function confirmLocation() {
    if (!selectedLocation) return;
    setGroup(selectedLocation.label || coordLabel(selectedLocation.lat, selectedLocation.lng));
    setStep("time");
  }

  function toggleBloodType(type) {
    setSelectedBloodTypes(prev => (
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    ));
  }

  async function selectLocation(place) {
    const lat = Number(place.lat);
    const lng = Number(place.lon ?? place.lng);
    const fallback = coordLabel(lat, lng);
    const next = {
      lat,
      lng,
      label: place.display_name ?? place.label ?? fallback,
    };
    setSelectedLocation(next);
    setMapCenter(next);

    if (!place.needsReverseGeocode) return;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`);
      if (!res.ok) throw new Error("Reverse geocode failed");
      const data = await res.json();
      setSelectedLocation(prev => (
        prev && prev.lat === lat && prev.lng === lng
          ? { ...prev, label: streetLabel(data, fallback) }
          : prev
      ));
    } catch {
      setSelectedLocation(prev => (
        prev && prev.lat === lat && prev.lng === lng
          ? { ...prev, label: fallback }
          : prev
      ));
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser.");
      return;
    }
    setLocationStatus("Finding your current location...");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Current location", needsReverseGeocode: true };
        setMapCenter(next);
        selectLocation(next);
        setLocationStatus("");
      },
      () => setLocationStatus("Location access denied. Search or tap the map to choose a location.")
    );
  }

  async function searchLocation(e) {
    e.preventDefault();
    const q = locationQuery.trim();
    if (!q) return;
    setLocationLoading(true);
    setLocationStatus("");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=sg&q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setLocationResults(data);
      if (data[0]) selectLocation(data[0]);
      if (!data.length) setLocationStatus("No locations found. Try a nearby landmark or address.");
    } catch {
      setLocationStatus("Location search is unavailable right now.");
    } finally {
      setLocationLoading(false);
    }
  }

  function send()  {
    if (!selectedDate || !selectedTime) return;
    onInviteSent({ driveId: `hosted-${Date.now()}`, _type: "drive", name: `${group} blood drive`, date: selectedDateLabel, startTime: selectedTime, location: group, booked: 0, capacity: TARGET_RSVPS });
    close();
  }

  return (
    <div style={{ background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ fontFamily: BL.mono, fontSize: 10, fontWeight: 700, color: BL.red, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 5 }}>HOST A DRIVE</div>
      <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink, marginBottom: 3 }}>Mobilise your workplace, school, or RC</div>
      <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, lineHeight: 1.45 }}>We'll coordinate a mobile unit with HSA on your behalf</div>
      <button onClick={() => { setStep("group"); setShow(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "7px 12px", background: "#fff", color: BL.ink, border: `1px solid ${BL.ink}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        Start a drive →
      </button>

      {show && (
        <div style={{ position: "fixed", inset: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(26,25,23,0.28)" }}>
          <div style={{ width: "100%", maxWidth: 520, background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 8, boxShadow: "0 18px 48px rgba(26,25,23,0.18)", padding: 18 }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              {step !== "group" ? (
                <button onClick={goBack} style={{ background: "none", border: "none", fontFamily: BL.sans, fontSize: 13, fontWeight: 600, color: BL.ink, cursor: "pointer", padding: 0 }}>← Back</button>
              ) : <div />}
              <button onClick={close} style={{ background: "none", border: "none", fontSize: 18, color: BL.muted, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.faint, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5 }}>
              {step === "group" ? "1" : step === "time" ? "2" : step === "blood" ? "3" : "4"}/4
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 700, color: BL.ink, marginBottom: 5 }}>
              {step === "group" ? "Select a location" : step === "time" ? "Choose a date and time" : step === "blood" ? "Choose a blood type" : "Review the invite"}
            </div>
            {step !== "review" && (
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, lineHeight: 1.45, marginBottom: 14 }}>
                {step === "group" ? "Search, use your current location, or tap the map to pick a meeting point." : step === "time" ? `Selected location: ${group}` : "Select one or more blood types to invite."}
              </div>
            )}

            {/* Step: Group */}
            {step === "group" && (
              <>
                <form onSubmit={searchLocation} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 10 }}>
                  <input
                    value={locationQuery}
                    onChange={e => setLocationQuery(e.target.value)}
                    placeholder="Search location"
                    style={{ minWidth: 0, padding: "10px 12px", border: `1px solid ${BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, color: BL.ink }}
                  />
                  <button type="submit" disabled={locationLoading} style={{ padding: "10px 14px", background: BL.ink, color: "#fff", border: `1px solid ${BL.ink}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 700, cursor: locationLoading ? "default" : "pointer", opacity: locationLoading ? 0.55 : 1 }}>
                    {locationLoading ? "Searching" : "Search"}
                  </button>
                </form>

                <MapcnLocationMap location={activeLocation} onSelect={selectLocation} />

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <button type="button" onClick={useCurrentLocation} style={{ padding: "7px 10px", background: "#fff", border: `1px solid ${BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 12, fontWeight: 600, color: BL.ink, cursor: "pointer" }}>
                    Use current location
                  </button>
                </div>

                {locationResults.length > 0 && (
                  <div style={{ display: "grid", gap: 6, marginBottom: 10, maxHeight: 118, overflowY: "auto" }}>
                    {locationResults.map(place => (
                      <button key={place.place_id} type="button" onClick={() => selectLocation(place)} style={{ padding: "8px 10px", background: selectedLocation?.label === place.display_name ? "#fff" : BL.fill, color: BL.ink, border: `1px solid ${selectedLocation?.label === place.display_name ? BL.ink : BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 12, textAlign: "left", cursor: "pointer", lineHeight: 1.35 }}>
                        {place.display_name}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ minHeight: 18, fontFamily: BL.sans, fontSize: 12, color: locationStatus ? BL.muted : BL.ink, marginBottom: 10, lineHeight: 1.4 }}>
                  {locationStatus || (selectedLocation ? `Location: ${selectedLocation.label} (${coordLabel(selectedLocation.lat, selectedLocation.lng)})` : "No location selected yet.")}
                </div>

                <button disabled={!selectedLocation} onClick={confirmLocation} style={{ width: "100%", padding: "10px 12px", background: selectedLocation ? BL.ink : BL.fill, color: selectedLocation ? "#fff" : BL.muted, border: `1px solid ${selectedLocation ? BL.ink : BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 700, cursor: selectedLocation ? "pointer" : "default" }}>
                  Confirm Location
                </button>
              </>
            )}

            {/* Step: Time */}
            {step === "time" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <label style={{ display: "grid", gap: 6, fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>
                    Date
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={e => setSelectedDate(e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, color: BL.ink, background: "#fff" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>
                    Time
                    <select
                      value={selectedTime}
                      onChange={e => setSelectedTime(e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, color: BL.ink, background: "#fff" }}
                    >
                      {DONATION_TIME_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={{ background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.faint, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                    Current selection
                  </div>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 700, color: BL.ink }}>
                    {selectedDateTimeLabel || "Choose a date and time"}
                  </div>
                </div>
                <button disabled={!selectedDate || !selectedTime} onClick={() => setStep("blood")} style={{ width: "100%", padding: "10px 12px", background: selectedDate && selectedTime ? BL.ink : BL.fill, color: selectedDate && selectedTime ? "#fff" : BL.muted, border: `1px solid ${selectedDate && selectedTime ? BL.ink : BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 700, cursor: selectedDate && selectedTime ? "pointer" : "default" }}>
                  Continue → Choose Blood Type
                </button>
              </div>
            )}

            {/* Step: Blood type */}
            {step === "blood" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
                  {BLOOD_TYPES.map(type => {
                    const active = selectedBloodTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleBloodType(type)}
                        style={{
                          minHeight: 44,
                          padding: "9px 8px",
                          background: active ? BL.ink : BL.fill,
                          color: active ? "#fff" : BL.ink,
                          border: `1px solid ${active ? BL.ink : BL.hair}`,
                          borderRadius: 6,
                          fontFamily: BL.sans,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>

                <div style={{ background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.faint, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                    Selected blood types
                  </div>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 700, color: BL.ink }}>
                    {selectedBloodTypeLabel}
                  </div>
                </div>

                <button onClick={() => setStep("review")} style={{ width: "100%", padding: "10px 12px", background: BL.ink, color: "#fff", border: `1px solid ${BL.ink}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Continue → Draft Invite
                </button>
              </div>
            )}

            {/* Step: Review */}
            {step === "review" && (
              <div>
                <div style={{ background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 8, padding: 14, fontFamily: BL.sans, fontSize: 13, color: BL.ink, lineHeight: 1.55, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Preview</div>
                  {ORGANIZER_NAME} is organising a blood drive at {group}, {selectedDateTimeLabel}. Inviting <b>{selectedBloodTypeLabel}</b> donors — {selectedBloodTypeLabel} is currently at <b>{inviteStatus}</b> nationally. Tap to RSVP — about 15 min.
                </div>
                <div style={{ background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 10 }}>
                    <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink }}><b>14 {selectedBloodTypeLabel}</b> eligible · {totalMembers} total members</span>
                    <span style={{ fontFamily: BL.mono, fontSize: 10, fontWeight: 700, color: BL.red, letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0 }}>need {TARGET_RSVPS} RSVPs</span>
                  </div>
                  <div style={{ height: 6, background: BL.fill, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: 0, background: BL.red, borderRadius: 3 }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => setStep("blood")} style={{ padding: "10px 12px", background: "#fff", color: BL.ink, border: `1px solid ${BL.ink}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                  <button onClick={send} style={{ padding: "10px 12px", background: BL.ink, color: "#fff", border: `1px solid ${BL.ink}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Send Invite</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function DonorDrivesPanel() {
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [sessionTab,   setSessionTab]   = useState("all");
  const [locationFilter, setLocationFilter] = useState("all"); // "all" | "nearby"
  const [userCoords,   setUserCoords]   = useState(null);
  const [locError,     setLocError]     = useState("");
  const [bookingState, setBookingState] = useState({});
  const [bookedId,     setBookedId]     = useState(null);
  const [squadItem,    setSquadItem]    = useState(null);

  useEffect(() => {
    loadAll();
    getMyBookings()
      .then(d => {
        const b = d.bookings?.[0];
        if (b) setBookedId(b.driveId ?? b.slotId ?? null);
      })
      .catch(() => {});
  }, []);

  async function loadAll() {
    setLoading(true); setError("");
    try {
      const [drivesRes, slotsRes] = await Promise.allSettled([
        getDrives(null),
        getSlots(null),
      ]);
      const drives = (drivesRes.status === "fulfilled" ? drivesRes.value.drives ?? [] : [])
        .map(d => ({ ...d, _id: d.driveId, _type: "drive" }));
      const slots  = (slotsRes.status  === "fulfilled" ? slotsRes.value.slots   ?? [] : [])
        .map(s => ({ ...s, _id: s.slotId,  _type: "slot"  }));
      const merged = [...drives, ...slots].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      setItems(merged);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function requestNearby() {
    if (!navigator.geolocation) { setLocError("Geolocation not supported by your browser."); return; }
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      pos => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationFilter("nearby"); },
      ()  => { setLocError("Location access denied. Enable it in browser settings."); }
    );
  }

  function handleFilterToggle(f) {
    if (f === "nearby") { requestNearby(); return; }
    setLocationFilter("all");
  }

  const tabItems = sessionTab === "all"
    ? items
    : items.filter(item => item._type === sessionTab);

  const displayItems = locationFilter === "nearby" && userCoords
    ? tabItems.filter(item => item.lat != null && item.lng != null && haversineKm(userCoords.lat, userCoords.lng, item.lat, item.lng) <= 5)
    : tabItems;

  const sessionCounts = useMemo(() => ({
    all: items.length,
    drive: items.filter(item => item._type === "drive").length,
    slot: items.filter(item => item._type === "slot").length,
  }), [items]);

  const isBooked = !!bookedId;

  async function book(item) {
    const id = item._id;
    setBookingState(prev => ({ ...prev, [id]: { loading: true } }));
    try {
      if (item._type === "slot") {
        await bookSlot(item._id);
      } else {
        await createBooking({ driveId: item._id, slotTime: new Date().toISOString() });
      }
      setBookingState(prev => ({ ...prev, [id]: { done: true } }));
      setBookedId(id);
    } catch (e) {
      setBookingState(prev => ({ ...prev, [id]: { error: e.message } }));
    }
  }

  function cancelBooking() { setBookedId(null); setBookingState({}); }

  function addHostedDrive(drive) { setItems(prev => [drive, ...prev]); }

  return (
    <div>
      <AppHeader
        sub={items.length > 0 ? `${items.length} available` : undefined}
        title="Book a session"
      />

      {/* Session type tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: `1px solid ${BL.hair}` }}>
        {SESSION_TABS.map(t => {
          const active = sessionTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSessionTab(t.id)}
              style={{
                padding: "9px 12px 8px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${active ? BL.red : "transparent"}`,
                fontFamily: BL.sans,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? BL.ink : BL.muted,
                cursor: "pointer",
              }}
            >
              {t.label}
              <span style={{ marginLeft: 6, fontFamily: BL.mono, fontSize: 10, color: active ? BL.red : BL.faint }}>
                {sessionCounts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active booking banner */}
      {isBooked && (
        <div style={{ background: BL.need.ok.bg, border: `1px solid ${BL.need.ok.fg}44`, borderRadius: 6, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>✓</span>
            <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>You have an active booking</span>
          </div>
          <button onClick={cancelBooking} style={{ background: "none", border: `1px solid ${BL.need.ok.fg}`, borderRadius: 5, color: BL.need.ok.fg, fontFamily: BL.sans, fontSize: 12, padding: "4px 12px", cursor: "pointer" }}>Cancel it</button>
        </div>
      )}

      {/* Location filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["all", "All"], ["nearby", "Within 5 km"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => handleFilterToggle(val)}
            style={{
              padding: "6px 16px", borderRadius: 20, fontFamily: BL.sans, fontSize: 12, cursor: "pointer",
              border: `1px solid ${locationFilter === val ? BL.ink : BL.hair}`,
              background: locationFilter === val ? BL.ink : "none",
              color: locationFilter === val ? "#fff" : BL.muted,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {locError && <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg, marginBottom: 10 }}>{locError}</div>}

      {loading && <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13, marginBottom: 12 }}>Loading…</div>}
      {error   && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {!loading && displayItems.length === 0 && (
        <div style={{ fontFamily: BL.sans, color: BL.faint, fontSize: 13, marginBottom: 12 }}>
          {locationFilter === "nearby" ? "No sessions within 5 km of your location." : `No upcoming ${sessionTab === "slot" ? "bloodbank slots" : sessionTab === "drive" ? "drives" : "sessions"} found.`}
        </div>
      )}

      {/* Host a Drive CTA */}
      {sessionTab !== "slot" && (
        <div style={{ marginBottom: 18 }}>
          <HostDriveBubble onInviteSent={addHostedDrive} />
        </div>
      )}

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {displayItems.map(item => {
          const pct          = item.capacity > 0 ? (item.booked / item.capacity) * 100 : 0;
          const almostFull   = pct > 80;
          const isThisBooked = bookedId === item._id;
          const isOtherBooked = isBooked && !isThisBooked;
          const bs           = bookingState[item._id] ?? {};
          const badge        = TYPE_BADGE[item._type] ?? TYPE_BADGE.drive;

          return (
            <div
              key={item._id}
              style={{
                background: isThisBooked ? BL.need.ok.bg : BL.card,
                border: `1px solid ${isThisBooked ? BL.need.ok.fg + "55" : BL.hair}`,
                borderRadius: 6, padding: 14,
                opacity: isOtherBooked ? 0.45 : 1,
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink, marginBottom: 4 }}>
                    {item.name ?? item.location}
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.4 }}>
                    {item.date}{item.startTime ? ` · ${item.startTime}` : ""} · {item.location}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 10, flexShrink: 0 }}>
                  {/* Type badge */}
                  <span style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700, background: badge.bg, color: badge.fg, padding: "2px 7px", borderRadius: 3 }}>
                    {badge.label}
                  </span>
                  {isThisBooked && <Tag color={BL.need.ok.fg} bg={`${BL.need.ok.fg}18`}>Booked</Tag>}
                </div>
              </div>

              {/* Capacity bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: almostFull ? BL.need.urgent.fg : BL.muted }}>
                    {item.booked ?? 0} / {item.capacity ?? "?"} slots
                  </span>
                  {almostFull && <span style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: BL.need.urgent.fg }}>Almost full</span>}
                </div>
                <div style={{ height: 4, background: BL.fill, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: isThisBooked ? BL.need.ok.fg : almostFull ? BL.need.urgent.fg : BL.ink, borderRadius: 2 }} />
                </div>
              </div>

              {/* Actions */}
              {isThisBooked ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.ok.fg, fontWeight: 600 }}>✓ You're booked — see you there!</span>
                  <button onClick={cancelBooking} style={{ background: "none", border: `1px solid ${BL.hair}`, borderRadius: 5, color: BL.muted, fontFamily: BL.sans, fontSize: 12, padding: "5px 12px", cursor: "pointer" }}>Cancel</button>
                </div>
              ) : isOtherBooked ? (
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.faint }}>Cancel your current booking to RSVP here</div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => book(item)}
                    disabled={bs.loading}
                    style={{ padding: "9px 20px", background: BL.ink, color: "#fff", border: "none", borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 600, cursor: bs.loading ? "default" : "pointer", opacity: bs.loading ? 0.5 : 1, minHeight: 38 }}
                  >
                    {bs.loading ? "Booking…" : "RSVP"}
                  </button>
                  <button
                    onClick={() => setSquadItem(item)}
                    style={{ padding: "9px 16px", background: "none", border: `1px solid ${BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, color: BL.ink, cursor: "pointer", minHeight: 38 }}
                  >
                    Squad RSVP
                  </button>
                  {bs.error && <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg }}>{bs.error}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Squad RSVP modal */}
      {squadItem && <SquadRsvpModal item={squadItem} onClose={() => setSquadItem(null)} />}
    </div>
  );
}
