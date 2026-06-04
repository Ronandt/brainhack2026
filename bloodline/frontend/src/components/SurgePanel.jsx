import { useState, useEffect } from "react";
import { activateSurge, getSurgeMonitor } from "../api";
import { BL } from "../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GEO_TIERS = ["5km", "15km", "island-wide"];

const s = {
  pageTitle:  { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:    { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 20 },
  section:    { marginBottom: 32 },
  breakGlass: {
    background: BL.surgeBg, border: `2px solid ${BL.surge}`,
    borderRadius: 8, padding: 24, marginBottom: 32,
  },
  bgTag:      {
    fontFamily: BL.mono, fontSize: 9, fontWeight: 500, letterSpacing: 0.8,
    textTransform: "uppercase", color: BL.surge, marginBottom: 6, display: "block",
  },
  bgTitle:    { fontFamily: BL.sans, fontSize: 15, fontWeight: 600, color: BL.ink, marginBottom: 4 },
  bgSub:      { fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginBottom: 20 },
  label:      { display: "block", fontFamily: BL.sans, color: BL.muted, fontSize: 12, marginBottom: 5, marginTop: 14 },
  input:      {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "9px 12px", color: BL.ink, fontSize: 13, outline: "none", fontFamily: BL.sans,
  },
  select:     {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "9px 12px", color: BL.ink, fontSize: 13, outline: "none", fontFamily: BL.sans,
  },
  textarea:   {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "9px 12px", color: BL.ink, fontSize: 13, outline: "none", fontFamily: BL.sans,
    resize: "vertical", minHeight: 80,
  },
  btn:        {
    marginTop: 20, padding: "11px 24px", background: BL.surge, color: "#fff",
    border: "none", borderRadius: 6, fontSize: 13, fontFamily: BL.sans,
    fontWeight: 600, cursor: "pointer", width: "100%",
  },
  alertCard:  {
    background: BL.card, border: `1px solid ${BL.hair}`,
    borderRadius: 6, padding: 18, marginBottom: 10,
  },
  alertHead:  { fontFamily: BL.sans, fontWeight: 600, fontSize: 15, color: BL.ink, marginBottom: 6 },
  stats:      { display: "flex", gap: 24, margin: "12px 0" },
  stat:       { textAlign: "center" },
  statNum:    { fontFamily: BL.mono, fontSize: 22, fontWeight: 600, color: BL.red },
  statLabel:  { fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 2 },
  alertMeta:  { display: "flex", gap: 14, fontFamily: BL.mono, fontSize: 10, color: BL.faint, marginTop: 8 },
  statusBadge: (status) => ({
    fontFamily: BL.mono, fontSize: 10, fontWeight: 600, letterSpacing: 0.4,
    color: status === "active" ? BL.need.ok.fg : BL.muted,
  }),
  err:        { fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, marginTop: 10 },
  ok:         { fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 13, marginTop: 10 },
  empty:      { fontFamily: BL.sans, color: BL.faint, fontSize: 13 },
};

export default function SurgePanel() {
  const [bloodType, setBloodType] = useState("O-");
  const [geoTier, setGeoTier] = useState("island-wide");
  const [message, setMessage] = useState("");
  const [approverId, setApproverId] = useState("");
  const [activating, setActivating] = useState(false);
  const [activateResult, setActivateResult] = useState(null);
  const [activateError, setActivateError] = useState("");

  const [alerts, setAlerts] = useState([]);
  const [monitorLoading, setMonitorLoading] = useState(true);
  const [monitorError, setMonitorError] = useState("");

  useEffect(() => {
    getSurgeMonitor()
      .then(d => setAlerts(d.activeAlerts ?? []))
      .catch(e => setMonitorError(e.message))
      .finally(() => setMonitorLoading(false));
  }, []);

  async function handleActivate(e) {
    e.preventDefault();
    setActivating(true); setActivateError(""); setActivateResult(null);
    try {
      const res = await activateSurge({ bloodType, geoTier, message, approverId });
      setActivateResult(res);
    } catch (e) {
      setActivateError(e.message);
    } finally {
      setActivating(false);
    }
  }

  return (
    <div>
      {/* Break-glass form */}
      <div style={s.breakGlass}>
        <span style={s.bgTag}>Break-Glass · Activate Surge Alert</span>
        <div style={s.bgTitle}>Mobilise donors for critical shortage</div>
        <div style={s.bgSub}>
          Requires HSA admin account + dual sign-off. Notifies eligible donors immediately and cannot be undone for 6h.
        </div>
        <form onSubmit={handleActivate}>
          <label style={s.label} htmlFor="surge-blood-type">Blood Type Needed</label>
          <select id="surge-blood-type" style={s.select} value={bloodType} onChange={e => setBloodType(e.target.value)}>
            {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>

          <label style={s.label} htmlFor="surge-geo-tier">Geographic Tier</label>
          <select id="surge-geo-tier" style={s.select} value={geoTier} onChange={e => setGeoTier(e.target.value)}>
            {GEO_TIERS.map(t => <option key={t}>{t}</option>)}
          </select>

          <label style={s.label} htmlFor="surge-approver">Second Approver ID (dual sign-off)</label>
          <input
            id="surge-approver"
            style={s.input} value={approverId}
            onChange={e => setApproverId(e.target.value)}
            placeholder="HSA officer user ID" required
          />

          <label style={s.label} htmlFor="surge-message">Message to Donors</label>
          <textarea
            id="surge-message"
            style={s.textarea} value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={`Urgent: ${bloodType} blood needed. Please donate today.`}
          />

          <button style={s.btn} disabled={activating}>
            {activating ? "Activating…" : "Activate Surge Alert →"}
          </button>
        </form>
        {activateError && <div style={s.err}>{activateError}</div>}
        {activateResult && (
          <div style={s.ok}>✓ Alert {activateResult.alertId} activated — notifications dispatched</div>
        )}
      </div>

      {/* Live monitoring */}
      <div style={s.section}>
        <div style={s.pageTitle}>Live Monitoring</div>
        <div style={s.pageSub}>Active surge alerts and real-time response metrics</div>

        {monitorLoading && <div style={s.empty}>Loading…</div>}
        {monitorError && <div style={s.err}>{monitorError}</div>}
        {!monitorLoading && alerts.length === 0 && (
          <div style={s.empty}>No active surge alerts.</div>
        )}
        {alerts.map(alert => (
          <div key={alert.alertId} style={s.alertCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={s.alertHead}>{alert.bloodType} — {alert.geoTier}</div>
              <span style={s.statusBadge(alert.status)}>{alert.status?.toUpperCase()}</span>
            </div>
            <div style={s.stats}>
              <div style={s.stat}>
                <div style={s.statNum}>{alert.donorsNotified}</div>
                <div style={s.statLabel}>Notified</div>
              </div>
              <div style={s.stat}>
                <div style={s.statNum}>{alert.responses}</div>
                <div style={s.statLabel}>Responses</div>
              </div>
              <div style={s.stat}>
                <div style={s.statNum}>{alert.bookings}</div>
                <div style={s.statLabel}>Bookings</div>
              </div>
            </div>
            <div style={s.alertMeta}>
              <span>ID: {alert.alertId.slice(0, 8)}…</span>
              <span>Activated: {alert.activatedAt?.slice(0, 16).replace("T", " ")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
