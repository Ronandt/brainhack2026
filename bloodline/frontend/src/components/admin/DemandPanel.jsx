import { useState } from "react";
import { submitHospitalDemand } from "../../api";
import { BL } from "../../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const HOSPITALS   = [
  "Singapore General Hospital",
  "Tan Tock Seng Hospital",
  "National University Hospital",
  "Changi General Hospital",
  "KK Women's and Children's Hospital",
  "Ng Teng Fong General Hospital",
  "Sengkang General Hospital",
];

function Tag({ children, color }) {
  return (
    <span style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: color || BL.muted }}>
      {children}
    </span>
  );
}

function Card({ children, style, pad = 20 }) {
  return (
    <div style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: pad, ...style }}>
      {children}
    </div>
  );
}

export default function DemandPanel() {
  const [hospital,       setHospital]       = useState(HOSPITALS[0]);
  const [bloodType,      setBloodType]      = useState("O+");
  const [procedureCount, setProcedureCount] = useState("");
  const [date,           setDate]           = useState("");
  const [loading,        setLoading]        = useState(false);
  const [result,         setResult]         = useState(null);
  const [error,          setError]          = useState("");
  const [submissions,    setSubmissions]    = useState([]);

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

  const labelStyle = { display: "block", fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginBottom: 5, marginTop: 16 };
  const inputStyle = {
    width: "100%", background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 10,
    padding: "9px 12px", color: BL.ink, fontSize: 13, fontFamily: BL.sans, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
          Hospital demand input
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
          Submit upcoming procedure counts to feed into the 14-day shortage forecast
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Form */}
        <Card pad={20}>
          <Tag>Step 1 · Submit Demand Signal</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 6, marginBottom: 4 }}>
            Procedure counts affect the forecast model for the specified blood type and date.
          </div>

          <form onSubmit={handleSubmit}>
            <label style={labelStyle} htmlFor="dem-hospital">Hospital</label>
            <select id="dem-hospital" style={inputStyle} value={hospital} onChange={e => setHospital(e.target.value)}>
              {HOSPITALS.map(h => <option key={h}>{h}</option>)}
            </select>

            <label style={labelStyle} htmlFor="dem-blood-type">Blood type required</label>
            <select id="dem-blood-type" style={inputStyle} value={bloodType} onChange={e => setBloodType(e.target.value)}>
              {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>

            <label style={labelStyle} htmlFor="dem-count">Procedure count</label>
            <input
              id="dem-count"
              style={inputStyle}
              type="number"
              min="1"
              value={procedureCount}
              onChange={e => setProcedureCount(e.target.value)}
              placeholder="Number of procedures needing this blood type"
              required
            />

            <label style={labelStyle} htmlFor="dem-date">Date of procedures</label>
            <input
              id="dem-date"
              style={inputStyle}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />

            <button
              style={{
                marginTop: 18, width: "100%", padding: "11px 0",
                background: BL.ink, color: "#fff", border: "none", borderRadius: 10,
                fontFamily: BL.sans, fontSize: 13, fontWeight: 500, cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
              disabled={loading}
            >
              {loading ? "Submitting…" : "Submit demand"}
            </button>
          </form>
          {result && (
            <div style={{ fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 12, marginTop: 10 }}>
              ✓ Demand recorded for {result.bloodType} on {result.date}
            </div>
          )}
          {error && (
            <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginTop: 10 }}>
              {error}
            </div>
          )}
        </Card>

        {/* Info + recent */}
        <div>
          <Card pad={16}>
            <Tag>How this works</Tag>
            <div style={{ marginTop: 12 }}>
              {[
                "Each submission stores a demand signal tagged to a hospital, blood type, and date.",
                "The next hourly forecast refresh picks up demand signals and adjusts projected stock depletion rates.",
                "Higher procedure counts shift risk levels earlier in the forecast window, prompting proactive donor recruitment before shortage hits.",
              ].map((text, i) => (
                <div key={i} style={{
                  fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginBottom: i < 2 ? 10 : 0,
                  paddingLeft: 12, borderLeft: `2px solid ${BL.fill}`, lineHeight: 1.5,
                }}>
                  {text}
                </div>
              ))}
            </div>
          </Card>

          {submissions.length > 0 && (
            <Card pad={16} style={{ marginTop: 14 }}>
              <Tag>Recent submissions · this session</Tag>
              <div style={{ marginTop: 10 }}>
                {submissions.map((sub, i) => (
                  <div key={`${sub.hospital}-${sub.bloodType}-${sub.date}-${i}`} style={{
                    fontFamily: BL.mono, fontSize: 11, color: BL.muted,
                    padding: "8px 0",
                    borderBottom: i < submissions.length - 1 ? `1px solid ${BL.fill}` : "none",
                  }}>
                    {sub.hospital.split(" ")[0]} · <span style={{ color: BL.ink }}>{sub.bloodType}</span> · {sub.procedureCount} procedures · {sub.date}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
