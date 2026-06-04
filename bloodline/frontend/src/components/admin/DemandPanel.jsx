import { useState } from "react";
import { submitHospitalDemand } from "../../api";
import { BL } from "../../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const HOSPITALS = [
  "Singapore General Hospital", "Tan Tock Seng Hospital",
  "National University Hospital", "Changi General Hospital",
  "KK Women's and Children's Hospital", "Ng Teng Fong General Hospital",
  "Sengkang General Hospital",
];

const s = {
  pageTitle:  { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:    { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 24 },
  two:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  panel:      { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 22 },
  panelTag:   { fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6 },
  panelTitle: { fontFamily: BL.sans, fontWeight: 600, fontSize: 14, color: BL.ink, marginBottom: 4 },
  panelSub:   { fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginBottom: 18 },
  label:      { display: "block", fontFamily: BL.sans, color: BL.muted, fontSize: 12, marginBottom: 5, marginTop: 14 },
  input:      {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "9px 12px", color: BL.ink, fontSize: 13, fontFamily: BL.sans, outline: "none",
  },
  select:     {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "9px 12px", color: BL.ink, fontSize: 13, fontFamily: BL.sans, outline: "none",
  },
  btn:        {
    marginTop: 18, padding: "10px 22px", background: BL.ink, color: "#fff",
    border: "none", borderRadius: 6, fontSize: 13, fontFamily: BL.sans, fontWeight: 500, cursor: "pointer",
  },
  infoBox:    { background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 14, marginBottom: 12 },
  infoItem:   {
    fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginBottom: 8,
    paddingLeft: 12, borderLeft: `2px solid ${BL.rule}`, lineHeight: 1.5,
  },
  recentCard: { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 16, marginTop: 0 },
  recentRow:  {
    fontFamily: BL.mono, fontSize: 11, color: BL.muted,
    padding: "6px 0", borderBottom: `1px solid ${BL.hair}`,
  },
  ok:         { fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 12, marginTop: 8 },
  err:        { fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginTop: 8 },
};

export default function DemandPanel() {
  const [hospital, setHospital] = useState(HOSPITALS[0]);
  const [bloodType, setBloodType] = useState("O+");
  const [procedureCount, setProcedureCount] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setResult(null); setError("");
    try {
      const res = await submitHospitalDemand({ hospital, bloodType, procedureCount: Number.parseInt(procedureCount, 10), date });
      setResult(res);
      setSubmissions(prev => [{ hospital, bloodType, procedureCount, date }, ...prev.slice(0, 9)]);
      setProcedureCount(""); setDate("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={s.pageTitle}>Hospital demand input</div>
      <div style={s.pageSub}>Submit upcoming procedure counts to feed into the 14-day shortage forecast</div>

      <div style={s.two}>
        {/* Form */}
        <div style={s.panel}>
          <div style={s.panelTag}>Step 1 · Submit Demand Signal</div>
          <div style={s.panelSub}>Procedure counts affect the forecast model for the specified blood type and date.</div>
          <form onSubmit={handleSubmit}>
            <label style={s.label} htmlFor="dem-hospital">Hospital</label>
            <select id="dem-hospital" style={s.select} value={hospital} onChange={e => setHospital(e.target.value)}>
              {HOSPITALS.map(h => <option key={h}>{h}</option>)}
            </select>

            <label style={s.label} htmlFor="dem-blood-type">Blood Type Required</label>
            <select id="dem-blood-type" style={s.select} value={bloodType} onChange={e => setBloodType(e.target.value)}>
              {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>

            <label style={s.label} htmlFor="dem-count">Procedure Count</label>
            <input id="dem-count" style={s.input} type="number" min="1"
              value={procedureCount} onChange={e => setProcedureCount(e.target.value)}
              placeholder="Number of procedures needing this blood type" required />

            <label style={s.label} htmlFor="dem-date">Date of Procedures</label>
            <input id="dem-date" style={s.input} type="date"
              value={date} onChange={e => setDate(e.target.value)} required />

            <button style={s.btn} disabled={loading}>{loading ? "Submitting…" : "Submit Demand"}</button>
          </form>
          {result && <div style={s.ok}>✓ Demand recorded for {result.bloodType} on {result.date}</div>}
          {error  && <div style={s.err}>{error}</div>}
        </div>

        {/* Info + recent */}
        <div>
          <div style={s.infoBox}>
            <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>
              How this works
            </div>
            <div style={s.infoItem}>Each submission stores a demand signal tagged to a hospital, blood type, and date.</div>
            <div style={s.infoItem}>The next hourly forecast refresh picks up demand signals and adjusts projected stock depletion rates.</div>
            <div style={{ ...s.infoItem, marginBottom: 0 }}>Higher procedure counts shift risk levels earlier in the forecast window, prompting proactive donor recruitment before shortage hits.</div>
          </div>

          {submissions.length > 0 && (
            <div style={s.recentCard}>
              <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>
                Recent Submissions · This Session
              </div>
              {submissions.map((sub, i) => (
                <div key={`${sub.hospital}-${sub.bloodType}-${sub.date}-${i}`} style={{ ...s.recentRow, borderBottom: i < submissions.length - 1 ? `1px solid ${BL.hair}` : "none" }}>
                  {sub.hospital.split(" ")[0]} · <span style={{ color: BL.ink }}>{sub.bloodType}</span> · {sub.procedureCount} procedures · {sub.date}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
