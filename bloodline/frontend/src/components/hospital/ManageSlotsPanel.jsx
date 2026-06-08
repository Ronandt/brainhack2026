import { useState, useEffect } from "react";
import { createSlot, getHospitalSlots, getSlotBookings } from "../../api";
import { BL } from "../../tokens";

// ── Operating hours per location (JS day index: 0=Sun … 6=Sat) ────────────
// null = closed; { open, close } = integer 24h hour bounds (close = last slot END hour)
const HOURS = {
  "Bloodbank@HSA": {
    0: { open: 9,  close: 16 }, // Sun  9 – 4:30pm → last block 15:00–16:00
    1: null,                     // Mon  closed
    2: { open: 9,  close: 17 }, // Tue  9 – 5pm
    3: { open: 9,  close: 17 }, // Wed
    4: { open: 9,  close: 17 }, // Thu
    5: { open: 9,  close: 17 }, // Fri
    6: { open: 9,  close: 16 }, // Sat  9 – 4:30pm → last block 15:00–16:00
  },
  "Bloodbank@Dhoby Ghaut": {
    0: { open: 10, close: 17 }, // Sun  10 – 5pm
    1: { open: 12, close: 20 }, // Mon  12 – 8pm
    2: { open: 12, close: 20 }, // Tue
    3: { open: 12, close: 20 }, // Wed
    4: null,                     // Thu  closed
    5: { open: 12, close: 20 }, // Fri
    6: { open: 10, close: 17 }, // Sat
  },
  "Bloodbank@Woodlands": {
    0: { open: 10, close: 17 },
    1: { open: 12, close: 20 }, // Mon
    2: null,                     // Tue  closed
    3: { open: 12, close: 20 }, // Wed
    4: { open: 12, close: 20 }, // Thu
    5: { open: 12, close: 20 }, // Fri
    6: { open: 10, close: 17 },
  },
  "Bloodbank@Westgate": {
    0: { open: 10, close: 17 },
    1: { open: 12, close: 20 }, // Mon
    2: { open: 12, close: 20 }, // Tue
    3: null,                     // Wed  closed
    4: { open: 12, close: 20 }, // Thu
    5: { open: 12, close: 20 }, // Fri
    6: { open: 10, close: 17 },
  },
  "Bloodbank@One Punggol": {
    0: { open: 10, close: 17 },
    1: { open: 12, close: 20 }, // Mon
    2: null,                     // Tue  closed
    3: { open: 12, close: 20 }, // Wed
    4: { open: 12, close: 20 }, // Thu
    5: { open: 12, close: 20 }, // Fri
    6: { open: 10, close: 17 },
  },
};

const SLOT_CAPACITY = 15;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad(n) { return String(n).padStart(2, "0"); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(dateStr, delta) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDateLabel(dateStr) {
  if (dateStr === todayISO()) return "Today";
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" });
}

function getDayOfWeek(dateStr) {
  return new Date(`${dateStr}T12:00:00`).getDay();
}

function generateBlocks(location, dateStr) {
  const h = HOURS[location]?.[getDayOfWeek(dateStr)];
  if (!h) return [];
  const blocks = [];
  for (let hour = h.open; hour < h.close; hour++) {
    blocks.push({ startTime: `${pad(hour)}:00`, endTime: `${pad(hour + 1)}:00` });
  }
  return blocks;
}

// ── Shared helpers ────────────────────────────────────────────────────────────
const labelStyle = {
  fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.6,
  textTransform: "uppercase", marginBottom: 6, display: "block",
};
const inputStyle = {
  width: "100%", padding: "9px 12px", border: `1px solid ${BL.hair}`, borderRadius: 6,
  fontFamily: BL.sans, fontSize: 14, color: BL.ink, background: BL.card,
  boxSizing: "border-box", outline: "none",
};
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const EMPTY_FORM = { name: "", date: "", startTime: "", endTime: "", capacity: "", notes: "" };

function StatusTag({ status }) {
  const map = {
    available: { bg: BL.need.ok.bg,      fg: BL.need.ok.fg },
    full:      { bg: BL.need.urgent.bg,   fg: BL.need.urgent.fg },
    cancelled: { bg: BL.need.critical.bg, fg: BL.need.critical.fg },
  };
  const c = map[status] ?? { bg: BL.fill, fg: BL.muted };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 3,
      fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase",
      background: c.bg, color: c.fg,
    }}>
      {status ?? "available"}
    </span>
  );
}

// ── Booking modal ─────────────────────────────────────────────────────────────
function BookingModal({ slot, dateStr, locationName, onClose }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!slot?.slotId) { setLoading(false); return; }
    getSlotBookings(slot.slotId)
      .then(d => setBookings(d.bookings ?? []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [slot?.slotId]);

  const booked    = slot.booked ?? 0;
  const capacity  = slot.capacity ?? SLOT_CAPACITY;
  const available = Math.max(0, capacity - booked);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: BL.card, borderRadius: 10, padding: 24,
          width: "100%", maxWidth: 460, maxHeight: "80vh",
          overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: BL.mono, fontSize: 16, fontWeight: 700, color: BL.ink }}>
              {slot.startTime} – {slot.endTime}
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 3 }}>
              {locationName} · {fmtDateLabel(dateStr)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 20, color: BL.muted, lineHeight: 1, padding: 4,
            }}
          >×</button>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
          {[{ l: "Booked", v: booked }, { l: "Capacity", v: capacity }, { l: "Available", v: available }].map(({ l, v }) => (
            <div key={l} style={{ background: BL.fill, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontFamily: BL.mono, fontSize: 20, fontWeight: 700, color: BL.ink }}>{v}</div>
              <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginTop: 2, letterSpacing: 0.4, textTransform: "uppercase" }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Donor list */}
        {loading && <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13 }}>Loading bookings…</div>}
        {!loading && bookings.length === 0 && (
          <div style={{ fontFamily: BL.sans, color: BL.faint, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            No bookings yet for this slot.
          </div>
        )}
        {!loading && bookings.length > 0 && (
          <>
            <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>
              Registered Donors · {bookings.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bookings.map((b, i) => (
                <div key={b.donorId ?? i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", background: BL.paper,
                  border: `1px solid ${BL.hair}`, borderRadius: 6,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18, background: BL.fill,
                    border: `1px solid ${BL.hair}`, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: BL.sans, fontSize: 14, fontWeight: 700, color: BL.ink,
                  }}>
                    {(b.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink }}>{b.name ?? "—"}</div>
                    {b.postalCode && (
                      <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 1 }}>
                        Postal {b.postalCode}
                      </div>
                    )}
                  </div>
                  <div style={{
                    background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 5,
                    padding: "4px 10px", fontFamily: BL.mono, fontSize: 13, fontWeight: 700, color: BL.ink,
                    flexShrink: 0,
                  }}>
                    {b.bloodType ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Bloodbank view: auto-generated time-block cards ───────────────────────────
function BloodbankView({ effectiveLoc, locations, onLocChange }) {
  const [dateStr,  setDateStr]  = useState(todayISO());
  const [apiSlots, setApiSlots] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [seeding,  setSeeding]  = useState(false);
  const [selected, setSelected] = useState(null);

  function loadSlots() {
    setLoading(true);
    getHospitalSlots()
      .then(d => setApiSlots(d.slots ?? []))
      .catch(() => setApiSlots([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSlots(); }, []);

  // Auto-seed missing slots for selected location + date
  useEffect(() => {
    if (loading || seeding) return;
    const blocks = generateBlocks(effectiveLoc, dateStr);
    if (!blocks.length) return;

    const existing   = apiSlots.filter(s => s.location === effectiveLoc && s.date === dateStr);
    const existingTs = new Set(existing.map(s => s.startTime));
    const missing    = blocks.filter(b => !existingTs.has(b.startTime));
    if (!missing.length) return;

    setSeeding(true);
    Promise.all(missing.map(b => createSlot({
      location: effectiveLoc,
      date: dateStr,
      startTime: b.startTime,
      endTime: b.endTime,
      capacity: SLOT_CAPACITY,
    })))
      .then(() => loadSlots())
      .catch(() => {})
      .finally(() => setSeeding(false));
  }, [loading, effectiveLoc, dateStr]);

  const blocks    = generateBlocks(effectiveLoc, dateStr);
  const isClosed  = blocks.length === 0;
  const locSlots  = apiSlots.filter(s => s.location === effectiveLoc && s.date === dateStr);

  const mergedSlots = blocks.map(b => {
    const api = locSlots.find(s => s.startTime === b.startTime) ?? {};
    return {
      startTime: b.startTime,
      endTime:   b.endTime,
      slotId:    api.slotId,
      booked:    api.booked   ?? 0,
      capacity:  api.capacity ?? SLOT_CAPACITY,
      status:    api.status   ?? "available",
    };
  });

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Location chips — no wrap, scroll */}
      <div style={{
        display: "flex", gap: 6, overflowX: "auto", marginBottom: 20,
        paddingBottom: 4, scrollbarWidth: "none", msOverflowStyle: "none",
      }}>
        {locations.map(loc => {
          const active = effectiveLoc === loc;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => { onLocChange(loc); setSelected(null); }}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 5, cursor: "pointer",
                fontFamily: BL.sans, fontSize: 13, fontWeight: active ? 600 : 400,
                background: active ? BL.ink : BL.fill,
                color: active ? "#fff" : BL.muted,
                border: `1px solid ${active ? BL.ink : BL.hair}`,
                whiteSpace: "nowrap",
              }}
            >
              {loc}
            </button>
          );
        })}
      </div>

      {/* Page header + date nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
            Manage Slots
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 2 }}>
            {effectiveLoc}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => { setDateStr(d => addDays(d, -1)); setSelected(null); }}
            style={{
              background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 5,
              width: 32, height: 32, cursor: "pointer", fontFamily: BL.sans,
              fontSize: 16, color: BL.ink, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >‹</button>
          <span style={{
            fontFamily: BL.mono, fontSize: 12, color: BL.ink,
            minWidth: 72, textAlign: "center", letterSpacing: 0.2,
          }}>
            {fmtDateLabel(dateStr)}
          </span>
          <button
            onClick={() => { setDateStr(d => addDays(d, 1)); setSelected(null); }}
            style={{
              background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 5,
              width: 32, height: 32, cursor: "pointer", fontFamily: BL.sans,
              fontSize: 16, color: BL.ink, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >›</button>
        </div>
      </div>

      {/* Loading / seeding states */}
      {(loading || seeding) && (
        <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13 }}>
          {loading ? "Loading slots…" : "Setting up today's slots…"}
        </div>
      )}

      {/* Closed message */}
      {!loading && isClosed && (
        <div style={{
          background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 8,
          padding: 32, textAlign: "center",
        }}>
          <div style={{ fontFamily: BL.sans, fontSize: 15, fontWeight: 600, color: BL.ink }}>
            Closed on {DAY_NAMES[getDayOfWeek(dateStr)]}
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6 }}>
            {effectiveLoc} does not operate on this day.
          </div>
        </div>
      )}

      {/* Slot card grid */}
      {!loading && !isClosed && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}>
          {mergedSlots.map(slot => {
            const pct      = slot.capacity > 0 ? Math.round((slot.booked / slot.capacity) * 100) : 0;
            const full     = slot.booked >= slot.capacity;
            const barColor = full ? BL.need.critical.fg : pct > 60 ? BL.need.urgent.fg : BL.need.ok.fg;
            const pending  = !slot.slotId;
            return (
              <div
                key={slot.startTime}
                onClick={() => !pending && setSelected(slot)}
                style={{
                  background: BL.card, border: `1px solid ${BL.hair}`,
                  borderRadius: 8, padding: 16,
                  cursor: pending ? "default" : "pointer",
                  opacity: pending ? 0.5 : 1,
                  transition: "box-shadow 0.12s, border-color 0.12s",
                }}
                onMouseEnter={e => {
                  if (!pending) {
                    e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.09)";
                    e.currentTarget.style.borderColor = BL.ink;
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = BL.hair;
                }}
              >
                <div style={{ fontFamily: BL.mono, fontSize: 13, fontWeight: 700, color: BL.ink, marginBottom: 12 }}>
                  {slot.startTime}<br />
                  <span style={{ fontWeight: 400, color: BL.muted }}>– {slot.endTime}</span>
                </div>

                <div style={{ height: 5, background: BL.fill, borderRadius: 3, marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, borderRadius: 3, background: barColor }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>
                    {slot.booked} / {slot.capacity}
                  </span>
                  <span style={{
                    fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: pending ? BL.faint : full ? BL.need.critical.fg : BL.need.ok.fg,
                  }}>
                    {pending ? "pending" : full ? "full" : "open"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking modal */}
      {selected && (
        <BookingModal
          slot={selected}
          dateStr={dateStr}
          locationName={effectiveLoc}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── SRC / manual view: create form + slot list ────────────────────────────────
function ManualView({ locationName }) {
  const [slots,      setSlots]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [selTypes,   setSelTypes]   = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState(null);
  const [selected,   setSelected]   = useState(null);

  function loadSlots() {
    setLoading(true);
    getHospitalSlots()
      .then(d => setSlots(d.slots ?? []))
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSlots(); }, []);

  function field(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function toggleType(t) { setSelTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]); }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true); setResult(null);
    try {
      await createSlot({
        name: form.name, location: locationName,
        date: form.date, startTime: form.startTime, endTime: form.endTime,
        capacity: parseInt(form.capacity, 10),
        acceptedBloodTypes: selTypes.length > 0 ? selTypes : BLOOD_TYPES,
        notes: form.notes,
      });
      setResult({ ok: true });
      setForm(EMPTY_FORM); setSelTypes([]);
      setShowCreate(false);
      loadSlots();
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  const total       = slots.length;
  const available   = slots.filter(s => s.status === "available").length;
  const totalBooked = slots.reduce((n, s) => n + (s.booked ?? 0), 0);

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 }}>
            Manage Slots
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted }}>
            {locationName} · donation time slots
          </div>
        </div>
        <button
          onClick={() => { setShowCreate(v => !v); setResult(null); }}
          style={{
            padding: "9px 18px", background: showCreate ? BL.fill : BL.ink,
            color: showCreate ? BL.ink : "#fff",
            border: `1px solid ${showCreate ? BL.hair : BL.ink}`,
            borderRadius: 6, fontFamily: BL.sans, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          {showCreate ? "Cancel" : "+ New slot"}
        </button>
      </div>

      {showCreate && (
        <div style={{ background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: BL.sans, fontSize: 15, fontWeight: 600, color: BL.ink, marginBottom: 16 }}>New donation slot</div>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Slot name</label>
              <input style={inputStyle} placeholder="e.g. Morning session · Jun 2026" value={form.name} onChange={e => field("name", e.target.value)} required />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Location</label>
              <div style={{ ...inputStyle, color: BL.muted, background: BL.fill, cursor: "default" }}>{locationName}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" style={inputStyle} value={form.date} onChange={e => field("date", e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Capacity</label>
                <input type="number" style={inputStyle} placeholder="e.g. 80" value={form.capacity} onChange={e => field("capacity", e.target.value)} min="1" required />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Start time</label>
                <input type="time" style={inputStyle} value={form.startTime} onChange={e => field("startTime", e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>End time</label>
                <input type="time" style={inputStyle} value={form.endTime} onChange={e => field("endTime", e.target.value)} required />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Accepted blood types</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 5 }}>
                {BLOOD_TYPES.map(t => {
                  const sel = selTypes.includes(t);
                  return (
                    <button key={t} type="button" onClick={() => toggleType(t)} style={{
                      padding: "5px 12px", borderRadius: 4, fontFamily: BL.mono, fontSize: 12, cursor: "pointer",
                      background: sel ? BL.ink : BL.fill, color: sel ? "#fff" : BL.ink,
                      border: `1px solid ${sel ? BL.ink : BL.hair}`,
                    }}>{t}</button>
                  );
                })}
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.faint }}>
                {selTypes.length === 0 ? "No selection = all types accepted" : `${selTypes.length} type${selTypes.length > 1 ? "s" : ""} selected`}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} placeholder="Special instructions, parking info…" value={form.notes} onChange={e => field("notes", e.target.value)} />
            </div>
            <button type="submit" disabled={submitting} style={{ padding: "11px 0", width: "100%", background: BL.ink, color: "#fff", border: "none", borderRadius: 6, fontFamily: BL.sans, fontSize: 14, fontWeight: 600, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Creating…" : "Create slot →"}
            </button>
            {result?.ok    && <div style={{ fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 13, marginTop: 12 }}>✓ Slot created.</div>}
            {result?.error && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, marginTop: 12 }}>{result.error}</div>}
          </form>
        </div>
      )}

      {!loading && !loadError && total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[{ l: "Total slots", v: total }, { l: "Available", v: available }, { l: "Bookings", v: totalBooked }].map(({ l, v }) => (
            <div key={l} style={{ background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 14 }}>
              <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
              <div style={{ fontFamily: BL.mono, fontSize: 24, fontWeight: 600, color: BL.ink }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {loading   && <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13 }}>Loading slots…</div>}
      {loadError && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13 }}>{loadError}</div>}
      {!loading && !loadError && total === 0 && (
        <div style={{ fontFamily: BL.sans, color: BL.faint, fontSize: 13 }}>No slots yet — create your first one above.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {slots.map(slot => {
          const pct = slot.capacity > 0 ? Math.round(((slot.booked ?? 0) / slot.capacity) * 100) : 0;
          const almostFull = pct > 80;
          return (
            <div
              key={slot.slotId}
              style={{
                background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 18,
                cursor: "pointer", transition: "border-color 0.12s",
              }}
              onClick={() => setSelected(slot)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = BL.ink; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BL.hair; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ fontFamily: BL.sans, fontWeight: 600, fontSize: 15, color: BL.ink }}>
                  {slot.location}{slot.startTime ? ` · ${slot.startTime}–${slot.endTime}` : ""}
                </div>
                <StatusTag status={slot.status} />
              </div>
              <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.4, marginBottom: 12 }}>
                {slot.date} · {slot.capacity} capacity
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: BL.mono, fontSize: 11, color: almostFull ? BL.need.urgent.fg : BL.muted, marginBottom: 4 }}>
                <span>{slot.booked ?? 0} / {slot.capacity} booked</span>
                <span>{pct}%</span>
              </div>
              <div style={{ height: 4, background: BL.fill, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, borderRadius: 2, background: almostFull ? BL.need.urgent.fg : BL.ink }} />
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <BookingModal
          slot={selected}
          dateStr={selected.date}
          locationName={locationName}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function ManageSlotsPanel({ locationName, locations }) {
  const multiLoc = Array.isArray(locations) && locations.length > 0;
  const [selectedLoc, setSelectedLoc] = useState(multiLoc ? locations[0] : null);
  const effectiveLoc = multiLoc ? selectedLoc : (locationName ?? "HSA Bloodbank");

  if (multiLoc) {
    return (
      <BloodbankView
        effectiveLoc={effectiveLoc}
        locations={locations}
        onLocChange={setSelectedLoc}
      />
    );
  }
  return <ManualView locationName={effectiveLoc} />;
}
