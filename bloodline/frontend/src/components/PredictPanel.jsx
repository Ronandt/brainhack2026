import { useState, useEffect } from "react";
import { getStatus, getForecast } from "../api";

const RISK_COLOR = { ok: "#2ecc71", low: "#f39c12", urgent: "#e67e22", critical: "#c0392b" };
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const s = {
  section: { marginBottom: 32 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#666", fontSize: 13, marginBottom: 20 },
  statusRow: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 },
  chip: (risk) => ({
    background: "#1a1a1a", border: `1px solid ${RISK_COLOR[risk] ?? "#333"}`, borderRadius: 8,
    padding: "10px 16px", minWidth: 100, textAlign: "center",
  }),
  chipType: { fontSize: 11, color: "#888", marginBottom: 2 },
  chipRisk: (risk) => ({ fontSize: 16, fontWeight: 700, color: RISK_COLOR[risk] ?? "#fff" }),
  chipUnits: { fontSize: 11, color: "#555" },
  banner: (risk) => ({
    background: RISK_COLOR[risk] ?? "#1a1a1a", borderRadius: 10, padding: "16px 20px",
    marginBottom: 24, display: "flex", alignItems: "center", gap: 12,
  }),
  bannerText: { fontSize: 18, fontWeight: 700, color: "#fff" },
  controls: { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  select: { background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "8px 12px", color: "#f0f0f0", fontSize: 14 },
  btn: { background: "#c0392b", border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 600 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px 12px", fontSize: 12, color: "#666", borderBottom: "1px solid #2a2a2a" },
  td: { padding: "8px 12px", fontSize: 13, borderBottom: "1px solid #1a1a1a" },
  err: { color: "#e74c3c", fontSize: 13 },
  loading: { color: "#666", fontSize: 13 },
};

export default function PredictPanel() {
  const [status, setStatus] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  const [statusLoading, setStatusLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getStatus()
      .then(setStatus)
      .catch(e => setError(e.message))
      .finally(() => setStatusLoading(false));
  }, []);

  async function loadForecast() {
    setForecastLoading(true);
    setError("");
    try {
      const data = await getForecast(selectedType || null);
      setForecast(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setForecastLoading(false);
    }
  }

  return (
    <div>
      <div style={s.section}>
        <div style={s.title}>National Blood Status</div>
        <div style={s.sub}>Current stock levels across all blood types</div>

        {statusLoading && <div style={s.loading}>Loading status…</div>}
        {status && (
          <>
            <div style={s.banner(status.nationalStatus)}>
              <span style={{ fontSize: 24 }}>🩸</span>
              <span style={s.bannerText}>
                National status: {status.nationalStatus.toUpperCase()} — {status.asOf}
              </span>
            </div>
            <div style={s.statusRow}>
              {status.byBloodType?.map(item => (
                <div key={item.bloodType} style={s.chip(item.riskLevel)}>
                  <div style={s.chipType}>{item.bloodType}</div>
                  <div style={s.chipRisk(item.riskLevel)}>{item.riskLevel}</div>
                  <div style={s.chipUnits}>{item.units} units</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={s.section}>
        <div style={s.title}>14-Day Forecast</div>
        <div style={s.sub}>Projected shortage risk per blood type</div>
        <div style={s.controls}>
          <select style={s.select} value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            <option value="">All blood types</option>
            {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button style={s.btn} onClick={loadForecast} disabled={forecastLoading}>
            {forecastLoading ? "Loading…" : "Load Forecast"}
          </button>
        </div>

        {error && <div style={s.err}>{error}</div>}

        {forecast && Object.entries(forecast.forecast).map(([type, days]) => (
          <div key={type} style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#ccc" }}>Blood Type {type}</div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Date</th>
                  <th style={s.th}>Projected Units</th>
                  <th style={s.th}>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day.date}>
                    <td style={s.td}>{day.date}</td>
                    <td style={s.td}>{day.projectedUnits}</td>
                    <td style={{ ...s.td, color: RISK_COLOR[day.riskLevel], fontWeight: 600 }}>
                      {day.riskLevel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
