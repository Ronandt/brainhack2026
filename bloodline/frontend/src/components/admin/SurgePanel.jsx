import { useState, useEffect } from "react";
import { activateSurge, getAllAlerts } from "../../api";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GEO_TIERS = ["5km", "15km", "island-wide"];

const s = {
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#555", fontSize: 13, marginBottom: 24 },
  two: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  panel: { background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 10, padding: 24 },
  panelTitle: { fontWeight: 700, fontSize: 14, marginBottom: 16, color: "#aaa" },
  label: { display: "block", color: "#888", fontSize: 11, marginBottom: 5, marginTop: 14 },
  input: { width: "100%", background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 6, padding: "9px 12px", color: "#f0f0f0", fontSize: 13, outline: "none" },
  select: { width: "100%", background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 6, padding: "9px 12px", color: "#f0f0f0", fontSize: 13, outline: "none" },
  textarea: { width: "100%", background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 6, padding: "9px 12px", color: "#f0f0f0", fontSize: 13, outline: "none", resize: "vertical", minHeight: 70 },
  btn: { marginTop: 18, padding: "10px 22px", background: "#c0392b", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  alertRow: { background: "#0a0a0f", borderRadius: 8, padding: "12px 14px", marginBottom: 8 },
  alertHeader: { display: "flex", gap: 10, alignItems: "center", marginBottom: 6 },
  bt: { fontWeight: 700, color: "#c0392b", fontSize: 14 },
  geo: { background: "#1e1e2e", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#888" },
  status: (s) => ({ fontSize: 11, fontWeight: 700, color: s === "active" ? "#2ecc71" : "#555" }),
  stats: { display: "flex", gap: 16, fontSize: 12, color: "#555" },
  stat: { textAlign: "center" },
  statNum: { fontSize: 18, fontWeight: 700, color: "#fff" },
  ok: { color: "#2ecc71", fontSize: 12, marginTop: 8 },
  err: { color: "#e74c3c", fontSize: 12, marginTop: 8 },
};

export default function SurgePanel() {
  const [bloodType, setBloodType] = useState("O-");
  const [geoTier, setGeoTier] = useState("island-wide");
  const [message, setMessage] = useState("");
  const [approverId, setApproverId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    getAllAlerts().then(d => setAlerts(d.alerts ?? [])).catch(() => {});
  }, [result]);

  async function handleActivate(e) {
    e.preventDefault();
    setLoading(true); setResult(null); setError("");
    try {
      const res = await activateSurge({ bloodType, geoTier, message, approverId });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={s.title}>Surge Control</div>
      <div style={s.sub}>Activate emergency donor alerts and monitor real-time response</div>

      <div style={s.two}>
        <div style={s.panel}>
          <div style={s.panelTitle}>⚠ Activate Surge Alert</div>
          <form onSubmit={handleActivate}>
            <label style={s.label}>Blood Type</label>
            <select style={s.select} value={bloodType} onChange={e => setBloodType(e.target.value)}>
              {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <label style={s.label}>Geographic Tier</label>
            <select style={s.select} value={geoTier} onChange={e => setGeoTier(e.target.value)}>
              {GEO_TIERS.map(t => <option key={t}>{t}</option>)}
            </select>
            <label style={s.label}>Second Approver ID (dual sign-off)</label>
            <input style={s.input} value={approverId} onChange={e => setApproverId(e.target.value)} placeholder="Second HSA officer's user ID" required />
            <label style={s.label}>Message to Donors</label>
            <textarea style={s.textarea} value={message} onChange={e => setMessage(e.target.value)} placeholder={`Urgent ${bloodType} blood needed at Singapore General Hospital.`} />
            <button style={s.btn} disabled={loading}>{loading ? "Activating…" : "Activate Alert"}</button>
          </form>
          {result && <div style={s.ok}>✓ Alert {result.alertId?.slice(0, 8)}… activated</div>}
          {error && <div style={s.err}>{error}</div>}
        </div>

        <div style={s.panel}>
          <div style={s.panelTitle}>Live Alert Monitor</div>
          {alerts.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>No alerts on record.</div>}
          {alerts.map(a => (
            <div key={a.alertId} style={s.alertRow}>
              <div style={s.alertHeader}>
                <div style={s.bt}>{a.bloodType}</div>
                <div style={s.geo}>{a.geoTier}</div>
                <div style={{ flex: 1 }} />
                <div style={s.status(a.status)}>{a.status}</div>
              </div>
              <div style={s.stats}>
                <div style={s.stat}><div style={s.statNum}>{a.donorsNotified ?? 0}</div><div>Notified</div></div>
                <div style={s.stat}><div style={s.statNum}>{a.responses ?? 0}</div><div>Responses</div></div>
                <div style={s.stat}><div style={s.statNum}>{a.bookings ?? 0}</div><div>Bookings</div></div>
                <div style={{ fontSize: 11, color: "#333", alignSelf: "flex-end" }}>{a.activatedAt?.slice(0, 16).replace("T", " ")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
