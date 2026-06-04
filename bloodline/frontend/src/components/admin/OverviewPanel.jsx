import { useState, useEffect } from "react";
import { getStockOverview, getStatus, getAllAlerts } from "../../api";
import { BL } from "../../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function riskLevel(units) {
  if (units > 500) return "ok";
  if (units > 300) return "low";
  if (units > 150) return "urgent";
  return "critical";
}

const s = {
  pageTitle:  { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:    { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 24 },
  kpiGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 24 },
  kpiCard:    { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 16 },
  kpiTag:     { fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6 },
  kpiNum:     (need) => ({
    fontFamily: BL.mono, fontSize: 26, fontWeight: 600, color: BL.ink,
    letterSpacing: -0.6,
  }),
  kpiSub:     (need) => ({ fontFamily: BL.sans, fontSize: 12, color: need ? BL.need[need].fg : BL.muted, marginTop: 2 }),
  stockLabel: { fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 },
  stockGrid:  { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 },
  stockChip:  (need) => ({
    background: BL.need[need].bg,
    border: `1px solid ${BL.need[need].fg}22`,
    borderRadius: 6, padding: "12px 10px", textAlign: "center",
  }),
  chipType:   { fontFamily: BL.mono, fontSize: 12, fontWeight: 600, color: BL.ink, marginBottom: 4 },
  chipUnits:  { fontFamily: BL.mono, fontSize: 20, fontWeight: 600, color: BL.ink },
  chipRisk:   (need) => ({ fontFamily: BL.mono, fontSize: 9, color: BL.need[need].fg, marginTop: 3, letterSpacing: 0.4, textTransform: "uppercase" }),
  alertsLabel:{ fontFamily: BL.mono, fontSize: 10, color: BL.need.urgent.fg, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 },
  alertRow:   {
    background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6,
    padding: "12px 16px", marginBottom: 6, display: "flex", gap: 16, alignItems: "center",
  },
  alertBt:    { fontFamily: BL.mono, fontWeight: 600, color: BL.red, minWidth: 32, fontSize: 14 },
  alertMeta:  { fontFamily: BL.mono, fontSize: 11, color: BL.muted },
  alertMsg:   { fontFamily: BL.sans, fontSize: 13, color: BL.ink2, flex: 1 },
  statusTag:  { fontFamily: BL.mono, fontSize: 10, fontWeight: 600, color: BL.need.ok.fg },
};

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
  const nationalNeed = status?.nationalStatus ?? "ok";
  const criticalCount = stock
    ? Object.entries(stock).filter(([, v]) => riskLevel(v.units) === "critical").length
    : null;

  return (
    <div>
      <div style={s.pageTitle}>14-day shortage forecast</div>
      <div style={s.pageSub}>Real-time blood supply status across Singapore</div>

      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <div style={s.kpiTag}>National Status</div>
          <div style={s.kpiNum(nationalNeed)}>
            {status?.nationalStatus?.toUpperCase() ?? "—"}
          </div>
          <div style={s.kpiSub(nationalNeed)}>{status?.asOf}</div>
        </div>
        <div style={s.kpiCard}>
          <div style={s.kpiTag}>Active Surge Alerts</div>
          <div style={s.kpiNum()}>{activeAlerts.length}</div>
        </div>
        <div style={s.kpiCard}>
          <div style={s.kpiTag}>Total Alerts (all time)</div>
          <div style={s.kpiNum()}>{alerts.length}</div>
        </div>
        <div style={s.kpiCard}>
          <div style={s.kpiTag}>Critical Blood Types</div>
          <div style={{ ...s.kpiNum(), color: criticalCount > 0 ? BL.need.critical.fg : BL.ink }}>
            {criticalCount ?? "—"}
          </div>
        </div>
      </div>

      <div style={s.stockLabel}>Live Stock Levels</div>
      <div style={s.stockGrid}>
        {BLOOD_TYPES.map(bt => {
          const info = stock?.[bt];
          const need = info ? riskLevel(info.units) : "ok";
          return (
            <div key={bt} style={s.stockChip(need)}>
              <div style={s.chipType}>{bt}</div>
              <div style={s.chipUnits}>{info?.units ?? "—"}</div>
              <div style={s.chipRisk(need)}>{need}</div>
            </div>
          );
        })}
      </div>

      {activeAlerts.length > 0 && (
        <>
          <div style={s.alertsLabel}>Active Surge Alerts</div>
          {activeAlerts.map(a => (
            <div key={a.alertId} style={s.alertRow}>
              <div style={s.alertBt}>{a.bloodType}</div>
              <div style={s.alertMsg}>
                {a.geoTier} — {a.message?.slice(0, 60)}
              </div>
              <div>
                <div style={s.alertMeta}>
                  {a.activatedAt?.slice(0, 16).replace("T", " ")} · {a.donorsNotified} notified · {a.bookings} bookings
                </div>
                <div style={s.statusTag}>{a.status?.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
