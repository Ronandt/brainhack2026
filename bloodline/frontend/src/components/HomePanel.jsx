import { useState, useEffect } from "react";
import { getDonor, getStatus, getDrives, createBooking } from "../api";
import { BL, riskToNeed } from "../tokens";

function Tag({ children, color, bg }) {
  return (
    <span style={{
      fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase",
      color: color || BL.muted,
      ...(bg ? { background: bg, padding: "2px 7px", borderRadius: 3 } : {}),
    }}>
      {children}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 8,
      padding: 16, marginBottom: 12, ...style,
    }}>
      {children}
    </div>
  );
}

export default function HomePanel() {
  const [donor, setDonor] = useState(null);
  const [status, setStatus] = useState(null);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingState, setBookingState] = useState({});

  useEffect(() => {
    Promise.allSettled([
      getDonor().then(setDonor),
      getStatus().then(setStatus),
      getDrives().then(d => setDrives(d.drives ?? [])),
    ]).finally(() => setLoading(false));
  }, []);

  const userType = donor?.bloodType;
  const typeStatus = status?.byBloodType?.find(t => t.bloodType === userType);
  const typeNeed = typeStatus ? riskToNeed(typeStatus.riskLevel) : "ok";

  async function bookDrive(driveId) {
    setBookingState(prev => ({ ...prev, [driveId]: { loading: true } }));
    try {
      const res = await createBooking({ driveId, slotTime: new Date().toISOString() });
      setBookingState(prev => ({ ...prev, [driveId]: { done: true, result: res } }));
    } catch (e) {
      setBookingState(prev => ({ ...prev, [driveId]: { error: e.message } }));
    }
  }

  if (loading) return <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13, padding: 4 }}>Loading…</div>;

  return (
    <div>
      {/* Eligibility card */}
      <Card>
        <Tag>{donor?.lastDonatedAt ? `Bloodline · ${donor.name ?? "donor"}` : "Bloodline"}</Tag>
        {donor?.eligible ? (
          <>
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
              <span style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
                You can donate
              </span>
              <span style={{
                fontFamily: BL.mono, fontSize: 11, color: BL.need.ok.fg,
                background: BL.need.ok.bg, padding: "2px 7px", borderRadius: 3,
              }}>NOW</span>
            </div>
            {donor.lastDonatedAt && (
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
                Last donation {donor.lastDonatedAt.slice(0, 10)} · whole blood
              </div>
            )}
          </>
        ) : donor ? (
          <>
            <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 6, letterSpacing: -0.3 }}>
              Not yet eligible
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
              {donor.daysUntilEligible ?? "—"} days remaining
              {donor.nextEligibleDate && ` · eligible from ${donor.nextEligibleDate}`}
            </div>
          </>
        ) : (
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6 }}>Sign in to see your eligibility.</div>
        )}
      </Card>

      {/* National need hero */}
      {status && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <Tag>{userType ? "Your type · National need" : "National need"}</Tag>
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 4 }}>
                Updated {status.asOf} · HSA
              </div>
            </div>
            <Tag color={BL.need[typeNeed].fg} bg={BL.need[typeNeed].bg}>
              {BL.need[typeNeed].label}
            </Tag>
          </div>

          {userType && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 8, flexShrink: 0,
                background: BL.need[typeNeed].bg,
                border: `2px solid ${BL.need[typeNeed].fg}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: BL.mono, fontSize: 15, fontWeight: 700, color: BL.need[typeNeed].fg,
              }}>
                {userType}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>
                  National status: {status.nationalStatus}
                </div>
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, lineHeight: 1.5, marginTop: 4 }}>
                  {typeNeed === "critical" || typeNeed === "urgent"
                    ? `${userType} supply is running low — your donation is urgently needed.`
                    : `Supply levels are monitored. Regular donations keep stocks healthy.`}
                </div>
              </div>
            </div>
          )}

          <button style={{
            width: "100%", padding: "11px 0", background: BL.ink, color: "#fff",
            border: "none", borderRadius: 6, fontFamily: BL.sans, fontSize: 14, fontWeight: 600,
            cursor: "pointer",
          }}>
            Book a slot →
          </button>
        </Card>
      )}

      {/* All blood types grid */}
      {status?.byBloodType && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Tag>All types</Tag>
            <Tag color={BL.faint}>tap for forecast</Tag>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 10 }}>
            {status.byBloodType.map(item => {
              const need = riskToNeed(item.riskLevel);
              const selected = item.bloodType === userType;
              return (
                <div key={item.bloodType} style={{
                  background: BL.need[need].bg,
                  border: `1.5px solid ${selected ? BL.need[need].fg : `${BL.need[need].fg}44`}`,
                  borderRadius: 5, padding: "8px 4px", textAlign: "center",
                  outline: selected ? `2px solid ${BL.need[need].fg}` : "none",
                  outlineOffset: 1,
                }}>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, fontWeight: 600, color: BL.ink }}>{item.bloodType}</div>
                  <div style={{ fontFamily: BL.mono, fontSize: 8, color: BL.need[need].fg, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    {BL.need[need].label}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 12, fontFamily: BL.mono, fontSize: 9 }}>
            {["ok", "low", "urgent", "critical"].map(n => (
              <span key={n} style={{ color: BL.need[n].fg }}>● {BL.need[n].label}</span>
            ))}
          </div>
        </Card>
      )}

      {/* Nearest availability — upcoming drives */}
      {drives.length > 0 && (
        <Card>
          <Tag>Nearest availability</Tag>
          <div style={{ marginTop: 10 }}>
            {drives.slice(0, 3).map((drive, i) => {
              const bs = bookingState[drive.driveId] ?? {};
              const pct = drive.capacity > 0 ? Math.round((drive.booked / drive.capacity) * 100) : 0;
              return (
                <div key={drive.driveId} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 0", borderTop: i > 0 ? `1px solid ${BL.hair}` : "none",
                }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>
                      {drive.name ?? drive.location}
                    </div>
                    <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 3, letterSpacing: 0.3 }}>
                      {drive.date} · {drive.location} · {pct}% booked
                    </div>
                  </div>
                  {bs.done ? (
                    <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.need.ok.fg, fontWeight: 600 }}>✓ Booked</span>
                  ) : bs.error ? (
                    <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.need.critical.fg }}>{bs.error}</span>
                  ) : (
                    <button
                      onClick={() => bookDrive(drive.driveId)}
                      disabled={bs.loading}
                      style={{
                        padding: "6px 16px", border: `1px solid ${BL.ink}`, borderRadius: 5,
                        background: "none", color: BL.ink, fontFamily: BL.sans, fontSize: 12,
                        fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                        opacity: bs.loading ? 0.5 : 1,
                      }}
                    >
                      {bs.loading ? "…" : "Book"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
