import { useState, useEffect } from "react";
import { getStatus, getForecast } from "../api";
import { BL, riskToNeed } from "../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const s = {
  pageTitle:  { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:    { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 20 },
  section:    { marginBottom: 32 },
  card:       { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 16, marginBottom: 12 },
  chipGrid:   { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 },
  chip:       (need) => ({
    background: BL.need[need].bg,
    border: `1px solid ${BL.need[need].fg}22`,
    borderRadius: 6, padding: "10px 14px", minWidth: 80, textAlign: "center",
  }),
  chipType:   { fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginBottom: 2, letterSpacing: 0.4 },
  chipRisk:   (need) => ({ fontFamily: BL.mono, fontSize: 13, fontWeight: 600, color: BL.need[need].fg }),
  chipUnits:  { fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 },
  banner:     (need) => ({
    background: BL.need[need].bg,
    border: `1px solid ${BL.need[need].fg}33`,
    borderRadius: 6, padding: "14px 18px", marginBottom: 20,
    display: "flex", alignItems: "center", gap: 12,
  }),
  bannerText: (need) => ({ fontFamily: BL.sans, fontSize: 15, fontWeight: 600, color: BL.need[need].fg }),
  controls:   { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" },
  select:     {
    background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "8px 12px", color: BL.ink, fontSize: 13, fontFamily: BL.sans, outline: "none",
  },
  btn:        {
    background: BL.ink, border: "none", borderRadius: 6, padding: "8px 16px",
    color: "#fff", fontSize: 13, fontFamily: BL.sans, fontWeight: 500, cursor: "pointer",
  },
  sectionLabel: { fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 },
  table:      { width: "100%", borderCollapse: "collapse", fontFamily: BL.sans, fontSize: 13 },
  th:         { textAlign: "left", padding: "8px 12px", fontFamily: BL.mono, fontSize: 10, color: BL.muted, borderBottom: `1px solid ${BL.hair}`, letterSpacing: 0.4 },
  td:         { padding: "8px 12px", borderBottom: `1px solid ${BL.hair}`, color: BL.ink2 },
  err:        { fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13 },
  loading:    { fontFamily: BL.sans, color: BL.muted, fontSize: 13 },
  typeHead:   { fontFamily: BL.sans, fontWeight: 600, color: BL.ink, marginBottom: 8, marginTop: 20, fontSize: 13 },
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

  const nationalNeed = riskToNeed(status?.nationalStatus);

  return (
    <div>
      <div style={s.section}>
        <div style={s.pageTitle}>National Blood Status</div>
        <div style={s.pageSub}>Current stock levels across all blood types</div>

        {statusLoading && <div style={s.loading}>Loading status…</div>}
        {status && (
          <>
            <div style={s.banner(nationalNeed)}>
              <div style={{
                width: 8, height: 8, borderRadius: 4,
                background: BL.need[nationalNeed].fg, flexShrink: 0,
              }} />
              <span style={s.bannerText(nationalNeed)}>
                National status: {status.nationalStatus?.toUpperCase()} — {status.asOf}
              </span>
            </div>

            <div style={s.sectionLabel}>By blood type</div>
            <div style={s.chipGrid}>
              {status.byBloodType?.map(item => {
                const need = riskToNeed(item.riskLevel);
                return (
                  <div key={item.bloodType} style={s.chip(need)}>
                    <div style={s.chipType}>{item.bloodType}</div>
                    <div style={s.chipRisk(need)}>{item.riskLevel}</div>
                    <div style={s.chipUnits}>{item.units} units</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div style={s.section}>
        <div style={s.pageTitle}>14-Day Forecast</div>
        <div style={s.pageSub}>Projected shortage risk per blood type</div>
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
          <div key={type} style={s.card}>
            <div style={s.typeHead}>Blood Type {type}</div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>DATE</th>
                  <th style={s.th}>PROJECTED UNITS</th>
                  <th style={s.th}>RISK LEVEL</th>
                </tr>
              </thead>
              <tbody>
                {days.map(day => {
                  const need = riskToNeed(day.riskLevel);
                  return (
                    <tr key={day.date}>
                      <td style={s.td}>{day.date}</td>
                      <td style={{ ...s.td, fontFamily: BL.mono }}>{day.projectedUnits}</td>
                      <td style={s.td}>
                        <span style={{
                          fontFamily: BL.mono, fontSize: 11, fontWeight: 600,
                          color: BL.need[need].fg,
                          background: BL.need[need].bg,
                          padding: "2px 7px", borderRadius: 3,
                        }}>
                          {day.riskLevel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
