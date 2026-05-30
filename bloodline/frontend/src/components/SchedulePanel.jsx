import { useState, useEffect } from "react";
import { getDrives, createBooking } from "../api";

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const s = {
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#666", fontSize: 13, marginBottom: 20 },
  controls: { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  select: { background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "8px 12px", color: "#f0f0f0", fontSize: 14 },
  btn: { background: "#c0392b", border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnSmall: { background: "#c0392b", border: "none", borderRadius: 6, padding: "6px 14px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  card: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 12 },
  cardTitle: { fontWeight: 700, fontSize: 16, marginBottom: 4 },
  cardMeta: { color: "#888", fontSize: 12, marginBottom: 12 },
  capacity: { fontSize: 12, color: "#666", marginBottom: 12 },
  bar: { background: "#2a2a2a", borderRadius: 4, height: 6, marginBottom: 12, overflow: "hidden" },
  barFill: (pct) => ({ height: "100%", width: `${Math.min(100, pct)}%`, background: pct > 80 ? "#e67e22" : "#c0392b", borderRadius: 4 }),
  bookingRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  input: { background: "#111", border: "1px solid #333", borderRadius: 6, padding: "7px 10px", color: "#f0f0f0", fontSize: 13 },
  ok: { color: "#2ecc71", fontSize: 13, marginTop: 8 },
  err: { color: "#e74c3c", fontSize: 13, marginTop: 8 },
  empty: { color: "#555", fontSize: 13 },
};

export default function SchedulePanel() {
  const [bloodTypeFilter, setBloodTypeFilter] = useState("");
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingState, setBookingState] = useState({});  // { [driveId]: { slot, loading, result, error } }

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
      <div style={s.title}>Blood Drives Near You</div>
      <div style={s.sub}>Find and book a slot at upcoming blood drives</div>

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
            <div style={s.bar}><div style={s.barFill(pct)} /></div>

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
