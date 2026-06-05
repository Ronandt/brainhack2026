import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { getDonor, getStatus, getDrives, createBooking, getSurgeMonitor, getMyBookings } from "../api";
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

function TimelineNode({ dot, line, tag, answer, answerColor, sub, children, last }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: last ? 0 : 20 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 5, flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: dot ?? BL.ink }} />
        {line && <div style={{ width: 1, flex: 1, background: BL.hair, marginTop: 5, minHeight: 60 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: line ? 8 : 0 }}>
        <Tag>{tag}</Tag>
        {answer && (
          <div style={{
            fontFamily: BL.sans, fontSize: 28, fontWeight: 600,
            color: answerColor ?? BL.ink, letterSpacing: -0.6, lineHeight: 1.1, marginTop: 2,
          }}>
            {answer}
          </div>
        )}
        {sub && (
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6, lineHeight: 1.5 }}>
            {sub}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default function HomePanel() {
  const [donor, setDonor] = useState(null);
  const [status, setStatus] = useState(null);
  const [drives, setDrives] = useState([]);
  const [surgeAlerts, setSurgeAlerts] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null); // confirmed upcoming booking from server
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState(null);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});

  // Surge snooze — localStorage is fine for a UI preference (not data)
  const [snoozedUntil, setSnoozedUntil] = useState(
    () => parseInt(localStorage.getItem("surgeSnoozedUntil") ?? "0")
  );

  function handleSnooze() {
    const until = Date.now() + 2 * 60 * 60 * 1000;
    localStorage.setItem("surgeSnoozedUntil", String(until));
    setSnoozedUntil(until);
  }

  function fetchBookings() {
    getMyBookings()
      .then(d => setActiveBooking(d.bookings?.[0] ?? null))
      .catch(() => setActiveBooking(null));
  }

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

    fetchBookings();
    fetchSurge();
    const id = setInterval(fetchSurge, 30_000);
    return () => clearInterval(id);
  }, []);

  const userType = donor?.bloodType;
  const typeStatus = status?.byBloodType?.find(t => t.bloodType === userType);
  const typeNeed = typeStatus ? riskToNeed(typeStatus.riskLevel) : "ok";

  // Active surge: hidden if snoozed OR donor already has a confirmed booking
  const isSnoozed = Date.now() < snoozedUntil;
  const activeSurge = (isSnoozed || activeBooking) ? null : (surgeAlerts.find(a =>
    a.bloodType === userType || a.geoTier === "island-wide"
  ) ?? null);

  // Greeting — used across booked screen, surge screen, and timeline
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";
  const firstName = donor?.name?.split(" ")[0] ?? null;

  async function confirmBooking() {
    if (!selectedDrive) return;
    setConfirming(true);
    setBookingError(null);
    try {
      await createBooking({ driveId: selectedDrive.driveId, slotTime: new Date().toISOString() });
      fetchBookings(); // pull the confirmed booking from the server — this gates surge + home screen
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
    const timeRange = drive.startTime && drive.endTime
      ? `${drive.startTime}–${drive.endTime}`
      : drive.startTime ?? "";

    const CHECK_ITEMS = [
      "Slept ≥ 5 hours last night",
      "Ate a meal in the last 3 hours",
      "Feeling well, no fever",
      "No recent travel to malaria-risk area",
    ];
    const allChecked = CHECK_ITEMS.every((_, i) => checkedItems[i]);

    function toggleCheck(i) {
      setCheckedItems(prev => ({ ...prev, [i]: !prev[i] }));
    }

    return (
      <div>
        {/* Back nav — 44px tall for touch */}
        <button
          onClick={() => setScreen("booking")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: BL.sans, fontSize: 13, color: BL.ink,
            padding: "12px 0 8px", fontWeight: 500, display: "flex",
            alignItems: "center", gap: 6, minHeight: 44,
          }}
        >
          ← Back
        </button>

        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2, marginBottom: 16 }}>
          Confirm your slot
        </div>

        {/* Drive details */}
        <Card>
          <Tag>When</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink, marginTop: 4 }}>
            {drive.date}{timeRange ? ` · ${timeRange}` : ""}
          </div>

          <div style={{ borderTop: `1px solid ${BL.hair}`, paddingTop: 12, marginTop: 12 }}>
            <Tag>Where</Tag>
            <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink, marginTop: 4 }}>
              {drive.name ?? drive.location}
            </div>
            <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 3, letterSpacing: 0.3 }}>
              {drive.location}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${BL.hair}`, paddingTop: 12, marginTop: 12 }}>
            <Tag>Donation type</Tag>
            <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink, marginTop: 4 }}>
              Whole blood
            </div>
            <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 3, letterSpacing: 0.3 }}>
              450 ml · ~15 minutes
            </div>
          </div>
        </Card>

        {/* Quick check — tappable, all must be checked */}
        <Card style={{ background: BL.fill }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Tag>Quick check</Tag>
            {!allChecked && (
              <Tag color={BL.muted}>{CHECK_ITEMS.filter((_, i) => checkedItems[i]).length}/{CHECK_ITEMS.length}</Tag>
            )}
            {allChecked && <Tag color={BL.need.ok.fg}>All good ✓</Tag>}
          </div>
          {CHECK_ITEMS.map((item, i) => {
            const checked = !!checkedItems[i];
            return (
              <button
                key={i}
                onClick={() => toggleCheck(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", textAlign: "left",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "10px 0",
                  borderTop: i > 0 ? `1px solid ${BL.hair}` : "none",
                  minHeight: 44,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: checked ? BL.ink : BL.card,
                  border: `1.5px solid ${checked ? BL.ink : BL.rule}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 12, fontWeight: 700,
                  transition: "background 0.15s, border-color 0.15s",
                }}>
                  {checked ? "✓" : ""}
                </div>
                <span style={{
                  fontFamily: BL.sans, fontSize: 14, lineHeight: 1.4,
                  color: checked ? BL.ink : BL.muted,
                }}>
                  {item}
                </span>
              </button>
            );
          })}
        </Card>

        <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, lineHeight: 1.5, marginBottom: 16 }}>
          By confirming, you agree to HSA's donor terms. You can cancel up to 1 hour before your slot.
        </div>

        {bookingError && (
          <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg, marginBottom: 12 }}>
            {bookingError}
          </div>
        )}

        {!allChecked && (
          <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, textAlign: "center", marginBottom: 8, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Tick all boxes to confirm
          </div>
        )}

        <button
          onClick={confirmBooking}
          disabled={confirming || !allChecked}
          style={{
            width: "100%", padding: "15px 0",
            background: !allChecked ? BL.hair : BL.ink,
            color: !allChecked ? BL.muted : "#fff",
            border: "none", borderRadius: 8, fontFamily: BL.sans, fontSize: 14, fontWeight: 600,
            cursor: confirming || !allChecked ? "default" : "pointer",
            opacity: confirming ? 0.7 : 1,
            minHeight: 50,
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

  // ── QR check-in screen ───────────────────────────────────────────
  if (screen === "arrived" && activeBooking) {
    const drive = activeBooking.drive ?? {};
    const timeRange = drive.startTime
      ? `${drive.startTime}${drive.endTime ? `–${drive.endTime}` : ""}`
      : null;
    const qrValue = donor?.donorId ?? "unknown";

    return (
      <div>
        <button
          onClick={() => setScreen(null)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: BL.sans, fontSize: 13, color: BL.ink,
            padding: "12px 0 8px", fontWeight: 500, minHeight: 44,
          }}
        >
          ← Back
        </button>

        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, marginBottom: 4 }}>
          Show this to staff
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 20 }}>
          Staff will scan your code to check you in.
        </div>

        {/* QR code */}
        <div style={{
          background: "#fff", border: `1px solid ${BL.hair}`, borderRadius: 10,
          padding: 24, display: "flex", justifyContent: "center",
          marginBottom: 16,
        }}>
          <QRCode value={qrValue} size={220} fgColor={BL.ink} bgColor="#ffffff" />
        </div>

        {/* Drive details */}
        <div style={{
          background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6,
          padding: 16, marginBottom: 10,
        }}>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>
            Your booking
          </div>
          {[
            { l: "Drive",    v: drive.name ?? drive.location ?? "—" },
            { l: "When",     v: drive.date ? `${drive.date}${timeRange ? ` · ${timeRange}` : ""}` : "—" },
            { l: "Location", v: drive.location ?? "—" },
          ].map(({ l, v }, i) => (
            <div key={l} style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              padding: "9px 0", borderTop: i > 0 ? `1px solid ${BL.hair}` : "none", gap: 12,
            }}>
              <span style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0 }}>{l}</span>
              <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Donor identity */}
        <div style={{
          background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 6,
          padding: 16,
        }}>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>
            Donor
          </div>
          {[
            { l: "Donor ID",   v: donor?.donorId ?? "—", mono: true },
            { l: "Blood type", v: donor?.bloodType ?? "—", mono: true, bold: true },
          ].map(({ l, v, mono, bold }, i) => (
            <div key={l} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderTop: i > 0 ? `1px solid ${BL.hair}` : "none",
            }}>
              <span style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.4, textTransform: "uppercase" }}>{l}</span>
              <span style={{
                fontFamily: mono ? BL.mono : BL.sans,
                fontSize: bold ? 16 : 11,
                fontWeight: bold ? 700 : 400,
                color: BL.ink,
                wordBreak: "break-all", textAlign: "right", maxWidth: "60%",
              }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Booked screen — server says donor has an upcoming confirmed booking ──
  if (activeBooking && !screen) {
    const drive = activeBooking.drive ?? {};
    const timeRange = drive.startTime
      ? `${drive.startTime}${drive.endTime ? `–${drive.endTime}` : ""}`
      : null;

    return (
      <div>
        <AppHeader sub={greeting} title={firstName ? `Hi, ${firstName}` : "Home"} />

        {/* Confirmed booking card */}
        <Card style={{ border: `1.5px solid ${BL.need.ok.fg}`, background: BL.need.ok.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 15, background: BL.need.ok.fg,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 15, fontWeight: 700, flexShrink: 0,
            }}>✓</div>
            <div style={{ fontFamily: BL.sans, fontSize: 15, fontWeight: 600, color: BL.ink }}>
              You're booked
            </div>
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink, marginBottom: 4 }}>
            {drive.name ?? drive.location ?? "Blood drive"}
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, letterSpacing: 0.3 }}>
            {drive.date}{timeRange ? ` · ${timeRange}` : ""}
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 2, letterSpacing: 0.3 }}>
            {drive.location}
          </div>
        </Card>

        {/* Prep tips */}
        <Card>
          <Tag>What to bring</Tag>
          <div style={{ marginTop: 10 }}>
            {[
              "NRIC or passport for registration",
              "Eat a full meal beforehand",
              "Drink plenty of water",
              "Wear clothing with sleeves you can roll up",
            ].map((tip, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "9px 0", borderTop: i > 0 ? `1px solid ${BL.hair}` : "none",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 10, background: BL.fill, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 1,
                }}>{i + 1}</div>
                <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, lineHeight: 1.45 }}>{tip}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Impact */}
        <Card style={{ background: BL.fill }}>
          <Tag>Your impact</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, marginTop: 6, lineHeight: 1.5 }}>
            Your unit could reach <b style={{ color: BL.red }}>up to 3 patients</b>.
            {(userType === "O-" || userType === "O−")
              ? " As O−, you're a universal donor — your blood can go to any patient in an emergency."
              : " Every donation keeps Singapore's national reserves healthy."}
          </div>
        </Card>

        {/* Primary CTA */}
        <button
          onClick={() => setScreen("arrived")}
          style={{
            width: "100%", padding: "14px 0", marginTop: 4,
            background: BL.ink, color: "#fff",
            border: "none", borderRadius: 8, fontFamily: BL.sans,
            fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 50,
          }}
        >
          I have arrived →
        </button>

        {/* Cancel */}
        <button
          onClick={() => setActiveBooking(null)}
          style={{
            width: "100%", padding: "11px 0", marginTop: 8, marginBottom: 8,
            background: "none", border: `1px solid ${BL.hair}`, borderRadius: 6,
            fontFamily: BL.sans, fontSize: 13, color: BL.muted, cursor: "pointer", minHeight: 44,
          }}
        >
          Cancel booking
        </button>
      </div>
    );
  }

  // ── Mobilise workplace ───────────────────────────────────────────
  if (screen === "mobilise") {
    return (
      <div>
        <button
          onClick={() => setScreen(null)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: BL.sans, fontSize: 13, color: BL.ink,
            padding: "12px 0 8px", fontWeight: 500, minHeight: 44,
          }}
        >
          ← Back
        </button>
        <Tag color={BL.surge}>SURGE · {activeSurge?.bloodType ?? "ACTIVE"}</Tag>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2, marginTop: 4, marginBottom: 6 }}>
          Mobilise your workplace
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, lineHeight: 1.5, marginBottom: 20 }}>
          Send a one-tap invite to your colleagues. We'll handle scheduling with HSA and show you RSVPs in real time.
        </div>

        <Card>
          <Tag>Step 1 · Choose your organisation</Tag>
          <div style={{ marginTop: 12 }}>
            {[
              { l: "My workplace", sub: "Send to your office colleagues" },
              { l: "My school / uni", sub: "Send to your student group" },
              { l: "My community group", sub: "RC, CC, or volunteer group" },
            ].map((opt, i) => (
              <div key={i} style={{
                padding: "12px 0", borderTop: i > 0 ? `1px solid ${BL.hair}` : "none",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                  border: `2px solid ${i === 0 ? BL.ink : BL.faint}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {i === 0 && <div style={{ width: 8, height: 8, borderRadius: 4, background: BL.ink }} />}
                </div>
                <div>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>{opt.l}</div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>{opt.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Tag>Step 2 · Message preview</Tag>
          <div style={{
            marginTop: 10, padding: 12, background: BL.fill, borderRadius: 6,
            fontFamily: BL.sans, fontSize: 13, color: BL.ink, lineHeight: 1.55,
          }}>
            <b>{donor?.name ?? "A colleague"}</b> is organising a blood donation drive.
            {activeSurge ? ` ${activeSurge.bloodType} is currently at critical supply nationally.` : ""}
            {" "}It takes about 15 minutes — tap to RSVP.
          </div>
        </Card>

        <button
          style={{
            width: "100%", padding: "14px 0", background: BL.surge, color: "#fff",
            border: "none", borderRadius: 8, fontFamily: BL.sans, fontSize: 14,
            fontWeight: 600, cursor: "pointer", minHeight: 50, marginBottom: 8,
          }}
        >
          Send invite →
        </button>
        <button
          onClick={() => setScreen(null)}
          style={{
            width: "100%", padding: "10px 0", background: "none",
            border: `1px solid ${BL.hair}`, borderRadius: 8, fontFamily: BL.sans,
            fontSize: 13, color: BL.muted, cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── SURGE MODE — full-screen takeover ───────────────────────────
  if (activeSurge) {
    const nearestDrive = drives[0] ?? null;
    const alertDate = new Date().toLocaleDateString("en-SG", { day: "numeric", month: "short" }).toUpperCase();
    const alertTime = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });

    return (
      // Negative margin breaks out of the 16px mobile padding so the banner is edge-to-edge
      <div style={{ margin: "0 -16px" }}>
        {/* Surge banner */}
        <div style={{
          background: BL.surgeBg, borderBottom: `1px solid ${BL.surge}33`,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: 4, background: BL.surge,
            boxShadow: `0 0 0 4px ${BL.surge}22`, flexShrink: 0,
          }} />
          <Tag color={BL.surge}>SURGE MODE · ACTIVE</Tag>
        </div>

        <div style={{ padding: "20px 16px 16px" }}>
          <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.8 }}>
            HSA NATIONAL ALERT · {alertDate} · {alertTime}
          </div>
          <div style={{
            fontFamily: BL.sans, fontSize: 30, fontWeight: 600, color: BL.ink,
            lineHeight: 1.05, letterSpacing: -0.8, marginTop: 8,
          }}>
            {activeSurge.bloodType} is needed today.
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 15, color: BL.muted, lineHeight: 1.5, marginTop: 10 }}>
            {activeSurge.message || `HSA is calling all eligible ${activeSurge.bloodType} donors. Reserves are critically low — every unit counts.`}
          </div>

          {/* Action card */}
          <div style={{
            marginTop: 18, padding: 16, background: BL.surgeBg,
            border: `1px solid ${BL.surge}55`, borderRadius: 8,
          }}>
            {nearestDrive ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <div style={{ fontFamily: BL.sans, fontSize: 15, color: BL.ink, fontWeight: 600 }}>
                      {nearestDrive.name ?? nearestDrive.location}
                    </div>
                    <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 4, letterSpacing: 0.3 }}>
                      {nearestDrive.location}
                    </div>
                  </div>
                  <div style={{
                    width: 52, height: 52, borderRadius: 6, flexShrink: 0,
                    background: BL.need.critical.bg, border: `2px solid ${BL.need.critical.fg}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: BL.mono, fontSize: 13, fontWeight: 700, color: BL.need.critical.fg,
                  }}>
                    {activeSurge.bloodType}
                  </div>
                </div>
                {nearestDrive.startTime && (
                  <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: BL.mono, fontSize: 11, background: BL.card,
                      border: `1px solid ${BL.hair}`, borderRadius: 4, padding: "4px 10px", color: BL.ink,
                    }}>
                      {nearestDrive.startTime}
                    </span>
                    <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, padding: "4px 0" }}>
                      {nearestDrive.date}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => { setSelectedDrive(nearestDrive); setScreen("booking"); }}
                  style={{
                    width: "100%", marginTop: 14, padding: "13px 0",
                    background: BL.surge, color: "#fff", border: "none", borderRadius: 8,
                    fontFamily: BL.sans, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 48,
                  }}
                >
                  Book a slot →
                </button>
              </>
            ) : (
              <>
                <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>
                  Check the Drives tab for nearby locations
                </div>
                <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 4 }}>
                  No drives loaded yet
                </div>
              </>
            )}
          </div>

          {/* Secondary actions */}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => setScreen("mobilise")}
              style={{
                flex: 1, padding: "11px 0", border: `1px solid ${BL.ink}`,
                background: "none", borderRadius: 7, fontFamily: BL.sans, fontSize: 13,
                color: BL.ink, cursor: "pointer", minHeight: 44,
              }}
            >
              Mobilise my workplace
            </button>
            <button
              onClick={handleSnooze}
              style={{
                padding: "11px 16px", border: `1px solid ${BL.hair}`,
                background: "none", borderRadius: 7, fontFamily: BL.sans, fontSize: 13,
                color: BL.muted, cursor: "pointer", minHeight: 44,
              }}
            >
              Snooze 2h
            </button>
          </div>

          {/* Why you got this */}
          <div style={{ marginTop: 16, padding: 12, border: `1px solid ${BL.hair}`, borderRadius: 6 }}>
            <Tag>WHY YOU GOT THIS</Tag>
            <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, lineHeight: 1.55, marginTop: 6 }}>
              {userType
                ? `You're ${userType} and within the ${activeSurge.geoTier} alert tier. You can opt out in Profile → Notifications.`
                : `You're within the ${activeSurge.geoTier} alert tier. You can opt out in Profile → Notifications.`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── NORMAL MODE — HomeB timeline layout ──────────────────────────

  const eligibilityAnswer = !donor ? "—"
    : donor.eligible ? "Yes — today."
    : `Not yet — ${donor.daysUntilEligible ?? "?"} days.`;

  const eligibilitySub = !donor ? ""
    : donor.eligible
      ? donor.lastDonatedAt
        ? `You're eligible. Last donated ${donor.lastDonatedAt.slice(0, 10)}.`
        : "You're eligible to donate."
      : donor.nextEligibleDate
        ? `Eligible from ${donor.nextEligibleDate}.`
        : `${donor.daysUntilEligible ?? "—"} days until your next eligible date.`;

  const needAnswer = typeNeed === "critical" ? "Critically."
    : typeNeed === "urgent" ? "Urgently."
    : typeNeed === "low" ? "Somewhat."
    : "Not urgently.";

  const needDot = (typeNeed === "urgent" || typeNeed === "critical") ? BL.red : BL.ink;
  const nearestDrive = drives[0] ?? null;

  return (
    <div>
      <AppHeader sub={greeting} title={firstName ? `Hi, ${firstName}` : "Home"} />

      {/* Node 1 — Can I donate? */}
      <TimelineNode
        dot={BL.ink}
        line
        tag="CAN I DONATE?"
        answer={eligibilityAnswer}
        sub={eligibilitySub}
      />

      {/* Node 2 — Is it needed? */}
      <TimelineNode
        dot={needDot}
        line={!!nearestDrive}
        tag={userType ? `IS MY TYPE NEEDED?` : "IS BLOOD NEEDED?"}
        answer={status ? needAnswer : "—"}
        sub={
          status && userType
            ? `Your type, ${userType}, is at ${typeNeed} supply nationally.`
            : status
            ? `National supply is ${status.nationalStatus ?? "—"}.`
            : ""
        }
      >
        {status?.byBloodType && (
          <div style={{
            marginTop: 10, background: BL.card, border: `1px solid ${BL.hair}`,
            borderRadius: 6, padding: 10,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 3, marginBottom: 8 }}>
              {status.byBloodType.map(item => {
                const need = riskToNeed(item.riskLevel);
                const selected = item.bloodType === userType;
                return (
                  <div key={item.bloodType} style={{
                    background: BL.need[need].bg,
                    border: `1.5px solid ${selected ? BL.need[need].fg : `${BL.need[need].fg}44`}`,
                    borderRadius: 4, padding: "6px 2px", textAlign: "center",
                    outline: selected ? `2px solid ${BL.need[need].fg}` : "none",
                    outlineOffset: 1,
                  }}>
                    <div style={{ fontFamily: BL.mono, fontSize: 9, fontWeight: 600, color: BL.ink }}>{item.bloodType}</div>
                    <div style={{ fontFamily: BL.mono, fontSize: 7, color: BL.need[need].fg, marginTop: 1, textTransform: "uppercase", letterSpacing: 0.2 }}>
                      {BL.need[need].label}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, fontFamily: BL.mono, fontSize: 9 }}>
              {["ok", "low", "urgent", "critical"].map(n => (
                <span key={n} style={{ color: BL.need[n].fg }}>● {BL.need[n].label}</span>
              ))}
            </div>
          </div>
        )}
      </TimelineNode>

      {/* Node 3 — When can I go? */}
      {(nearestDrive || donor) && (
        <TimelineNode dot={BL.ink} tag="WHEN CAN I GO?" last>
          {nearestDrive ? (
            <div style={{
              marginTop: 8, background: BL.card, border: `1px solid ${BL.hair}`,
              borderRadius: 6, padding: 14,
            }}>
              <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 600 }}>
                {nearestDrive.name ?? nearestDrive.location}
              </div>
              <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 3, letterSpacing: 0.3 }}>
                {nearestDrive.date}
                {nearestDrive.startTime ? ` · ${nearestDrive.startTime}` : ""}
                {" · "}{nearestDrive.location}
              </div>
              <button
                onClick={() => setScreen("booking")}
                style={{
                  width: "100%", marginTop: 12, padding: "13px 0",
                  background: BL.ink, color: "#fff", border: "none", borderRadius: 8,
                  fontFamily: BL.sans, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 48,
                }}
              >
                Book a slot →
              </button>
              <button
                onClick={() => setScreen("booking")}
                style={{
                  width: "100%", marginTop: 6, padding: "8px 0",
                  background: "none", color: BL.muted, border: "none",
                  fontFamily: BL.sans, fontSize: 13, cursor: "pointer",
                }}
              >
                See other times
              </button>
            </div>
          ) : (
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6 }}>
              No drives listed yet — check the Drives tab.
            </div>
          )}
        </TimelineNode>
      )}
    </div>
  );
}
