import { useState, useEffect, useMemo } from "react";
import { getDrives, getSlots, createBooking, bookSlot, getMyBookings } from "../api";
import { BL } from "../tokens";

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOOD_TYPES   = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const MOBILISE_OPTIONS = ["DBS - Group Tec", "NUS Alumni - CompSci", "Tampines East RC"];
const INVITE_STATUSES  = ["Critical", "High", "Low"];
const ORGANIZER_NAME   = "Bryan";
const TARGET_RSVPS     = 18;
const PER_PAGE         = 5;
const SLOT_WINDOWS     = { breakfast: [7, 8, 9], lunch: [11, 12, 13], "after work": [17, 18, 19] };
const SLOT_LABELS      = Object.keys(SLOT_WINDOWS);

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
function fmt(h, m = 0)    { return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }

function buildTimeOptions() {
  return Array.from({ length: 10 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + 1 + Math.floor(Math.random() * 5));
    const label = pickRandom(SLOT_LABELS);
    const hour  = pickRandom(SLOT_WINDOWS[label]);
    const dist  = (Math.random() * 11 + 1).toFixed(1);
    const site  = Math.random() > 0.5 ? "MOBILE UNIT ON SITE" : `BLOODBANK@HSA ${dist}KM`;
    return {
      id: `${date.toISOString().slice(0, 10)}-${label}-${hour}-${i}`,
      dateLabel: date.toLocaleDateString("en-SG", { weekday: "short", day: "2-digit", month: "short" }),
      time: `${label} • ${fmt(hour)}–${fmt(hour + 2, 30)}`,
      site,
    };
  });
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
  const [time,         setTime]         = useState("");
  const [page,         setPage]         = useState(0);
  const timeOptions    = useMemo(() => buildTimeOptions(), []);
  const inviteBloodType = useMemo(() => pickRandom(BLOOD_TYPES), []);
  const inviteStatus    = useMemo(() => pickRandom(INVITE_STATUSES), []);
  const totalMembers    = useMemo(() => 96 + Math.floor(Math.random() * 65), []);
  const pageCount       = Math.ceil(timeOptions.length / PER_PAGE);
  const visible         = timeOptions.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const selectedOpt     = timeOptions.find(o => o.id === time);

  function close() { setShow(false); setStep("group"); setPage(0); }
  function send()  {
    if (!selectedOpt) return;
    onInviteSent({ driveId: `hosted-${Date.now()}`, _type: "drive", name: `${group} blood drive`, date: selectedOpt.dateLabel, startTime: selectedOpt.time, location: selectedOpt.site, booked: 0, capacity: TARGET_RSVPS });
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
          <div style={{ width: "100%", maxWidth: 420, background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 8, boxShadow: "0 18px 48px rgba(26,25,23,0.18)", padding: 18 }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              {step !== "group" ? (
                <button onClick={() => setStep(step === "review" ? "time" : "group")} style={{ background: "none", border: "none", fontFamily: BL.sans, fontSize: 13, fontWeight: 600, color: BL.ink, cursor: "pointer", padding: 0 }}>← Back</button>
              ) : <div />}
              <button onClick={close} style={{ background: "none", border: "none", fontSize: 18, color: BL.muted, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.faint, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5 }}>
              {step === "group" ? "1" : step === "time" ? "2" : "3"}/3
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 700, color: BL.ink, marginBottom: 5 }}>
              {step === "group" ? "Who do you want to mobilise?" : step === "time" ? "When works for your team?" : "Review the invite"}
            </div>
            {step !== "review" && (
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, lineHeight: 1.45, marginBottom: 14 }}>
                {step === "group" ? "We'll send a one-tap invite to your squad." : `Suggested times based on ${group}`}
              </div>
            )}

            {/* Step: Group */}
            {step === "group" && (
              <>
                <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                  {MOBILISE_OPTIONS.map(o => (
                    <button key={o} onClick={() => setGroup(o)} style={{ width: "100%", padding: "10px 12px", background: group === o ? "#fff" : BL.fill, color: BL.ink, border: `1px solid ${group === o ? BL.ink : BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 600, textAlign: "left", cursor: "pointer" }}>{o}</button>
                  ))}
                </div>
                <button disabled={!group} onClick={() => { setPage(0); setStep("time"); }} style={{ width: "100%", padding: "10px 12px", background: group ? BL.ink : BL.fill, color: group ? "#fff" : BL.muted, border: `1px solid ${group ? BL.ink : BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 700, cursor: group ? "pointer" : "default" }}>
                  Continue → Set Time
                </button>
              </>
            )}

            {/* Step: Time */}
            {step === "time" && (
              <div>
                <div style={{ display: "grid", gap: 8 }}>
                  {visible.map(o => (
                    <button key={o.id} onClick={() => setTime(o.id)} style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12, padding: 12, background: time === o.id ? "#fff" : BL.fill, border: `1px solid ${time === o.id ? BL.ink : BL.hair}`, borderRadius: 6, cursor: "pointer", textAlign: "left" }}>
                      <span>
                        <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: BL.ink, marginBottom: 3 }}>{o.dateLabel}</span>
                        <span style={{ display: "block", fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>{o.time}</span>
                      </span>
                      <span style={{ fontFamily: BL.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: BL.red, whiteSpace: "nowrap" }}>{o.site}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 14 }}>
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: "6px 10px", background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 12, fontWeight: 600, color: page === 0 ? BL.faint : BL.ink, cursor: page === 0 ? "default" : "pointer" }}>Previous</button>
                  <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted }}>{page + 1} / {pageCount}</span>
                  <button disabled={page === pageCount - 1} onClick={() => setPage(p => p + 1)} style={{ padding: "6px 10px", background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 12, fontWeight: 600, color: page === pageCount - 1 ? BL.faint : BL.ink, cursor: page === pageCount - 1 ? "default" : "pointer" }}>Next</button>
                </div>
                <button disabled={!time} onClick={() => setStep("review")} style={{ width: "100%", padding: "10px 12px", background: time ? BL.ink : BL.fill, color: time ? "#fff" : BL.muted, border: `1px solid ${time ? BL.ink : BL.hair}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 700, cursor: time ? "pointer" : "default" }}>
                  Continue → Draft Invite
                </button>
              </div>
            )}

            {/* Step: Review */}
            {step === "review" && (
              <div>
                <div style={{ background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 8, padding: 14, fontFamily: BL.sans, fontSize: 13, color: BL.ink, lineHeight: 1.55, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Preview</div>
                  {ORGANIZER_NAME} is organising a blood drive at {selectedOpt?.dateLabel}, {selectedOpt?.time}, {selectedOpt?.site} — {inviteBloodType} is currently at <b>{inviteStatus}</b> nationally. Tap to RSVP — about 15 min.
                </div>
                <div style={{ background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 10 }}>
                    <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink }}><b>14 {inviteBloodType}</b> eligible · {totalMembers} total members</span>
                    <span style={{ fontFamily: BL.mono, fontSize: 10, fontWeight: 700, color: BL.red, letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0 }}>need {TARGET_RSVPS} RSVPs</span>
                  </div>
                  <div style={{ height: 6, background: BL.fill, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: 0, background: BL.red, borderRadius: 3 }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => setStep("time")} style={{ padding: "10px 12px", background: "#fff", color: BL.ink, border: `1px solid ${BL.ink}`, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Edit</button>
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

  const displayItems = locationFilter === "nearby" && userCoords
    ? items.filter(item => item.lat != null && item.lng != null && haversineKm(userCoords.lat, userCoords.lng, item.lat, item.lng) <= 5)
    : items;

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
          {locationFilter === "nearby" ? "No sessions within 5 km of your location." : "No upcoming sessions found."}
        </div>
      )}

      {/* Host a Drive CTA */}
      <div style={{ marginBottom: 18 }}>
        <HostDriveBubble onInviteSent={addHostedDrive} />
      </div>

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
