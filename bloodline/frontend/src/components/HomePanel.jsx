import { useState, useEffect } from "react";
import { getDonor, getStatus, getDrives, createBooking, getSurgeMonitor } from "../api";
import { BL, riskToNeed } from "../tokens";

function AppHeader({ sub, title, right }) {
  return (
    <div style={{ padding: "0 0 10px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        {sub && (
          <div style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: BL.muted, marginBottom: 2 }}>
            {sub}
          </div>
        )}
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>
          {title}
        </div>
      </div>
      {right}
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

function Card({ children, style }) {
  return (
    <div style={{
      background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6,
      padding: 16, marginBottom: 10, ...style,
    }}>
      {children}
    </div>
  );
}

export default function HomePanel() {
  const [donor, setDonor] = useState(null);
  const [status, setStatus] = useState(null);
  const [drives, setDrives] = useState([]);
  const [surgeAlerts, setSurgeAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState(null);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  function fetchSurge() {
    getSurgeMonitor()
      .then(d => {
        const alerts = d.activeAlerts ?? [];
        console.log("[Surge] active alerts:", alerts);
        setSurgeAlerts(alerts);
      })
      .catch(err => console.error("[Surge] getSurgeMonitor failed:", err));
  }

  useEffect(() => {
    Promise.allSettled([
      getDonor().then(setDonor),
      getStatus().then(setStatus),
      getDrives().then(d => setDrives(d.drives ?? [])),
    ]).finally(() => setLoading(false));

    // Surge is fetched independently so a monitor error never blocks the main load
    fetchSurge();
    const id = setInterval(fetchSurge, 30_000);
    return () => clearInterval(id);
  }, []);

  const userType = donor?.bloodType;
  const typeStatus = status?.byBloodType?.find(t => t.bloodType === userType);
  const typeNeed = typeStatus ? riskToNeed(typeStatus.riskLevel) : "ok";

  // Show surge if:
  //   (a) exact blood-type match — donor can directly respond
  //   (b) island-wide surge — national emergency visible to all donors
  //       (they may not be the right type but the banner surfaces the crisis and
  //        the message will clarify which type is needed)
  const activeSurge = surgeAlerts.find(a =>
    a.bloodType === userType || a.geoTier === "island-wide"
  ) ?? null;

  async function confirmBooking() {
    if (!selectedDrive) return;
    setConfirming(true);
    setBookingError(null);
    try {
      await createBooking({ driveId: selectedDrive.driveId, slotTime: new Date().toISOString() });
      setScreen("success");
    } catch (e) {
      setBookingError(e.message);
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return (
    <div>
      <AppHeader sub="bloodline" title="Home" />
      <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13, padding: "8px 0" }}>Loading…</div>
    </div>
  );

  // ── Booking slot picker ──────────────────────────────────────────
  if (screen === "booking") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0 8px" }}>
          <button
            onClick={() => setScreen(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: BL.sans, fontSize: 13, color: BL.ink, padding: 0, fontWeight: 500 }}
          >
            ← Back
          </button>
          <Tag>{userType ? `Book · ${userType} whole blood` : "Book a slot"}</Tag>
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2, marginBottom: 4 }}>
          Choose a time
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 16, lineHeight: 1.5 }}>
          Pick a slot that works for you. We'll confirm with HSA instantly.
        </div>

        {drives.length === 0 ? (
          <Card>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted }}>No upcoming drives available.</div>
          </Card>
        ) : (
          drives.map(drive => {
            const pct = drive.capacity > 0 ? Math.round((drive.booked / drive.capacity) * 100) : 0;
            const slotsLeft = (drive.capacity ?? 0) - (drive.booked ?? 0);
            const sel = selectedDrive?.driveId === drive.driveId;
            return (
              <button
                key={drive.driveId}
                onClick={() => setSelectedDrive(drive)}
                style={{
                  width: "100%", textAlign: "left", background: BL.card,
                  border: `1.5px solid ${sel ? BL.ink : BL.hair}`, borderRadius: 6,
                  padding: 14, marginBottom: 8, cursor: "pointer",
                  outline: sel ? `2px solid ${BL.ink}` : "none", outlineOffset: -1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 600 }}>
                      {drive.name ?? drive.location}
                    </div>
                    <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 3, letterSpacing: 0.3 }}>
                      {drive.date} · {drive.location}
                    </div>
                    <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2, letterSpacing: 0.3 }}>
                      {pct}% booked · {slotsLeft} slots left
                    </div>
                  </div>
                  {sel && (
                    <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.need.ok.fg, fontWeight: 600, marginLeft: 8 }}>✓</span>
                  )}
                </div>
              </button>
            );
          })
        )}

        <button
          onClick={() => selectedDrive && setScreen("confirm")}
          disabled={!selectedDrive}
          style={{
            width: "100%", padding: "13px 0", marginTop: 4,
            background: selectedDrive ? BL.ink : BL.hair,
            color: selectedDrive ? "#fff" : BL.muted,
            border: "none", borderRadius: 8, fontFamily: BL.sans, fontSize: 14, fontWeight: 600,
            cursor: selectedDrive ? "pointer" : "default",
          }}
        >
          {selectedDrive ? `Continue with ${selectedDrive.name ?? selectedDrive.location}` : "Choose a slot"}
        </button>
      </div>
    );
  }

  // ── Booking confirm ──────────────────────────────────────────────
  if (screen === "confirm") {
    const drive = selectedDrive;
    const pct = drive.capacity > 0 ? Math.round((drive.booked / drive.capacity) * 100) : 0;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0 8px" }}>
          <button
            onClick={() => setScreen("booking")}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: BL.sans, fontSize: 13, color: BL.ink, padding: 0, fontWeight: 500 }}
          >
            ← Back
          </button>
          <Tag>Confirm</Tag>
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2, marginBottom: 16 }}>
          Confirm your slot
        </div>

        <Card>
          <Tag>When</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 16, color: BL.ink, fontWeight: 600, marginTop: 4 }}>
            {drive.date}
          </div>
          <div style={{ borderTop: `1px solid ${BL.hair}`, paddingTop: 12, marginTop: 12 }}>
            <Tag>Where</Tag>
            <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500, marginTop: 4 }}>
              {drive.name ?? drive.location}
            </div>
            <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2, letterSpacing: 0.3 }}>
              {drive.location} · {pct}% booked
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BL.hair}`, paddingTop: 12, marginTop: 12 }}>
            <Tag>Donation type</Tag>
            <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500, marginTop: 4 }}>
              Whole blood · 450 ml · ~15 minutes
            </div>
          </div>
        </Card>

        <Card style={{ background: BL.fill }}>
          <Tag>Quick check</Tag>
          <div style={{ marginTop: 8 }}>
            {[
              "Slept ≥ 5 hours last night",
              "Ate a meal in the last 3 hours",
              "Feeling well, no fever",
              "No recent travel to malaria-risk area",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 4, background: BL.ink,
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                }}>✓</div>
                <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink }}>{item}</span>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, lineHeight: 1.5, marginBottom: 16 }}>
          By confirming, you agree to HSA's donor terms. You can cancel up to 1 hour before your slot.
        </div>

        {bookingError && (
          <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg, marginBottom: 12 }}>
            {bookingError}
          </div>
        )}

        <button
          onClick={confirmBooking}
          disabled={confirming}
          style={{
            width: "100%", padding: "13px 0", background: BL.ink, color: "#fff",
            border: "none", borderRadius: 8, fontFamily: BL.sans, fontSize: 14, fontWeight: 600,
            cursor: confirming ? "default" : "pointer", opacity: confirming ? 0.7 : 1,
          }}
        >
          {confirming ? "Confirming…" : "Confirm booking"}
        </button>
      </div>
    );
  }

  // ── Booking success ──────────────────────────────────────────────
  if (screen === "success") {
    const drive = selectedDrive;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0" }}>
        <div style={{
          width: 88, height: 88, borderRadius: 44,
          background: BL.need.ok.bg, border: `2px solid ${BL.need.ok.fg}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: BL.sans, fontSize: 40, color: BL.need.ok.fg, fontWeight: 600,
        }}>✓</div>

        <div style={{ fontFamily: BL.sans, fontSize: 26, fontWeight: 600, color: BL.ink, marginTop: 22, letterSpacing: -0.6, textAlign: "center", lineHeight: 1.15 }}>
          You're booked.
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.muted, marginTop: 8, textAlign: "center", lineHeight: 1.5, maxWidth: 280 }}>
          See you at <b style={{ color: BL.ink }}>{drive?.name ?? drive?.location}</b> on <b style={{ color: BL.ink }}>{drive?.date}</b>.
        </div>

        <Card style={{ marginTop: 22, width: "100%" }}>
          <Tag>Your impact</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500, marginTop: 6, lineHeight: 1.5 }}>
            Your unit could reach <b style={{ color: BL.red }}>up to 3 patients</b>
            {(userType === "O-" || userType === "O−") ? " — and as O−, you can go to anyone in an emergency." : "."}
          </div>
        </Card>

        <button
          onClick={() => { setScreen(null); setSelectedDrive(null); }}
          style={{
            width: "100%", padding: "13px 0", background: BL.ink, color: "#fff",
            border: "none", borderRadius: 8, fontFamily: BL.sans, fontSize: 14, fontWeight: 600,
            cursor: "pointer", marginTop: 8,
          }}
        >
          Done
        </button>
      </div>
    );
  }

  // ── Main home screen ─────────────────────────────────────────────
  return (
    <div>
      {/* Page header — donor name + avatar */}
      <AppHeader
        sub="bloodline"
        title={donor?.name || "Home"}
        right={
          <div style={{
            width: 32, height: 32, borderRadius: 16, background: BL.fill,
            border: `1px solid ${BL.hair}`, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: BL.sans, fontSize: 13, fontWeight: 600, color: BL.ink,
          }}>
            {(donor?.name || "?").charAt(0).toUpperCase()}
          </div>
        }
      />

      {/* ── Live surge banner ── rendered only when HSA activates a surge for this blood type */}
      {activeSurge && (
        <div style={{
          background: BL.surgeBg, border: `2px solid ${BL.surge}`,
          borderRadius: 8, padding: "14px 16px", marginBottom: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Tag color={BL.surge} bg={`${BL.surge}18`}>Surge · {activeSurge.bloodType}</Tag>
            {activeSurge.geoTier && (
              <Tag color={BL.surge}>{activeSurge.geoTier}</Tag>
            )}
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 700, color: BL.surge, letterSpacing: -0.2, marginBottom: 4 }}>
            Your blood type is urgently needed
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, lineHeight: 1.5, marginBottom: 12 }}>
            {activeSurge.message || `${activeSurge.bloodType} blood supply is critically low. HSA is calling all eligible donors.`}
          </div>
          <button
            onClick={() => setScreen("booking")}
            style={{
              width: "100%", padding: "11px 0",
              background: BL.surge, color: "#fff",
              border: "none", borderRadius: 7, fontFamily: BL.sans,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Book a slot now →
          </button>
        </div>
      )}

      {/* Eligibility card */}
      <Card>
        <Tag>Eligibility</Tag>
        {donor?.eligible ? (
          <>
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
              <span style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
                You can donate
              </span>
              <span style={{
                fontFamily: BL.mono, fontSize: 11, color: BL.need.ok.fg,
                background: BL.need.ok.bg, padding: "2px 6px", borderRadius: 3,
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
          <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
            <span style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
              You can donate
            </span>
            <span style={{
              fontFamily: BL.mono, fontSize: 11, color: BL.need.ok.fg,
              background: BL.need.ok.bg, padding: "2px 6px", borderRadius: 3,
            }}>NOW</span>
          </div>
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
                width: 52, height: 52, borderRadius: 6, flexShrink: 0,
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

          <button
            onClick={() => setScreen("booking")}
            style={{
              width: "100%", padding: "11px 0", background: BL.ink, color: "#fff",
              border: "none", borderRadius: 8, fontFamily: BL.sans, fontSize: 14, fontWeight: 500,
              cursor: "pointer",
            }}
          >
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
                  borderRadius: 4, padding: "8px 4px", textAlign: "center",
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
          <div style={{ display: "flex", gap: 10, fontFamily: BL.mono, fontSize: 9 }}>
            {["ok", "low", "urgent", "critical"].map(n => (
              <span key={n} style={{ color: BL.need[n].fg }}>● {BL.need[n].label}</span>
            ))}
          </div>
        </Card>
      )}

      {/* Nearest availability */}
      {drives.length > 0 && (
        <Card>
          <Tag>Nearest availability</Tag>
          <div style={{ marginTop: 10 }}>
            {drives.slice(0, 3).map((drive, i) => {
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
                  <button
                    onClick={() => { setSelectedDrive(drive); setScreen("confirm"); }}
                    style={{
                      padding: "6px 14px", border: `1px solid ${BL.ink}`, borderRadius: 5,
                      background: "none", color: BL.ink, fontFamily: BL.sans, fontSize: 12,
                      fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    Book
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
