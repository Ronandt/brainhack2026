import { useState, useEffect } from "react";
import { getStockOverview, getStatus, getAllAlerts } from "../../api";

const RISK_COLOR = { ok: "#2ecc71", low: "#f39c12", urgent: "#e67e22", critical: "#c0392b" };
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const s = {
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#555", fontSize: 13, marginBottom: 24 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 28 },
  card: { background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 10, padding: 18 },
  cardTitle: { fontSize: 11, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  stockGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 28 },
  stockChip: (risk) => ({
    background: "#12121a", border: `1px solid ${RISK_COLOR[risk] ?? "#1e1e2e"}`, borderRadius: 8,
    padding: "12px 10px", textAlign: "center",
  }),
  chipType: { fontSize: 13, fontWeight: 700, color: "#ddd", marginBottom: 4 },
  chipUnits: { fontSize: 20, fontWeight: 700, color: "#fff" },
  chipRisk: (risk) => ({ fontSize: 11, color: RISK_COLOR[risk] ?? "#555", marginTop: 2 }),
  alertRow: { background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 8, padding: "12px 16px", marginBottom: 6, display: "flex", gap: 16, alignItems: "center" },
  alertBt: { fontWeight: 700, color: "#c0392b", minWidth: 32 },
  alertMeta: { color: "#666", fontSize: 12 },
  statNum: { fontSize: 28, fontWeight: 700, color: "#c0392b" },
  statLabel: { fontSize: 12, color: "#555", marginTop: 4 },
};

function riskLevel(units) {
  if (units > 500) return "ok";
  if (units > 300) return "low";
  if (units > 150) return "urgent";
  return "critical";
}

export default function OverviewPanel() {
  const [stock, setStock] = useState(null);
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    getStockOverview().then(d => setStock(d.stock)).catch(() => {});
    getStatus().then(setStatus).catch(() => {});
    getAllAlerts().then(d => setAlerts(d.alerts ?? [])).catch(() => {});
  }, []);

  const activeAlerts = alerts.filter(a => a.status === "active");

  return (
    <div>
      <div style={s.title}>National Overview</div>
      <div style={s.sub}>Real-time blood supply status across Singapore</div>

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardTitle}>National Status</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: RISK_COLOR[status?.nationalStatus] ?? "#fff" }}>
            {status?.nationalStatus?.toUpperCase() ?? "—"}
          </div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{status?.asOf}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Active Surge Alerts</div>
          <div style={s.statNum}>{activeAlerts.length}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Total Alerts (all time)</div>
          <div style={s.statNum}>{alerts.length}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Critical Blood Types</div>
          <div style={s.statNum}>
            {stock ? Object.entries(stock).filter(([, v]) => riskLevel(v.units) === "critical").length : "—"}
          </div>
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#aaa" }}>Live Stock Levels</div>
      <div style={s.stockGrid}>
        {BLOOD_TYPES.map(bt => {
          const info = stock?.[bt];
          const risk = info ? riskLevel(info.units) : "ok";
          return (
            <div key={bt} style={s.stockChip(risk)}>
              <div style={s.chipType}>{bt}</div>
              <div style={s.chipUnits}>{info?.units ?? "—"}</div>
              <div style={s.chipRisk(risk)}>{risk}</div>
            </div>
          );
        })}
      </div>

      {activeAlerts.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#c0392b" }}>Active Surge Alerts</div>
          {activeAlerts.map(a => (
            <div key={a.alertId} style={s.alertRow}>
              <div style={s.alertBt}>{a.bloodType}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#ddd" }}>{a.geoTier} — {a.message?.slice(0, 60)}</div>
                <div style={s.alertMeta}>{a.activatedAt?.slice(0, 16).replace("T", " ")} · {a.donorsNotified} notified · {a.bookings} bookings</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
