import { useState, useEffect, useMemo, useRef } from "react";
import { getDrives, getSlots, createBooking, bookSlot, cancelSlotBooking, getMyBookings } from "../api";
import { BL } from "../tokens";
import { BLOODBANK_COORDS, haversineKm, resolveCoords } from "../geo";

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

const BANK_INFO = {
  "Bloodbank@HSA": {
    address: "11 Outram Road, Singapore 169078",
    hours: { 0:"9:00am–4:30pm", 1:null, 2:"9:00am–5:00pm", 3:"9:00am–5:00pm", 4:"9:00am–5:00pm", 5:"9:00am–5:00pm", 6:"9:00am–4:30pm" },
  },
  "Bloodbank@Dhoby Ghaut": {
    address: "11 Orchard Road #B1-01, Singapore 238826",
    hours: { 0:"10:00am–5:00pm", 1:"12:00pm–8:00pm", 2:"12:00pm–8:00pm", 3:"12:00pm–8:00pm", 4:null, 5:"12:00pm–8:00pm", 6:"10:00am–5:00pm" },
  },
  "Bloodbank@Woodlands": {
    address: "900 South Woodlands Drive #05-07, Singapore 730900",
    hours: { 0:"10:00am–5:00pm", 1:"12:00pm–8:00pm", 2:null, 3:"12:00pm–8:00pm", 4:"12:00pm–8:00pm", 5:"12:00pm–8:00pm", 6:"10:00am–5:00pm" },
  },
  "Bloodbank@Westgate": {
    address: "1 Gateway Drive #10-01, Singapore 608531",
    hours: { 0:"10:00am–5:00pm", 1:"12:00pm–8:00pm", 2:"12:00pm–8:00pm", 3:null, 4:"12:00pm–8:00pm", 5:"12:00pm–8:00pm", 6:"10:00am–5:00pm" },
  },
  "Bloodbank@One Punggol": {
    address: "1 Punggol Drive #02-38, Singapore 828629",
    hours: { 0:"10:00am–5:00pm", 1:"12:00pm–8:00pm", 2:null, 3:"12:00pm–8:00pm", 4:"12:00pm–8:00pm", 5:"12:00pm–8:00pm", 6:"10:00am–5:00pm" },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickRandom(items) { return items[Math.floor(Math.random() * items.length)]; }
function coordLabel(lat, lng) { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }

function pad2(n) { return String(n).padStart(2, "0"); }
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function shiftDays(base, delta) {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function dateOptionLabel(iso) {
  const today = todayISO();
  const tomorrow = shiftDays(today, 1);
  if (iso === today) return "Today";
  if (iso === tomorrow) return "Tomorrow";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" });
}
function bankHoursToday(bankName) {
  const day = new Date().getDay();
  return BANK_INFO[bankName]?.hours?.[day] ?? null;
}
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

// ── Bloodbank picker — card grid of 5 banks ──────────────────────────────────
function BloodbankPicker({ allSlots, hasActiveBooking, onSelect }) {
  const today = todayISO();
  const banks = Object.keys(BANK_INFO);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {banks.map(name => {
        const info    = BANK_INFO[name];
        const hours   = bankHoursToday(name);
        const avail   = allSlots.filter(s => s.location === name && s.date === today && (s.booked ?? 0) < (s.capacity ?? 15)).length;
        const total   = allSlots.filter(s => s.location === name && s.date === today).length;
        const dimmed  = hasActiveBooking;

        return (
          <button
            key={name}
            onClick={() => !dimmed && onSelect(name)}
            style={{
              display: "flex", flexDirection: "column", width: "100%", textAlign: "left",
              background: BL.card, border: `1px solid ${BL.hair}`,
              borderRadius: 10, padding: "14px 16px",
              cursor: dimmed ? "default" : "pointer",
              opacity: dimmed ? 0.38 : 1,
              transition: "border-color 0.12s, box-shadow 0.12s, opacity 0.15s",
              minHeight: 102,
            }}
            onMouseEnter={e => { if (!dimmed) { e.currentTarget.style.borderColor = BL.ink; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.07)"; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BL.hair; e.currentTarget.style.boxShadow = "none"; }}
          >
            {/* Top row: info + slot count */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flex: 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: BL.sans, fontSize: 15, fontWeight: 700, color: BL.ink, marginBottom: 3 }}>
                  {name}
                </div>
                <div style={{
                  fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginBottom: 6,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {info.address}
                </div>
                <div style={{ fontFamily: BL.mono, fontSize: 10, color: hours ? BL.muted : BL.need.critical.fg, letterSpacing: 0.3 }}>
                  {hours ? `Today  ${hours}` : "Closed today"}
                </div>
              </div>
              {total > 0 && (
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontFamily: BL.mono, fontSize: 18, fontWeight: 700, color: avail > 0 ? BL.ink : BL.muted }}>
                    {avail}
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.4, textTransform: "uppercase" }}>
                    open
                  </div>
                </div>
              )}
            </div>
            {/* Progress bar always rendered to keep height consistent */}
            <div style={{ marginTop: 10, height: 3, background: BL.fill, borderRadius: 2, overflow: "hidden" }}>
              {total > 0 && (
                <div style={{ height: "100%", width: `${Math.round(100 - (avail / total) * 100)}%`, background: BL.ink, borderRadius: 2 }} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Bloodbank slot list — shown after a bank is selected ─────────────────────
function BloodbankSlotList({ bankName, dateStr, slots, booked, bookingState, onBook, onCancel }) {
  const [selected, setSelected] = useState(null);
  const info  = BANK_INFO[bankName] ?? {};
  const day   = new Date(`${dateStr}T12:00:00`).getDay();
  const hours = info.hours?.[day] ?? null;

  const sorted = [...slots].sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  const selSlot = sorted.find(s => s.slotId === selected);
  const isBooked   = selSlot ? !!booked[selSlot._id ?? selSlot.slotId] : false;
  const isFull     = selSlot ? (selSlot.booked ?? 0) >= (selSlot.capacity ?? 15) : false;
  const bs         = selSlot ? (bookingState[selSlot._id ?? selSlot.slotId] ?? {}) : {};

  return (
    <div>
      {/* Bank header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 18, fontWeight: 700, color: BL.ink, letterSpacing: -0.3 }}>
          {bankName}
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 2 }}>
          {info.address}
        </div>
        <div style={{ fontFamily: BL.mono, fontSize: 10, color: hours ? BL.muted : BL.need.critical.fg, marginTop: 4, letterSpacing: 0.3 }}>
          {hours ? hours : "Closed on this day"}
        </div>
      </div>

      {/* Slot list */}
      {sorted.length === 0 ? (
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.faint, padding: "20px 0" }}>
          No slots available for this day.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {sorted.map((slot, i) => {
            const cap      = slot.capacity ?? 15;
            const taken    = slot.booked ?? 0;
            const full     = taken >= cap;
            const thisId   = slot.slotId;
            const isSel    = selected === thisId;
            const alreadyBooked = !!booked[slot._id ?? slot.slotId];

            return (
              <button
                key={thisId}
                onClick={() => !full && !alreadyBooked && setSelected(isSel ? null : thisId)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  width: "100%", textAlign: "left",
                  background: isSel ? BL.ink : alreadyBooked ? BL.need.ok.bg : BL.card,
                  border: `1px solid ${isSel ? BL.ink : alreadyBooked ? BL.need.ok.fg + "55" : BL.hair}`,
                  borderRadius: 8, padding: "12px 14px",
                  cursor: full && !alreadyBooked ? "default" : "pointer",
                  opacity: full && !alreadyBooked ? 0.45 : 1,
                  transition: "background 0.1s, border-color 0.1s",
                }}
              >
                {/* Slot number */}
                <div style={{
                  width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                  background: isSel ? "rgba(255,255,255,0.15)" : BL.fill,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: BL.mono, fontSize: 11, fontWeight: 700,
                  color: isSel ? "#fff" : BL.muted,
                }}>
                  {i + 1}
                </div>

                {/* Time */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: BL.mono, fontSize: 14, fontWeight: 700, color: isSel ? "#fff" : BL.ink }}>
                    {slot.startTime}–{slot.endTime}
                  </div>
                  {alreadyBooked && (
                    <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.need.ok.fg, marginTop: 2 }}>
                      ✓ Booked
                    </div>
                  )}
                </div>

                {/* Capacity */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{
                    fontFamily: BL.mono, fontSize: 12, fontWeight: 600,
                    color: full ? BL.need.critical.fg : isSel ? "#fff" : BL.muted,
                  }}>
                    {taken}/{cap}
                  </div>
                  {full && (
                    <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.need.critical.fg, letterSpacing: 0.4, textTransform: "uppercase" }}>
                      Full
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Book button */}
      {selected && selSlot && (
        <div style={{
          position: "sticky", bottom: 80, left: 0, right: 0,
          background: BL.paper, paddingTop: 8,
          borderTop: `1px solid ${BL.hair}`,
        }}>
          {isBooked ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.ok.fg, fontWeight: 600 }}>
                ✓ Booked — {selSlot.startTime}–{selSlot.endTime}
              </span>
              <button
                onClick={() => { onCancel(selSlot._id ?? selSlot.slotId, "slot"); setSelected(null); }}
                style={{ background: "none", border: `1px solid ${BL.hair}`, borderRadius: 6, color: BL.muted, fontFamily: BL.sans, fontSize: 12, padding: "6px 14px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginBottom: 8 }}>
                Slot {sorted.indexOf(selSlot) + 1} · {selSlot.startTime}–{selSlot.endTime} · {(selSlot.capacity ?? 15) - (selSlot.booked ?? 0)} spots left
              </div>
              <button
                onClick={() => onBook({ ...selSlot, _id: selSlot.slotId, _type: "slot" })}
                disabled={bs.loading}
                style={{
                  width: "100%", padding: "13px 0", background: BL.ink, color: "#fff",
                  border: "none", borderRadius: 8, fontFamily: BL.sans,
                  fontSize: 15, fontWeight: 700, cursor: bs.loading ? "default" : "pointer",
                  opacity: bs.loading ? 0.6 : 1, minHeight: 50,
                }}
              >
                {bs.loading ? "Booking…" : "Book this slot →"}
              </button>
              {bs.error && <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg, marginTop: 6 }}>{bs.error}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Squad RSVP modal ──────────────────────────────────────────────────────────

function SquadRsvpModal({ item, onClose }) {
  const [copied, setCopied] = useState(false);
  const msg = `Hey squad! Let's donate blood together 🩸\n\n${item.name || item.location}\n${item.date}${item.startTime ? ` · ${item.startTime}` : ""}\n${item.location}\n\nRSVP here: <link>`;

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
    onInviteSent({ driveId: `hosted-${Date.now()}`, _type: "drive", name: `${group} blood drive`, date: selectedDateLabel, startTime: selectedTime, location: group, lat: selectedLocation?.lat, lng: selectedLocation?.lng, booked: 0, capacity: TARGET_RSVPS });
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
  const [locationFilter, setLocationFilter] = useState("all"); // "all" | radius km (5 | 10 | 15)
  const [userCoords,   setUserCoords]   = useState(null);
  const [locError,     setLocError]     = useState("");
  const [geoCache,     setGeoCache]     = useState({}); // location name → {lat,lng} | null
  const [bookingState, setBookingState] = useState({});
  const [booked,       setBooked]       = useState({}); // { [id]: "slot" | "drive" } — ALL of the donor's active bookings
  const [squadItem,    setSquadItem]    = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);
  const [bbDateStr,    setBbDateStr]    = useState(todayISO());

  // Generate next 7 date options for the bloodbank date filter
  const bbDateOptions = useMemo(() => {
    const base = todayISO();
    return Array.from({ length: 7 }, (_, i) => shiftDays(base, i));
  }, []);

  useEffect(() => {
    loadAll();
    refreshBookings();
    // Silently fetch geolocation on mount so distance sorting is ready immediately
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // ignore denial — distance sort simply won't apply
      );
    }
  }, []);

  // Track every booking the donor has, not just the first — otherwise already-booked
  // slots show "Book" and the server rejects with 409 "you already have a booking".
  function refreshBookings() {
    getMyBookings()
      .then(d => {
        const map = {};
        (d.bookings ?? []).forEach(b => {
          const id = b.slotId ?? b.driveId;
          if (id) map[id] = b.slotId ? "slot" : "drive";
        });
        setBooked(map);
      })
      .catch(() => {});
  }

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

  // Geocode drive location names (those not already placed by lat/lng or a known
  // blood bank) so drives also get a distance and sort by proximity.
  useEffect(() => {
    const pending = [...new Set(
      items
        .filter(it => it.location && it.lat == null && it.lng == null && !BLOODBANK_COORDS[it.location])
        .map(it => it.location)
    )].filter(loc => !(loc in geoCache));
    if (pending.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const loc of pending) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=sg&q=${encodeURIComponent(loc)}`);
          const data = res.ok ? await res.json() : [];
          if (cancelled) return;
          const hit = data[0];
          setGeoCache(prev => ({ ...prev, [loc]: hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null }));
        } catch {
          if (cancelled) return;
          setGeoCache(prev => ({ ...prev, [loc]: null }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [items, geoCache]);

  function requestNearby(radiusKm) {
    if (!navigator.geolocation) { setLocError("Geolocation not supported by your browser."); return; }
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      pos => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationFilter(radiusKm); },
      ()  => { setLocError("Location access denied. Enable it in browser settings."); }
    );
  }

  function handleFilterToggle(f) {
    if (f === "all") { setLocationFilter("all"); return; }
    // f is a radius in km — reuse the existing location fix if we already have one
    if (userCoords) { setLocationFilter(f); return; }
    requestNearby(f);
  }

  // When coords are available, sort everything by distance (nearest first).
  // Items with no lat/lng go at the end, sorted by date among themselves.
  const byDistance = (a, b) => {
    if (!userCoords) return 0;
    const dA = (a.lat != null && a.lng != null) ? haversineKm(userCoords.lat, userCoords.lng, a.lat, a.lng) : Infinity;
    const dB = (b.lat != null && b.lng != null) ? haversineKm(userCoords.lat, userCoords.lng, b.lat, b.lng) : Infinity;
    if (dA !== dB) return dA - dB;
    return (a.date ?? "").localeCompare(b.date ?? "");
  };

  const tabItems = (sessionTab === "all" ? items : items.filter(item => item._type === sessionTab))
    .slice().sort(byDistance);

  // Attach a distance (km) to each session from the donor's location, resolving
  // bloodbank slots via their location name.
  const itemsWithDistance = tabItems.map(item => {
    const coords = resolveCoords(item, geoCache);
    const distanceKm = (userCoords && coords)
      ? haversineKm(userCoords.lat, userCoords.lng, coords.lat, coords.lng)
      : null;
    return { ...item, _distanceKm: distanceKm };
  });

  const filteredItems = typeof locationFilter === "number" && userCoords
    ? itemsWithDistance.filter(item => item._distanceKm != null && item._distanceKm <= locationFilter)
    : itemsWithDistance;

  // Sort by proximity (nearest first) once we know where the donor is; sessions
  // with no resolvable location fall to the bottom. Otherwise keep date order.
  const displayItems = userCoords
    ? [...filteredItems].sort((a, b) => {
        if (a._distanceKm == null) return 1;
        if (b._distanceKm == null) return -1;
        return a._distanceKm - b._distanceKm;
      })
    : filteredItems;

  const sessionCounts = useMemo(() => ({
    all: items.length,
    drive: items.filter(item => item._type === "drive").length,
    slot: items.filter(item => item._type === "slot").length,
  }), [items]);

  const isBooked = Object.keys(booked).length > 0;

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
      setBooked(prev => ({ ...prev, [id]: item._type }));
    } catch (e) {
      // Server says it's already booked → reflect that so the user can cancel it
      if (e.message?.includes("already have a booking")) {
        setBooked(prev => ({ ...prev, [id]: item._type }));
        setBookingState(prev => { const n = { ...prev }; delete n[id]; return n; });
      } else {
        setBookingState(prev => ({ ...prev, [id]: { error: e.message } }));
      }
    }
  }

  async function cancelBooking(id, type) {
    // Slot bookings persist server-side — must be deleted there, or re-booking
    // hits "you already have a booking for this slot". Drive bookings are local-only.
    if (type === "slot" && id) {
      try {
        await cancelSlotBooking(id);
      } catch (e) {
        const gone = e.message?.includes("not found") || e.message?.includes("404");
        if (!gone) {
          // Real failure — keep the booking so the UI doesn't lie about state
          setBookingState(prev => ({ ...prev, [id]: { error: e.message } }));
          return;
        }
        // 404 → already cancelled server-side; fall through and clear local state
      }
    }
    setBooked(prev => { const next = { ...prev }; delete next[id]; return next; });
    setBookingState(prev => { const next = { ...prev }; delete next[id]; return next; });
    loadAll(); // re-sync slot capacity counts
  }

  function addHostedDrive(drive) { setItems(prev => [drive, ...prev]); }

  return (
    <div>
      <AppHeader
        sub={items.length > 0 ? `${items.length} available` : undefined}
        title="Book a session"
      />

      {/* ── Sticky header: tabs + filters ───────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: BL.paper,
        marginLeft: -16, marginRight: -16, padding: "0 16px",
        paddingBottom: 10,
        borderBottom: `1px solid ${BL.hair}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}>
        {/* Session type tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, borderBottom: `1px solid ${BL.hair}` }}>
          {SESSION_TABS.map(t => {
            const active = sessionTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSessionTab(t.id)}
                style={{
                  padding: "9px 12px 8px", background: "none", border: "none",
                  borderBottom: `2px solid ${active ? BL.red : "transparent"}`,
                  fontFamily: BL.sans, fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? BL.ink : BL.muted, cursor: "pointer",
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

        {/* Filter row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {sessionTab === "slot" && selectedBank && (
            <button
              onClick={() => setSelectedBank(null)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontFamily: BL.sans, fontSize: 12, cursor: "pointer",
                border: `1px solid ${BL.hair}`, background: "none", color: BL.muted,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              ← Back
            </button>
          )}
          {sessionTab !== "slot" && [["all", "All"], [5, "Within 5 km"], [10, "Within 10 km"], [15, "Within 15 km"]].map(([val, label]) => (
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
          {sessionTab === "slot" && selectedBank && (
            <select
              value={bbDateStr}
              onChange={e => setBbDateStr(e.target.value)}
              style={{
                padding: "6px 16px", borderRadius: 20, fontFamily: BL.sans, fontSize: 12, cursor: "pointer",
                border: `1px solid ${BL.hair}`, background: "none", color: BL.muted,
                appearance: "none", WebkitAppearance: "none", outline: "none",
              }}
            >
              {bbDateOptions.map(iso => (
                <option key={iso} value={iso}>{dateOptionLabel(iso)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Scrollable content starts here */}
      <div style={{ paddingTop: 14 }}>

      {/* Active booking banner */}
      {isBooked && (
        <div style={{ background: BL.need.ok.bg, border: `1px solid ${BL.need.ok.fg}44`, borderRadius: 6, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>✓</span>
            <div>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>You have an active booking</div>
              <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.muted, marginTop: 1 }}>Cancel to change your appointment</div>
            </div>
          </div>
          <button onClick={cancelBooking} style={{ background: "none", border: `1px solid ${BL.need.ok.fg}`, borderRadius: 5, color: BL.need.ok.fg, fontFamily: BL.sans, fontSize: 12, padding: "4px 12px", cursor: "pointer", flexShrink: 0 }}>Cancel it</button>
        </div>
      )}

      {locError && <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg, marginBottom: 10 }}>{locError}</div>}

      {loading && <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13, marginBottom: 12 }}>Loading…</div>}
      {error   && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {/* ── Bloodbank tab ───────────────────────────────────────────── */}
      {sessionTab === "slot" && (
        selectedBank ? (
          <BloodbankSlotList
            bankName={selectedBank}
            dateStr={bbDateStr}
            slots={items.filter(s => s._type === "slot" && s.location === selectedBank && s.date === bbDateStr)}
            booked={booked}
            bookingState={bookingState}
            onBook={book}
            onCancel={cancelBooking}
          />
        ) : (
          <BloodbankPicker
            allSlots={items.filter(s => s._type === "slot")}
            hasActiveBooking={isBooked}
            onSelect={bank => { setSelectedBank(bank); setBbDateStr(todayISO()); }}
          />
        )
      )}

      {/* ── Drives / All tab ────────────────────────────────────────── */}
      {sessionTab !== "slot" && (
        <>
          {!loading && displayItems.length === 0 && (
            <div style={{ fontFamily: BL.sans, color: BL.faint, fontSize: 13, marginBottom: 12 }}>
              {typeof locationFilter === "number" ? `No sessions within ${locationFilter} km of your location.` : "No upcoming sessions found."}
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <HostDriveBubble onInviteSent={addHostedDrive} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displayItems.map(item => {
              const pct           = item.capacity > 0 ? (item.booked / item.capacity) * 100 : 0;
              const almostFull    = pct > 80;
              const isThisBooked  = !!booked[item._id];
              const isOtherBooked = isBooked && !isThisBooked;
              const bs            = bookingState[item._id] ?? {};
              const badge         = TYPE_BADGE[item._type] ?? TYPE_BADGE.drive;

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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink, marginBottom: 2 }}>
                        {item.name || item.location}
                      </div>
                      {item.name && item.location && (
                        <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginBottom: 2 }}>{item.location}</div>
                      )}
                      <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.4 }}>
                        {item.date}{item.startTime ? ` · ${item.startTime}${item.endTime ? `–${item.endTime}` : ""}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 10, flexShrink: 0 }}>
                      <span style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700, background: badge.bg, color: badge.fg, padding: "2px 7px", borderRadius: 3 }}>
                        {badge.label}
                      </span>
                      {isThisBooked && <Tag color={BL.need.ok.fg} bg={`${BL.need.ok.fg}18`}>Booked</Tag>}
                    </div>
                  </div>
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
                  {isThisBooked ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.ok.fg, fontWeight: 600 }}>✓ You're booked — see you there!</span>
                      <button onClick={() => cancelBooking(item._id, item._type)} style={{ background: "none", border: `1px solid ${BL.hair}`, borderRadius: 5, color: BL.muted, fontFamily: BL.sans, fontSize: 12, padding: "5px 12px", cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : isOtherBooked ? (
                    <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.faint }}>Cancel your current booking to {item._type === "slot" ? "book" : "RSVP"} here</div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button onClick={() => book(item)} disabled={bs.loading} style={{ padding: "9px 20px", background: BL.ink, color: "#fff", border: "none", borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 600, cursor: bs.loading ? "default" : "pointer", opacity: bs.loading ? 0.5 : 1, minHeight: 38 }}>
                        {bs.loading ? "Booking…" : "RSVP"}
                      </button>
                      <button onClick={() => setSquadItem(item)} style={{ padding: "9px 16px", background: "none", border: `1px solid ${BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, color: BL.ink, cursor: "pointer", minHeight: 38 }}>
                        Squad RSVP
                      </button>
                      {bs.error && <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg }}>{bs.error}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Squad RSVP modal */}
      {squadItem && <SquadRsvpModal item={squadItem} onClose={() => setSquadItem(null)} />}
      </div>{/* end scrollable content */}
    </div>
  );
}
