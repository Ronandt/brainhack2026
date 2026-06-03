import { useState } from "react";
import { submitHospitalDemand } from "../../api";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const HOSPITALS = ["Singapore General Hospital", "Tan Tock Seng Hospital", "National University Hospital", "Changi General Hospital", "KK Women's and Children's Hospital", "Ng Teng Fong General Hospital", "Sengkang General Hospital"];

const s = {
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#555", fontSize: 13, marginBottom: 24 },
  two: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  panel: { background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 10, padding: 24 },
  panelTitle: { fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#aaa" },
  panelSub: { color: "#555", fontSize: 12, marginBottom: 20 },
  label: { display: "block", color: "#888", fontSize: 11, marginBottom: 5, marginTop: 14 },
  input: { width: "100%", background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 6, padding: "9px 12px", color: "#f0f0f0", fontSize: 13, outline: "none" },
  select: { width: "100%", background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 6, padding: "9px 12px", color: "#f0f0f0", fontSize: 13, outline: "none" },
  btn: { marginTop: 18, padding: "10px 22px", background: "#c0392b", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  ok: { color: "#2ecc71", fontSize: 12, marginTop: 8 },
  err: { color: "#e74c3c", fontSize: 12, marginTop: 8 },
  infoBox: { background: "#0a0a0f", border: "1px solid #1e1e2e", borderRadius: 8, padding: 16 },
  infoTitle: { fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#888" },
  infoItem: { fontSize: 12, color: "#555", marginBottom: 6, paddingLeft: 12, borderLeft: "2px solid #1e1e2e" },
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
      const res = await submitHospitalDemand({ hospital, bloodType, procedureCount: parseInt(procedureCount), date });
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
      <div style={s.title}>Hospital Demand Input</div>
      <div style={s.sub}>Submit upcoming procedure counts to feed into the 14-day shortage forecast</div>

      <div style={s.two}>
        <div style={s.panel}>
          <div style={s.panelTitle}>Submit Demand Signal</div>
          <div style={s.panelSub}>Procedure counts affect the forecast model for the specified blood type and date.</div>
          <form onSubmit={handleSubmit}>
            <label style={s.label}>Hospital</label>
            <select style={s.select} value={hospital} onChange={e => setHospital(e.target.value)}>
              {HOSPITALS.map(h => <option key={h}>{h}</option>)}
            </select>
            <label style={s.label}>Blood Type Required</label>
            <select style={s.select} value={bloodType} onChange={e => setBloodType(e.target.value)}>
              {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <label style={s.label}>Procedure Count</label>
            <input style={s.input} type="number" min="1" value={procedureCount} onChange={e => setProcedureCount(e.target.value)} placeholder="Number of procedures needing this blood type" required />
            <label style={s.label}>Date of Procedures</label>
            <input style={s.input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <button style={s.btn} disabled={loading}>{loading ? "Submitting…" : "Submit Demand"}</button>
          </form>
          {result && <div style={s.ok}>✓ Demand recorded for {result.bloodType} on {result.date}</div>}
          {error && <div style={s.err}>{error}</div>}
        </div>

        <div>
          <div style={{ ...s.panel, marginBottom: 16 }}>
            <div style={s.panelTitle}>How this works</div>
            <div style={{ marginTop: 8 }}>
              <div style={s.infoItem}>Each submission stores a demand signal in the predictions table tagged to a hospital, blood type, and date.</div>
              <div style={s.infoItem}>The next hourly forecast refresh picks up demand signals and adjusts projected stock depletion rates for that blood type.</div>
              <div style={s.infoItem}>Higher procedure counts shift risk levels earlier in the forecast window, prompting proactive donor recruitment before shortage hits.</div>
            </div>
          </div>

          {submissions.length > 0 && (
            <div style={s.panel}>
              <div style={s.panelTitle}>Recent Submissions (this session)</div>
              {submissions.map((sub, i) => (
                <div key={i} style={{ fontSize: 12, color: "#666", padding: "6px 0", borderBottom: "1px solid #1e1e2e" }}>
                  {sub.hospital.split(" ")[0]} · <span style={{ color: "#aaa" }}>{sub.bloodType}</span> · {sub.procedureCount} procedures · {sub.date}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
