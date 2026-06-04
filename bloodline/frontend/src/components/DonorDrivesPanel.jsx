import { useState, useEffect } from "react";
import { getDrives, createBooking } from "../api";
import { BL } from "../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function DonorDrivesPanel() {
  const [filter, setFilter] = useState("");
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingState, setBookingState] = useState({});

  useEffect(() => { loadDrives(""); }, []);

  async function loadDrives(bt) {
    setLoading(true);
    setError("");
    try {
      const data = await getDrives(bt || null);
      setDrives(data.drives ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFilter(bt) {
    setFilter(bt);
    loadDrives(bt);
  }

  async function book(driveId) {
    setBookingState(prev => ({ ...prev, [driveId]: { loading: true } }));
    try {
      const res = await createBooking({ driveId, slotTime: new Date().toISOString() });
      setBookingState(prev => ({ ...prev, [driveId]: { done: true, result: res } }));
    } catch (e) {
      setBookingState(prev => ({ ...prev, [driveId]: { error: e.message } }));
    }
  }

  return (
    <div>
      <div style={{ padding: "0 0 10px" }}>
        {drives.length > 0 && (
          <div style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: BL.muted, marginBottom: 2 }}>
            {drives.length} active
          </div>
        )}
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>
          Drives near you
        </div>
      </div>

      {/* Blood type filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <button
          onClick={() => handleFilter("")}
          style={{
            padding: "5px 14px", borderRadius: 20, fontFamily: BL.sans, fontSize: 12,
            cursor: "pointer", border: `1px solid ${filter === "" ? BL.ink : BL.hair}`,
            background: filter === "" ? BL.ink : "none",
            color: filter === "" ? "#fff" : BL.muted,
          }}
        >
          All types
        </button>
        {BLOOD_TYPES.map(bt => (
          <button
            key={bt}
            onClick={() => handleFilter(bt)}
            style={{
              padding: "5px 14px", borderRadius: 20, fontFamily: BL.mono, fontSize: 12,
              cursor: "pointer", border: `1px solid ${filter === bt ? BL.ink : BL.hair}`,
              background: filter === bt ? BL.fill : "none",
              color: filter === bt ? BL.ink : BL.muted,
            }}
          >
            {bt}
          </button>
        ))}
      </div>

      {loading && <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13 }}>Loading drives…</div>}
      {error && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13 }}>{error}</div>}
      {!loading && drives.length === 0 && (
        <div style={{ fontFamily: BL.sans, color: BL.faint, fontSize: 13 }}>No upcoming drives found.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {drives.map(drive => {
          const pct = drive.capacity > 0 ? (drive.booked / drive.capacity) * 100 : 0;
          const bs = bookingState[drive.driveId] ?? {};
          const almostFull = pct > 80;

          return (
            <div key={drive.driveId} style={{
              background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink, marginBottom: 4 }}>
                    {drive.name ?? drive.location}
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.4 }}>
                    {drive.date} · {drive.location}
                  </div>
                </div>
                {drive.acceptedBloodTypes?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", marginLeft: 10 }}>
                    {drive.acceptedBloodTypes.slice(0, 4).map(t => (
                      <span key={t} style={{
                        fontFamily: BL.mono, fontSize: 10, background: BL.fill,
                        borderRadius: 3, padding: "2px 6px", color: BL.ink2,
                      }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: almostFull ? BL.need.urgent.fg : BL.muted }}>
                    {drive.booked ?? 0} / {drive.capacity ?? "?"} slots
                  </span>
                  {almostFull && (
                    <span style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: BL.need.urgent.fg }}>
                      Almost full
                    </span>
                  )}
                </div>
                <div style={{ height: 4, background: BL.fill, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${Math.min(100, pct)}%`,
                    background: almostFull ? BL.need.urgent.fg : BL.ink,
                    borderRadius: 2,
                  }} />
                </div>
              </div>

              {bs.done ? (
                <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.ok.fg, fontWeight: 500 }}>
                  ✓ Booked — see you there!
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => book(drive.driveId)}
                    disabled={bs.loading}
                    style={{
                      padding: "8px 20px", background: BL.ink, color: "#fff",
                      border: "none", borderRadius: 6, fontFamily: BL.sans, fontSize: 13,
                      fontWeight: 600, cursor: "pointer", opacity: bs.loading ? 0.5 : 1,
                    }}
                  >
                    {bs.loading ? "Booking…" : "RSVP"}
                  </button>
                  {bs.error && (
                    <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg }}>{bs.error}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
