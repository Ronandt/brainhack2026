import { useState, useEffect } from "react";
import { activateSurge, getSurgeMonitor } from "../api";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GEO_TIERS = ["5km", "15km", "island-wide"];

const s = {
  section: { marginBottom: 32 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#666", fontSize: 13, marginBottom: 20 },
  breakGlass: { background: "#1a0000", border: "2px solid #c0392b", borderRadius: 12, padding: 24, marginBottom: 32 },
  bgTitle: { color: "#c0392b", fontWeight: 700, fontSize: 16, marginBottom: 4 },
  bgSub: { color: "#888", fontSize: 12, marginBottom: 20 },
  label: { display: "block", color: "#aaa", fontSize: 12, marginBottom: 6, marginTop: 14 },
  input: { width: "100%", background: "#111", border: "1px solid #333", borderRadius: 6, padding: "9px 12px", color: "#f0f0f0", fontSize: 14, outline: "none" },
  select: { width: "100%", background: "#111", border: "1px solid #333", borderRadius: 6, padding: "9px 12px", color: "#f0f0f0", fontSize: 14, outline: "none" },
  textarea: { width: "100%", background: "#111", border: "1px solid #333", borderRadius: 6, padding: "9px 12px", color: "#f0f0f0", fontSize: 14, outline: "none", resize: "vertical", minHeight: 80 },
  btn: { marginTop: 20, padding: "11px 24px", background: "#c0392b", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnGhost: { padding: "8px 16px", background: "none", color: "#888", border: "1px solid #333", borderRadius: 6, fontSize: 13, cursor: "pointer" },
  alertCard: { background: "#1a1a1a", border: "1px solid #c0392b", borderRadius: 10, padding: 20, marginBottom: 12 },
  alertMeta: { display: "flex", gap: 16, fontSize: 12, color: "#666", marginTop: 8 },
  stat: { textAlign: "center" },
  statNum: { fontSize: 22, fontWeight: 700, color: "#c0392b" },
  statLabel: { fontSize: 11, color: "#666" },
  stats: { display: "flex", gap: 20, margin: "12px 0" },
  err: { color: "#e74c3c", fontSize: 13, marginTop: 10 },
  ok: { color: "#2ecc71", fontSize: 13, marginTop: 10 },
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
      <div style={s.breakGlass}>
        <div style={s.bgTitle}>⚠ Break-Glass: Activate Surge Alert</div>
        <div style={s.bgSub}>Requires HSA admin account + dual sign-off. Notifies eligible donors immediately.</div>
        <form onSubmit={handleActivate}>
          <label style={s.label}>Blood Type Needed</label>
          <select style={s.select} value={bloodType} onChange={e => setBloodType(e.target.value)}>
            {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>

          <label style={s.label}>Geographic Tier</label>
          <select style={s.select} value={geoTier} onChange={e => setGeoTier(e.target.value)}>
            {GEO_TIERS.map(t => <option key={t}>{t}</option>)}
          </select>

          <label style={s.label}>Second Approver ID (dual sign-off)</label>
          <input style={s.input} value={approverId} onChange={e => setApproverId(e.target.value)} placeholder="HSA officer user ID" required />

          <label style={s.label}>Message to Donors</label>
          <textarea style={s.textarea} value={message} onChange={e => setMessage(e.target.value)}
            placeholder={`Urgent: ${bloodType} blood needed. Please donate today.`} />

          <button style={s.btn} disabled={activating}>
            {activating ? "Activating…" : "Activate Surge Alert"}
          </button>
        </form>
        {activateError && <div style={s.err}>{activateError}</div>}
        {activateResult && <div style={s.ok}>✓ Alert {activateResult.alertId} activated — notifications dispatched</div>}
      </div>

      <div style={s.section}>
        <div style={s.title}>Live Monitoring</div>
        <div style={s.sub}>Active surge alerts and real-time response metrics</div>

        {monitorLoading && <div style={{ color: "#666", fontSize: 13 }}>Loading…</div>}
        {monitorError && <div style={s.err}>{monitorError}</div>}
        {!monitorLoading && alerts.length === 0 && (
          <div style={{ color: "#555", fontSize: 13 }}>No active surge alerts.</div>
        )}
        {alerts.map(alert => (
          <div key={alert.alertId} style={s.alertCard}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {alert.bloodType} — {alert.geoTier}
            </div>
            <div style={s.stats}>
              <div style={s.stat}><div style={s.statNum}>{alert.donorsNotified}</div><div style={s.statLabel}>Notified</div></div>
              <div style={s.stat}><div style={s.statNum}>{alert.responses}</div><div style={s.statLabel}>Responses</div></div>
              <div style={s.stat}><div style={s.statNum}>{alert.bookings}</div><div style={s.statLabel}>Bookings</div></div>
            </div>
            <div style={s.alertMeta}>
              <span>ID: {alert.alertId.slice(0, 8)}…</span>
              <span>Activated: {alert.activatedAt?.slice(0, 16).replace("T", " ")}</span>
              <span style={{ color: "#c0392b", fontWeight: 600 }}>{alert.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
