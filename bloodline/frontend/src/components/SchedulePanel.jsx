import { useState, useEffect } from "react";
import { getDrives, createBooking } from "../api";
import { BL } from "../tokens";

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const s = {
  pageTitle:  { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:    { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 20 },
  controls:   { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  select:     {
    background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "8px 12px", color: BL.ink, fontSize: 13, fontFamily: BL.sans, outline: "none",
  },
  btn:        {
    background: BL.ink, border: "none", borderRadius: 6, padding: "8px 16px",
    color: "#fff", fontSize: 13, fontFamily: BL.sans, fontWeight: 500, cursor: "pointer",
  },
  btnSmall:   {
    background: BL.ink, border: "none", borderRadius: 6, padding: "6px 14px",
    color: "#fff", fontSize: 13, fontFamily: BL.sans, fontWeight: 500, cursor: "pointer",
  },
  card:       { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 20, marginBottom: 10 },
  cardTitle:  { fontFamily: BL.sans, fontWeight: 600, fontSize: 15, color: BL.ink, marginBottom: 4 },
  cardMeta:   { fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginBottom: 12, letterSpacing: 0.4 },
  capacity:   { fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginBottom: 10 },
  barTrack:   { background: BL.fill, borderRadius: 3, height: 5, marginBottom: 12, overflow: "hidden" },
  barFill:    (pct) => ({
    height: "100%", width: `${Math.min(100, pct)}%`,
    background: pct > 80 ? BL.need.urgent.fg : BL.ink, borderRadius: 3,
  }),
  bookingRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  input:      {
    background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "7px 10px", color: BL.ink, fontSize: 13, fontFamily: BL.sans, outline: "none",
  },
  ok:         { fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 13, marginTop: 8 },
  err:        { fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, marginTop: 8 },
  empty:      { fontFamily: BL.sans, color: BL.faint, fontSize: 13 },
};

export default function SchedulePanel() {
  const [bloodTypeFilter, setBloodTypeFilter] = useState("");
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingState, setBookingState] = useState({});

  useEffect(() => { loadDrives(); }, []);

  async function loadDrives() {
    setLoading(true); setError("");
    try {
      const data = await getDrives(bloodTypeFilter || null);
      setDrives(data.drives ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function setSlot(driveId, slot) {
    setBookingState(prev => ({ ...prev, [driveId]: { ...prev[driveId], slot } }));
  }

  async function book(driveId) {
    const slot = bookingState[driveId]?.slot;
    if (!slot) return;
    setBookingState(prev => ({ ...prev, [driveId]: { ...prev[driveId], loading: true, result: null, error: null } }));
    try {
      const res = await createBooking({ driveId, slotTime: slot });
      setBookingState(prev => ({ ...prev, [driveId]: { ...prev[driveId], loading: false, result: res } }));
    } catch (e) {
      setBookingState(prev => ({ ...prev, [driveId]: { ...prev[driveId], loading: false, error: e.message } }));
    }
  }

  return (
    <div>
      <div style={s.pageTitle}>Blood Drives Near You</div>
      <div style={s.pageSub}>Find and book a slot at upcoming blood drives</div>

      <div style={s.controls}>
        <select style={s.select} value={bloodTypeFilter} onChange={e => setBloodTypeFilter(e.target.value)}>
          <option value="">All blood types</option>
          {BLOOD_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button style={s.btn} onClick={loadDrives}>Search</button>
      </div>

      {loading && <div style={s.empty}>Loading drives…</div>}
      {error && <div style={s.err}>{error}</div>}
      {!loading && drives.length === 0 && <div style={s.empty}>No upcoming drives found.</div>}

      {drives.map(drive => {
        const pct = drive.capacity > 0 ? (drive.booked / drive.capacity) * 100 : 0;
        const bs = bookingState[drive.driveId] ?? {};
        return (
          <div key={drive.driveId} style={s.card}>
            <div style={s.cardTitle}>{drive.name ?? "Blood Drive"}</div>
            <div style={s.cardMeta}>
              {drive.location} · {drive.date} · {drive.acceptedBloodTypes?.join(", ")}
            </div>
            <div style={s.capacity}>{drive.booked ?? 0} / {drive.capacity ?? "?"} slots booked</div>
            <div style={s.barTrack}><div style={s.barFill(pct)} /></div>

            {bs.result ? (
              <div style={s.ok}>✓ Booked for {bs.result.slotTime} — bring a friend!</div>
            ) : (
              <div style={s.bookingRow}>
                <input
                  style={s.input}
                  type="datetime-local"
                  value={bs.slot ?? ""}
                  onChange={e => setSlot(drive.driveId, e.target.value)}
                />
                <button style={s.btnSmall} onClick={() => book(drive.driveId)} disabled={bs.loading || !bs.slot}>
                  {bs.loading ? "Booking…" : "Book Slot"}
                </button>
              </div>
            )}
            {bs.error && <div style={s.err}>{bs.error}</div>}
          </div>
        );
      })}
    </div>
  );
}
