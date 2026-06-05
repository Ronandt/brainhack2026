import { useState, useEffect } from "react";
import { getDrives, createBooking, getMyBookings } from "../api";
import { BL } from "../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function AppHeader({ sub, title }) {
  return (
    <div style={{ padding: "0 0 10px" }}>
      {sub && (
        <div style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: BL.muted, marginBottom: 2 }}>
          {sub}
        </div>
      )}
      <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>
        {title}
      </div>
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

export default function DonorDrivesPanel() {
  const [filter,       setFilter]       = useState("");
  const [drives,       setDrives]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [bookingState, setBookingState] = useState({});
  const [bookedDriveId, setBookedDriveId] = useState(null); // from server

  useEffect(() => {
    loadDrives("");
    getMyBookings()
      .then(d => setBookedDriveId(d.bookings?.[0]?.driveId ?? null))
      .catch(() => {});
  }, []);

  async function loadDrives(bt) {
    setLoading(true); setError("");
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
      await createBooking({ driveId, slotTime: new Date().toISOString() });
      setBookingState(prev => ({ ...prev, [driveId]: { done: true } }));
      setBookedDriveId(driveId); // update local source of truth immediately
    } catch (e) {
      setBookingState(prev => ({ ...prev, [driveId]: { error: e.message } }));
    }
  }

  function cancelBooking() {
    // Optimistic clear — no cancel API yet, just removes local state
    setBookedDriveId(null);
    setBookingState({});
  }

  const isBooked = !!bookedDriveId;

  return (
    <div>
      <AppHeader
        sub={drives.length > 0 ? `${drives.length} active` : undefined}
        title="Drives near you"
      />

      {/* Active booking banner */}
      {isBooked && (
        <div style={{
          background: BL.need.ok.bg, border: `1px solid ${BL.need.ok.fg}44`,
          borderRadius: 6, padding: "10px 14px", marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>✓</span>
            <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>
              You have an active booking
            </span>
          </div>
          <button
            onClick={cancelBooking}
            style={{
              background: "none", border: `1px solid ${BL.need.ok.fg}`, borderRadius: 5,
              color: BL.need.ok.fg, fontFamily: BL.sans, fontSize: 12,
              padding: "4px 12px", cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Cancel it
          </button>
        </div>
      )}

      {/* Blood type filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
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
      {error   && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13 }}>{error}</div>}
      {!loading && drives.length === 0 && (
        <div style={{ fontFamily: BL.sans, color: BL.faint, fontSize: 13 }}>No upcoming drives found.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {drives.map(drive => {
          const pct         = drive.capacity > 0 ? (drive.booked / drive.capacity) * 100 : 0;
          const almostFull  = pct > 80;
          const isThisBooked = bookedDriveId === drive.driveId;
          const isOtherBooked = isBooked && !isThisBooked;
          const bs          = bookingState[drive.driveId] ?? {};

          return (
            <div
              key={drive.driveId}
              style={{
                background: isThisBooked ? BL.need.ok.bg : BL.card,
                border: `1px solid ${isThisBooked ? BL.need.ok.fg + "55" : BL.hair}`,
                borderRadius: 6, padding: 14,
                opacity: isOtherBooked ? 0.45 : 1,
              }}
            >
              {/* Drive header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink, marginBottom: 4 }}>
                    {drive.name ?? "Blood Drive"}
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.4 }}>
                    {drive.date}{drive.startTime ? ` · ${drive.startTime}` : ""} · {drive.location}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 10, flexShrink: 0 }}>
                  {isThisBooked && (
                    <Tag color={BL.need.ok.fg} bg={`${BL.need.ok.fg}18`}>Booked</Tag>
                  )}
                  {drive.acceptedBloodTypes?.slice(0, 3).map(t => (
                    <span key={t} style={{
                      fontFamily: BL.mono, fontSize: 10, background: BL.fill,
                      borderRadius: 3, padding: "2px 6px", color: BL.muted,
                    }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Capacity bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <Tag color={almostFull ? BL.need.urgent.fg : BL.muted}>
                    {drive.booked ?? 0} / {drive.capacity ?? "?"} slots
                  </Tag>
                  {almostFull && <Tag color={BL.need.urgent.fg}>Almost full</Tag>}
                </div>
                <div style={{ height: 4, background: BL.fill, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${Math.min(100, pct)}%`,
                    background: isThisBooked ? BL.need.ok.fg : almostFull ? BL.need.urgent.fg : BL.ink,
                    borderRadius: 2,
                  }} />
                </div>
              </div>

              {/* Action */}
              {isThisBooked ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.ok.fg, fontWeight: 600 }}>
                    ✓ You're booked — see you there!
                  </span>
                  <button
                    onClick={cancelBooking}
                    style={{
                      background: "none", border: `1px solid ${BL.hair}`, borderRadius: 5,
                      color: BL.muted, fontFamily: BL.sans, fontSize: 12,
                      padding: "5px 12px", cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : isOtherBooked ? (
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.faint }}>
                  Cancel your current booking to RSVP here
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => book(drive.driveId)}
                    disabled={bs.loading}
                    style={{
                      padding: "9px 22px", background: BL.ink, color: "#fff",
                      border: "none", borderRadius: 6, fontFamily: BL.sans, fontSize: 13,
                      fontWeight: 600, cursor: bs.loading ? "default" : "pointer",
                      opacity: bs.loading ? 0.5 : 1, minHeight: 38,
                    }}
                  >
                    {bs.loading ? "Booking…" : "RSVP"}
                  </button>
                  {bs.error && (
                    <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg }}>
                      {bs.error}
                    </span>
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
