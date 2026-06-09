import { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import {
  getDonor, getStatus, getDrives,
  getSlots, bookSlot, cancelSlotBooking, getBloodStock,
  getSurgeMonitor, getMyBookings, updateDonor, getForecast
} from "../api";
import { getToken } from "../auth";
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
  const [donor,             setDonor]             = useState(null);
  const [status,            setStatus]            = useState(null);
  const [drives,            setDrives]            = useState([]); // used for surge action card
  const [slots,             setSlots]             = useState([]); // slot-based booking
  const [surgeAlerts,       setSurgeAlerts]       = useState([]);
  const [activeBooking,     setActiveBooking]     = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [bloodStock,        setBloodStock]        = useState([]);
  const [bloodStockUpdated, setBloodStockUpdated] = useState("");
  const [typeForecast,      setTypeForecast]      = useState(null); // 14-day outlook for the donor's own type
  const [screen,            setScreen]            = useState(null);
  const [selectedSlot,      setSelectedSlot]      = useState(null);
  const [confirming,        setConfirming]        = useState(false);
  const [bookingError,      setBookingError]      = useState(null);
  const [cancelling,        setCancelling]        = useState(false);
  const [checkedItems,      setCheckedItems]      = useState({});
  const [userId,            setUserId]            = useState(null);
  const [donationBaseline, setDonationBaseline]  = useState(null);

  // Decode Cognito sub from JWT so QR code always has the real ID
  useEffect(() => {
    getToken().then(token => {
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        setUserId(payload.sub ?? null);
      } catch {}
    });
  }, []);

  // Poll for donation completion while QR screen is open
  useEffect(() => {
    if (screen !== "arrived") return;
    const baseline = donor?.lastDonatedAt ?? null;
    setDonationBaseline(baseline);
    const id = setInterval(async () => {
      try {
        const updated = await getDonor();
        if (updated.lastDonatedAt !== baseline) {
          setDonor(updated);
          setScreen("donated");
        }
      } catch {}
    }, 8000);
    return () => clearInterval(id);
  }, [screen]);

  // Surge snooze — localStorage is fine for a UI preference
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

  // Browser push: remember which alerts we've already surfaced this session so
  // the 30s poll doesn't fire a notification on every tick.
  const notifiedAlertIds = useRef(new Set());

  function pushBrowserNotification(alert) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (notifiedAlertIds.current.has(alert.alertId)) return;
    notifiedAlertIds.current.add(alert.alertId);
    new Notification(`Surge alert — ${alert.bloodType} blood needed`, {
      body: alert.message || `HSA is calling all eligible ${alert.bloodType} donors. Reserves are critically low.`,
      tag: alert.alertId,
    });
  }

  function fetchSurge() {
    getSurgeMonitor()
      .then(d => {
        const alerts = d.activeAlerts ?? [];
        console.log("[Surge] active alerts:", alerts);
        setSurgeAlerts(alerts);
        // Fire a browser push for any relevant new surge
        alerts
          .filter(a => {
            const types = a.bloodTypes ?? (a.bloodType ? [a.bloodType] : []);
            return a.geoTier === "island-wide" || types.includes(donor?.bloodType);
          })
          .forEach(pushBrowserNotification);
      })
      .catch(err => console.error("[Surge] getSurgeMonitor failed:", err));
  }

  useEffect(() => {
    Promise.allSettled([
      getDonor().then(setDonor),
      getStatus().then(setStatus),
      getDrives().then(d => setDrives(d.drives ?? [])),
      getSlots().then(d => setSlots(d.slots ?? [])),
      getBloodStock().then(d => {
        setBloodStock(d.bloodStock ?? []);
        setBloodStockUpdated(d.updatedAt ?? "");
      }),
    ]).finally(() => setLoading(false));

    // Ask once for permission to send browser push notifications for surges
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    // Capture a live location fix (if the donor allows it) so surge radius tiers
    // can target where they actually are; falls back to home postal code server-side.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => updateDonor({ liveLat: pos.coords.latitude, liveLng: pos.coords.longitude }).catch(() => {}),
        () => {},  // denied / unavailable → home location is used instead
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    }

    fetchBookings();
    fetchSurge();
    const id = setInterval(fetchSurge, 30_000);
    return () => clearInterval(id);
  }, []);

  // Map Red Cross status strings to need levels
  const statusToNeed = (s) =>
    ({ Healthy: "ok", Moderate: "low", Low: "urgent", Critical: "critical" })[s] ?? "ok";

  const userType  = donor?.bloodType;
  const typeStockItem = bloodStock.find(s => s.bloodType === userType);
  const typeNeed      = typeStockItem ? statusToNeed(typeStockItem.status) : "ok";

  // 14-day forecast scoped to the donor's own blood type, so they can plan ahead
  useEffect(() => {
    if (!userType) return;
    getForecast(userType)
      .then(d => {
        const f = d.forecast ?? {};
        // Prefer the exact type; fall back to the only series returned (guards key mismatches)
        setTypeForecast(f[userType] ?? Object.values(f)[0] ?? null);
      })
      .catch(() => setTypeForecast(null));
  }, [userType]);

  // Active surge: hidden if snoozed OR donor already has a confirmed booking
  const isSnoozed  = Date.now() < snoozedUntil;
  const surgeMatchesUser = (a) => {
    const types = a.bloodTypes ?? (a.bloodType ? [a.bloodType] : []);
    return a.geoTier === "island-wide" || types.includes(userType);
  };
  const activeSurge = (isSnoozed || activeBooking) ? null : (surgeAlerts.find(surgeMatchesUser) ?? null);

  // Surge blood types: full label for flowing text, compact value for the badge
  const surgeTypes = activeSurge ? (activeSurge.bloodTypes ?? (activeSurge.bloodType ? [activeSurge.bloodType] : [])) : [];
  const surgeLabel = surgeTypes.join(", ") || (activeSurge?.bloodType ?? "");
  const surgeBadge = surgeTypes.length > 1 ? "MULTI" : (surgeTypes[0] ?? activeSurge?.bloodType ?? "");

  // Shared across screens
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";
  const firstName = donor?.name?.split(" ")[0] ?? null;

  async function confirmBooking() {
    if (!selectedSlot) return;
    if (donor && !donor.eligible) {
      setBookingError(`You can't donate yet — ${donor.daysUntilEligible} days remaining.`);
      return;
    }
    setConfirming(true);
    setBookingError(null);
    try {
      await bookSlot(selectedSlot.slotId);
      fetchBookings(); // pull confirmed booking from server — gates booked screen + surge
      setScreen("success");
    } catch (e) {
      setBookingError(e.message);
    } finally {
      setConfirming(false);
    }
  }

  async function cancelBooking() {
    // Slot bookings live server-side and must be cancelled there, otherwise
    // they reappear on the next fetchBookings(). Legacy bookings (no slotId)
    // only ever existed in local state, so just clear them.
    const slotId = activeBooking?.slotId;
    if (!slotId) {
      setActiveBooking(null);
      return;
    }
    setCancelling(true);
    setBookingError(null);
    try {
      await cancelSlotBooking(slotId);
      fetchBookings(); // re-sync from server (also frees the slot for the surge gate)
      setScreen(null);
    } catch (e) {
      setBookingError(e.message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return (
    <div>
      <AppHeader sub="bloodline" title="Home" />
      <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13, padding: "8px 0" }}>Loading…</div>
    </div>
  );

  // ── Slot picker ──────────────────────────────────────────────────
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

        {slots.length === 0 ? (
          <Card>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted }}>No donation slots available right now.</div>
          </Card>
        ) : (
          slots.map(slot => {
            const pct      = slot.capacity > 0 ? Math.round((slot.booked / slot.capacity) * 100) : 0;
            const slotsLeft = (slot.capacity ?? 0) - (slot.booked ?? 0);
            const sel      = selectedSlot?.slotId === slot.slotId;
            return (
              <button
                key={slot.slotId}
                onClick={() => setSelectedSlot(slot)}
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
                      {slot.name || slot.location}
                    </div>
                    {slot.name && slot.location && (
                      <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 1 }}>
                        {slot.location}
                      </div>
                    )}
                    <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 3, letterSpacing: 0.3 }}>
                      {slot.date}{slot.startTime && ` · ${slot.startTime}`}{slot.endTime && `–${slot.endTime}`}
                    </div>
                    <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2, letterSpacing: 0.3 }}>
                      {pct}% booked · {slotsLeft} spots left
                    </div>
                  </div>
                  {sel && <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.need.ok.fg, fontWeight: 600, marginLeft: 8 }}>✓</span>}
                </div>
              </button>
            );
          })
        )}

        <button
          onClick={() => selectedSlot && setScreen("confirm")}
          disabled={!selectedSlot}
          style={{
            width: "100%", padding: "13px 0", marginTop: 4,
            background: selectedSlot ? BL.ink : BL.hair,
            color: selectedSlot ? "#fff" : BL.muted,
            border: "none", borderRadius: 8, fontFamily: BL.sans, fontSize: 14, fontWeight: 600,
            cursor: selectedSlot ? "pointer" : "default",
          }}
        >
          {selectedSlot ? `Continue with ${selectedSlot.location}` : "Choose a slot"}
        </button>
      </div>
    );
  }

  // ── Confirm screen ───────────────────────────────────────────────
  if (screen === "confirm") {
    const slot      = selectedSlot;
    const timeRange = slot.startTime && slot.endTime
      ? `${slot.startTime}–${slot.endTime}`
      : slot.startTime ?? "";

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

        <Card>
          <Tag>When</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink, marginTop: 4 }}>
            {slot.date}{timeRange ? ` · ${timeRange}` : ""}
          </div>

          <div style={{ borderTop: `1px solid ${BL.hair}`, paddingTop: 12, marginTop: 12 }}>
            <Tag>Where</Tag>
            <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink, marginTop: 4 }}>
              {slot.location}
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

        {/* Quick check — all must be ticked before confirm */}
        <Card style={{ background: BL.fill }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Tag>Quick check</Tag>
            {!allChecked
              ? <Tag color={BL.muted}>{CHECK_ITEMS.filter((_, i) => checkedItems[i]).length}/{CHECK_ITEMS.length}</Tag>
              : <Tag color={BL.need.ok.fg}>All good ✓</Tag>
            }
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
                }}>
                  {checked ? "✓" : ""}
                </div>
                <span style={{ fontFamily: BL.sans, fontSize: 14, lineHeight: 1.4, color: checked ? BL.ink : BL.muted }}>
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
            opacity: confirming ? 0.7 : 1, minHeight: 50,
          }}
        >
          {confirming ? "Confirming…" : "Confirm booking"}
        </button>
      </div>
    );
  }

  // ── Booking success ──────────────────────────────────────────────
  if (screen === "success") {
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
          See you at <b style={{ color: BL.ink }}>{selectedSlot?.location}</b> on <b style={{ color: BL.ink }}>{selectedSlot?.date}</b>.
        </div>
        <Card style={{ marginTop: 22, width: "100%" }}>
          <Tag>Your impact</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500, marginTop: 6, lineHeight: 1.5 }}>
            Your unit could reach <b style={{ color: BL.red }}>up to 3 patients</b>
            {(userType === "O-" || userType === "O−") ? " — and as O−, you can go to anyone in an emergency." : "."}
          </div>
        </Card>
        <button
          onClick={() => { setScreen(null); setSelectedSlot(null); }}
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

  // ── Donation complete screen ─────────────────────────────────────
  if (screen === "donated") {
    const isUniversal = userType === "O-" || userType === "O−";
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0 24px" }}>
        <div style={{
          width: 88, height: 88, borderRadius: 44,
          background: BL.need.ok.bg, border: `2px solid ${BL.need.ok.fg}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: BL.sans, fontSize: 42, color: BL.need.ok.fg,
        }}>✓</div>

        <div style={{ fontFamily: BL.sans, fontSize: 26, fontWeight: 600, color: BL.ink, marginTop: 22, letterSpacing: -0.6, textAlign: "center", lineHeight: 1.15 }}>
          Donation recorded.
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.muted, marginTop: 8, textAlign: "center", lineHeight: 1.6, maxWidth: 280 }}>
          Thank you — your session has been confirmed by the bloodbank staff.
        </div>

        <Card style={{ marginTop: 24, width: "100%" }}>
          <Tag>Your impact</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500, marginTop: 8, lineHeight: 1.6 }}>
            Your unit could help <b style={{ color: BL.red }}>up to 3 patients</b>.
            {isUniversal
              ? " As O−, you're a universal donor — your blood can go to anyone in an emergency."
              : " Every donation keeps Singapore's national reserves healthy."}
          </div>
        </Card>

        {donor?.lastDonatedAt && (
          <Card style={{ width: "100%", background: BL.fill }}>
            <Tag>Recorded</Tag>
            <div style={{ fontFamily: BL.mono, fontSize: 13, color: BL.ink, marginTop: 6 }}>
              {new Date(donor.lastDonatedAt).toLocaleString("en-SG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
            {donor.daysUntilEligible > 0 && (
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 4 }}>
                Next eligible in {donor.daysUntilEligible} days
              </div>
            )}
          </Card>
        )}

        <button
          onClick={() => {
            setScreen(null);
            setActiveBooking(null);
            fetchBookings();
          }}
          style={{
            width: "100%", padding: "15px 0", marginTop: 8,
            background: BL.ink, color: "#fff", border: "none", borderRadius: 8,
            fontFamily: BL.sans, fontSize: 15, fontWeight: 600, cursor: "pointer", minHeight: 52,
          }}
        >
          OK
        </button>
      </div>
    );
  }

  // ── QR check-in screen ───────────────────────────────────────────
  if (screen === "arrived" && activeBooking) {
    const drive     = activeBooking.drive ?? {};
    const timeRange = drive.startTime
      ? `${drive.startTime}${drive.endTime ? `–${drive.endTime}` : ""}`
      : null;
    const qrValue   = donor?.donorId ?? userId ?? "no-id";

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

        <div style={{
          background: "#fff", border: `1px solid ${BL.hair}`, borderRadius: 10,
          padding: 24, display: "flex", justifyContent: "center", marginBottom: 16,
        }}>
          <QRCode value={qrValue} size={220} fgColor={BL.ink} bgColor="#ffffff" />
        </div>

        <div style={{ background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 16, marginBottom: 10 }}>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>
            Your booking
          </div>
          {[
            { l: "Drive",    v: drive.name || drive.location || "—" },
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

        <div style={{ background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 16 }}>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>
            Donor
          </div>
          {[
            { l: "Donor ID",   v: donor?.donorId ?? "—",    mono: true },
            { l: "Blood type", v: donor?.bloodType ?? "—",  mono: true, bold: true },
          ].map(({ l, v, mono, bold }, i) => (
            <div key={l} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderTop: i > 0 ? `1px solid ${BL.hair}` : "none",
            }}>
              <span style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.4, textTransform: "uppercase" }}>{l}</span>
              <span style={{
                fontFamily: mono ? BL.mono : BL.sans,
                fontSize: bold ? 16 : 11, fontWeight: bold ? 700 : 400, color: BL.ink,
                wordBreak: "break-all", textAlign: "right", maxWidth: "60%",
              }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Booked screen ────────────────────────────────────────────────
  if (activeBooking && !screen) {
    const drive     = activeBooking.drive ?? {};
    const timeRange = drive.startTime
      ? `${drive.startTime}${drive.endTime ? `–${drive.endTime}` : ""}`
      : null;

    return (
      <div>
        <AppHeader sub={greeting} title={firstName ? `Hi, ${firstName}` : "Home"} />

        <Card style={{ border: `1.5px solid ${BL.need.ok.fg}`, background: BL.need.ok.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 15, background: BL.need.ok.fg,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 15, fontWeight: 700, flexShrink: 0,
            }}>✓</div>
            <div style={{ fontFamily: BL.sans, fontSize: 15, fontWeight: 600, color: BL.ink }}>You're booked</div>
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink, marginBottom: 4 }}>
            {drive.name || drive.location || "Blood drive"}
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, letterSpacing: 0.3 }}>
            {drive.date}{timeRange ? ` · ${timeRange}` : ""}
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 2, letterSpacing: 0.3 }}>
            {drive.location}
          </div>
        </Card>

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

        <Card style={{ background: BL.fill }}>
          <Tag>Your impact</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, marginTop: 6, lineHeight: 1.5 }}>
            Your unit could reach <b style={{ color: BL.red }}>up to 3 patients</b>.
            {(userType === "O-" || userType === "O−")
              ? " As O−, you're a universal donor — your blood can go to any patient in an emergency."
              : " Every donation keeps Singapore's national reserves healthy."}
          </div>
        </Card>

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

        <button
          onClick={cancelBooking}
          disabled={cancelling}
          style={{
            width: "100%", padding: "11px 0", marginTop: 8, marginBottom: 8,
            background: "none", border: `1px solid ${BL.hair}`, borderRadius: 6,
            fontFamily: BL.sans, fontSize: 13, color: BL.muted,
            cursor: cancelling ? "default" : "pointer", opacity: cancelling ? 0.6 : 1, minHeight: 44,
          }}
        >
          {cancelling ? "Cancelling…" : "Cancel booking"}
        </button>
        {bookingError && (
          <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg, marginBottom: 12 }}>
            {bookingError}
          </div>
        )}
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
        <Tag color={BL.surge}>SURGE · {surgeLabel || "ACTIVE"}</Tag>
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
              <div key={i} style={{ padding: "12px 0", borderTop: i > 0 ? `1px solid ${BL.hair}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
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
          <div style={{ marginTop: 10, padding: 12, background: BL.fill, borderRadius: 6, fontFamily: BL.sans, fontSize: 13, color: BL.ink, lineHeight: 1.55 }}>
            <b>{donor?.name ?? "A colleague"}</b> is organising a blood donation drive.
            {activeSurge ? ` ${surgeLabel} is currently at critical supply nationally.` : ""}
            {" "}It takes about 15 minutes — tap to RSVP.
          </div>
        </Card>
        <button style={{ width: "100%", padding: "14px 0", background: BL.surge, color: "#fff", border: "none", borderRadius: 8, fontFamily: BL.sans, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 50, marginBottom: 8 }}>
          Send invite →
        </button>
        <button onClick={() => setScreen(null)} style={{ width: "100%", padding: "10px 0", background: "none", border: `1px solid ${BL.hair}`, borderRadius: 8, fontFamily: BL.sans, fontSize: 13, color: BL.muted, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    );
  }

  // ── Surge mode — full-screen takeover ────────────────────────────
  if (activeSurge) {
    const nearestSlot = slots[0] ?? null;
    const alertDate   = new Date().toLocaleDateString("en-SG", { day: "numeric", month: "short" }).toUpperCase();
    const alertTime   = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });

    return (
      <div style={{ margin: "0 -16px" }}>
        <div style={{ background: BL.surgeBg, borderBottom: `1px solid ${BL.surge}33`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: BL.surge, boxShadow: `0 0 0 4px ${BL.surge}22`, flexShrink: 0 }} />
          <Tag color={BL.surge}>SURGE MODE · ACTIVE</Tag>
        </div>

        <div style={{ padding: "20px 16px 16px" }}>
          <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.8 }}>
            HSA NATIONAL ALERT · {alertDate} · {alertTime}
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 30, fontWeight: 600, color: BL.ink, lineHeight: 1.05, letterSpacing: -0.8, marginTop: 8 }}>
            {surgeLabel} is needed today.
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 15, color: BL.muted, lineHeight: 1.5, marginTop: 10 }}>
            {activeSurge.message || `HSA is calling all eligible ${surgeLabel} donors. Reserves are critically low — every unit counts.`}
          </div>

          <div style={{ marginTop: 18, padding: 16, background: BL.surgeBg, border: `1px solid ${BL.surge}55`, borderRadius: 8 }}>
            {nearestSlot ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <div style={{ fontFamily: BL.sans, fontSize: 15, color: BL.ink, fontWeight: 600 }}>{nearestSlot.name || nearestSlot.location}</div>
                    {nearestSlot.name && nearestSlot.location && (
                      <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 2 }}>{nearestSlot.location}</div>
                    )}
                    {nearestSlot.startTime && (
                      <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 4, letterSpacing: 0.3 }}>
                        {nearestSlot.date} · {nearestSlot.startTime}
                      </div>
                    )}
                  </div>
                  <div style={{
                    width: 52, height: 52, borderRadius: 6, flexShrink: 0,
                    background: BL.need.critical.bg, border: `2px solid ${BL.need.critical.fg}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: BL.mono, fontSize: surgeBadge.length > 3 ? 11 : 13, fontWeight: 700, color: BL.need.critical.fg,
                  }}>
                    {surgeBadge}
                  </div>
                </div>
                {donor?.eligible !== false ? (
                  <button
                    onClick={() => { setSelectedSlot(nearestSlot); setScreen("booking"); }}
                    style={{
                      width: "100%", marginTop: 14, padding: "13px 0",
                      background: BL.surge, color: "#fff", border: "none", borderRadius: 8,
                      fontFamily: BL.sans, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 48,
                    }}
                  >
                    Book a slot →
                  </button>
                ) : (
                  <div style={{ marginTop: 14, padding: "11px 14px", background: `${BL.surge}18`, borderRadius: 8, fontFamily: BL.sans, fontSize: 13, color: BL.surge }}>
                    You're in the rest window — rally your friends instead.
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>Check the Drives tab for nearby locations</div>
                <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 4 }}>No slots loaded yet</div>
              </>
            )}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={() => setScreen("mobilise")} style={{ flex: 1, padding: "11px 0", border: `1px solid ${BL.ink}`, background: "none", borderRadius: 7, fontFamily: BL.sans, fontSize: 13, color: BL.ink, cursor: "pointer", minHeight: 44 }}>
              Mobilise my workplace
            </button>
            <button onClick={handleSnooze} style={{ padding: "11px 16px", border: `1px solid ${BL.hair}`, background: "none", borderRadius: 7, fontFamily: BL.sans, fontSize: 13, color: BL.muted, cursor: "pointer", minHeight: 44 }}>
              Snooze 2h
            </button>
          </div>

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

  // ── Normal mode — timeline ───────────────────────────────────────
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

  const needDot     = (typeNeed === "urgent" || typeNeed === "critical") ? BL.red : BL.ink;
  const nearestSlot = slots[0] ?? null;

  // Plain-language read of the 14-day outlook for the donor's own type
  const forecastSummary = (() => {
    if (!typeForecast?.length) return "";
    const firstRisk = typeForecast.find(d => d.riskLevel === "urgent" || d.riskLevel === "critical");
    if (firstRisk) {
      const when = new Date(`${firstRisk.date}T12:00:00`).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
      return `Projected to reach ${firstRisk.riskLevel} supply around ${when} — donating ahead of that helps most.`;
    }
    return `${userType} supply is projected to stay stable over the next 14 days.`;
  })();

  return (
    <div>
      <AppHeader sub={greeting} title={firstName ? `Hi, ${firstName}` : "Home"} />

      {/* Node 1 — Can I donate? */}
      <TimelineNode dot={BL.ink} line tag="CAN I DONATE?" answer={eligibilityAnswer} sub={eligibilitySub} />

      {/* Node 2 — Is it needed? */}
      <TimelineNode
        dot={needDot}
        line={!!nearestSlot}
        tag={userType ? "IS MY TYPE NEEDED?" : "IS BLOOD NEEDED?"}
        answer={status ? needAnswer : "—"}
        sub={
          status && userType
            ? `Your type, ${userType}, is at ${typeNeed} supply nationally.`
            : status ? `National supply is ${status.nationalStatus ?? "—"}.` : ""
        }
      >
        {bloodStock.length > 0 && (
          <div style={{ marginTop: 10, background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 3, marginBottom: 8 }}>
              {bloodStock.map(item => {
                const need     = statusToNeed(item.status);
                const selected = item.bloodType === userType;
                return (
                  <div key={item.bloodType} style={{
                    background: BL.need[need].bg,
                    border: `1.5px solid ${selected ? BL.need[need].fg : `${BL.need[need].fg}44`}`,
                    borderRadius: 4, padding: "6px 2px", textAlign: "center",
                    outline: selected ? `2px solid ${BL.need[need].fg}` : "none", outlineOffset: 1,
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

        {/* 14-day outlook for the donor's own type — plan ahead */}
        {userType && typeForecast?.length > 0 && (
          <div style={{ marginTop: 10, background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>
                14-day outlook · {userType}
              </span>
              <span style={{ fontFamily: BL.mono, fontSize: 8, color: BL.faint, letterSpacing: 0.4, textTransform: "uppercase" }}>
                projected supply
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 42, marginBottom: 5 }}>
              {typeForecast.map(day => {
                const need = riskToNeed(day.riskLevel);
                return (
                  <div
                    key={day.date}
                    title={`${day.date} · ${day.riskLevel} · ${Math.round(day.percentage)}%`}
                    style={{
                      flex: 1, height: `${Math.max(8, Math.min(100, day.percentage))}%`,
                      background: BL.need[need].fg, borderRadius: 1, opacity: 0.85,
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: BL.mono, fontSize: 8, color: BL.faint }}>
              <span>{typeForecast[0].date.slice(5)}</span>
              <span>{typeForecast[typeForecast.length - 1].date.slice(5)}</span>
            </div>
            {forecastSummary && (
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 8, lineHeight: 1.45 }}>
                {forecastSummary}
              </div>
            )}
          </div>
        )}
      </TimelineNode>

      {/* Node 3 — When can I go? */}
      {(nearestSlot || donor) && (
        <TimelineNode dot={BL.ink} tag="WHEN CAN I GO?" last>
          {donor && !donor.eligible ? (
            /* Not yet eligible — rally friends instead */
            <div style={{ marginTop: 8 }}>
              <div style={{
                background: BL.fill, border: `1px solid ${BL.hair}`,
                borderRadius: 6, padding: 14, marginBottom: 10,
              }}>
                <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 600, marginBottom: 4 }}>
                  You can donate again in {donor.daysUntilEligible} day{donor.daysUntilEligible !== 1 ? "s" : ""}
                </div>
                <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, lineHeight: 1.5 }}>
                  You're still within your 60-day rest window. But the need is real — get your friends to step up while you recover.
                </div>
              </div>
              <button
                onClick={() => {
                  const msg = `Hey! Singapore's blood reserves need help right now. I can't donate yet but you can — it only takes 15 minutes and saves up to 3 lives. Book a slot here: <link>`;
                  if (navigator.share) {
                    navigator.share({ title: "Donate blood for Singapore", text: msg, url: "<link>" }).catch(() => {});
                  } else {
                    navigator.clipboard?.writeText(msg);
                  }
                }}
                style={{
                  width: "100%", padding: "13px 0",
                  background: BL.ink, color: "#fff", border: "none", borderRadius: 8,
                  fontFamily: BL.sans, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 48,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                Rally friends →
              </button>
            </div>
          ) : nearestSlot ? (
            <div style={{ marginTop: 8, background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 14 }}>
              <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 600 }}>
                {nearestSlot.name || nearestSlot.location}
              </div>
              {nearestSlot.name && nearestSlot.location && (
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 1 }}>
                  {nearestSlot.location}
                </div>
              )}
              <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 3, letterSpacing: 0.3 }}>
                {nearestSlot.date}
                {nearestSlot.startTime ? ` · ${nearestSlot.startTime}` : ""}
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
                style={{ width: "100%", marginTop: 6, padding: "8px 0", background: "none", color: BL.muted, border: "none", fontFamily: BL.sans, fontSize: 13, cursor: "pointer" }}
              >
                See other times
              </button>
            </div>
          ) : (
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6 }}>
              No slots listed yet — check the Drives tab.
            </div>
          )}
        </TimelineNode>
      )}
    </div>
  );
}
