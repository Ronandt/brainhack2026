import { useState, useEffect } from "react";
import { activateSurge, getAllAlerts } from "../../api";
import { BL } from "../../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GEO_TIERS = ["5km", "15km", "island-wide"];

const s = {
  pageTitle:   { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:     { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 24 },
  two:         { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  panel:       { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 22 },
  panelTag:    { fontFamily: BL.mono, fontSize: 9, color: BL.surge, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  panelTitle:  { fontFamily: BL.sans, fontWeight: 600, fontSize: 14, marginBottom: 14, color: BL.ink },
  label:       { display: "block", fontFamily: BL.sans, color: BL.muted, fontSize: 12, marginBottom: 5, marginTop: 14 },
  input:       {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "9px 12px", color: BL.ink, fontSize: 13, fontFamily: BL.sans, outline: "none",
  },
  select:      {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "9px 12px", color: BL.ink, fontSize: 13, fontFamily: BL.sans, outline: "none",
  },
  textarea:    {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "9px 12px", color: BL.ink, fontSize: 13, fontFamily: BL.sans, outline: "none",
    resize: "vertical", minHeight: 70,
  },
  btn:         {
    marginTop: 18, padding: "10px 22px", background: BL.surge, color: "#fff",
    border: "none", borderRadius: 6, fontSize: 13, fontFamily: BL.sans, fontWeight: 600, cursor: "pointer",
  },
  alertRow:    { background: BL.fill, borderRadius: 6, padding: "12px 14px", marginBottom: 8 },
  alertHeader: { display: "flex", gap: 10, alignItems: "center", marginBottom: 8 },
  bt:          { fontFamily: BL.mono, fontWeight: 600, color: BL.red, fontSize: 14 },
  geoTag:      {
    fontFamily: BL.mono, fontSize: 10, background: BL.hair, borderRadius: 3,
    padding: "2px 7px", color: BL.muted,
  },
  statusTag:   (active) => ({
    fontFamily: BL.mono, fontSize: 10, fontWeight: 600,
    color: active ? BL.need.ok.fg : BL.muted,
  }),
  stats:       { display: "flex", gap: 20, fontFamily: BL.mono, fontSize: 11 },
  stat:        { textAlign: "center" },
  statNum:     { fontSize: 18, fontWeight: 600, color: BL.ink },
  statLabel:   { fontSize: 9, color: BL.muted, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 2 },
  ts:          { fontFamily: BL.mono, fontSize: 10, color: BL.faint, alignSelf: "flex-end" },
  empty:       { fontFamily: BL.sans, color: BL.faint, fontSize: 13 },
  ok:          { fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 12, marginTop: 8 },
  err:         { fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginTop: 8 },
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
      <div style={s.pageTitle}>Surge Mode activation</div>
      <div style={s.pageSub}>Mobilise the donor pool when forecasted shortage exceeds the response threshold. Requires Director sign-off.</div>

      <div style={s.two}>
        {/* Activate form */}
        <div style={{ ...s.panel, border: `2px solid ${BL.surge}`, background: BL.surgeBg }}>
          <div style={s.panelTag}>Break Glass · Activate Surge Alert</div>
          <form onSubmit={handleActivate}>
            <label style={s.label} htmlFor="asc-blood-type">Blood Type</label>
            <select id="asc-blood-type" style={s.select} value={bloodType} onChange={e => setBloodType(e.target.value)}>
              {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>

            <label style={s.label} htmlFor="asc-geo-tier">Geographic Tier</label>
            <select id="asc-geo-tier" style={s.select} value={geoTier} onChange={e => setGeoTier(e.target.value)}>
              {GEO_TIERS.map(t => <option key={t}>{t}</option>)}
            </select>

            <label style={s.label} htmlFor="asc-approver">Second Approver ID (dual sign-off)</label>
            <input id="asc-approver" style={s.input} value={approverId}
              onChange={e => setApproverId(e.target.value)}
              placeholder="Second HSA officer's user ID" required />

            <label style={s.label} htmlFor="asc-message">Message to Donors</label>
            <textarea id="asc-message" style={s.textarea} value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Urgent ${bloodType} blood needed at Singapore General Hospital.`} />

            <button style={s.btn} disabled={loading}>
              {loading ? "Activating…" : "Activate Surge Mode →"}
            </button>
          </form>
          {result && <div style={s.ok}>✓ Alert {result.alertId?.slice(0, 8)}… activated</div>}
          {error  && <div style={s.err}>{error}</div>}
        </div>

        {/* Live monitor */}
        <div style={s.panel}>
          <div style={s.panelTitle}>Live Alert Monitor</div>
          {alerts.length === 0
            ? <div style={s.empty}>No alerts on record.</div>
            : alerts.map(a => (
              <div key={a.alertId} style={s.alertRow}>
                <div style={s.alertHeader}>
                  <div style={s.bt}>{a.bloodType}</div>
                  <div style={s.geoTag}>{a.geoTier}</div>
                  <div style={{ flex: 1 }} />
                  <div style={s.statusTag(a.status === "active")}>{a.status?.toUpperCase()}</div>
                </div>
                <div style={s.stats}>
                  <div style={s.stat}><div style={s.statNum}>{a.donorsNotified ?? 0}</div><div style={s.statLabel}>Notified</div></div>
                  <div style={s.stat}><div style={s.statNum}>{a.responses ?? 0}</div><div style={s.statLabel}>Responses</div></div>
                  <div style={s.stat}><div style={s.statNum}>{a.bookings ?? 0}</div><div style={s.statLabel}>Bookings</div></div>
                  <div style={s.ts}>{a.activatedAt?.slice(0, 16).replace("T", " ")}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
