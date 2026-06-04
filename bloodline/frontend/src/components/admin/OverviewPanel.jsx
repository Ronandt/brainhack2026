import { useState, useEffect } from "react";
import { getStockOverview, getStatus, getAllAlerts } from "../../api";
import { BL } from "../../tokens";

function riskLevel(units) {
  if (units > 500) return "ok";
  if (units > 300) return "low";
  if (units > 150) return "urgent";
  return "critical";
}

function Tag({ children, color, bg }) {
  return (
    <span style={{
      fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase",
      color: color || BL.muted,
      ...(bg ? { background: bg, padding: "2px 6px", borderRadius: 3 } : {}),
    }}>
      {children}
    </span>
  );
}

function W({ children, style, pad = 14 }) {
  return (
    <div style={{
      background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6,
      padding: pad, ...style,
    }}>
      {children}
    </div>
  );
}

const BLOOD_TYPE_ORDER = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

// Static recommended actions (prototype pattern)
function buildActions(activeAlerts, criticalTypes) {
  const actions = [];
  if (criticalTypes.length > 0) {
    actions.push({ tone: "critical", t: `Activate Surge Mode for ${criticalTypes[0]}`, sub: `${criticalTypes[0]} units critically low — activate surge to mobilise donors.` });
  }
  if (activeAlerts.length === 0) {
    actions.push({ tone: "low", t: "No active surge alerts", sub: "System is in stand-by. Monitor forecast daily." });
  } else {
    activeAlerts.slice(0, 2).forEach(a => {
      actions.push({ tone: "urgent", t: `${a.bloodType} surge active · ${a.geoTier}`, sub: `${a.donorsNotified ?? 0} notified · ${a.bookings ?? 0} bookings so far.` });
    });
  }
  actions.push({ tone: "ok", t: "Review pending drives", sub: "Approve community drives to expand collection capacity." });
  return actions.slice(0, 3);
}

export default function OverviewPanel() {
  const [stock, setStock]   = useState(null);
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    getStockOverview().then(d => setStock(d.stock)).catch(() => {});
    getStatus().then(setStatus).catch(() => {});
    getAllAlerts().then(d => setAlerts(d.alerts ?? [])).catch(() => {});
  }, []);

  const activeAlerts = alerts.filter(a => a.status === "active");
  const criticalTypes = stock
    ? BLOOD_TYPE_ORDER.filter(bt => stock[bt] && riskLevel(stock[bt].units) === "critical")
    : [];
  const urgentCount = stock
    ? BLOOD_TYPE_ORDER.filter(bt => stock[bt] && (riskLevel(stock[bt].units) === "urgent" || riskLevel(stock[bt].units) === "critical")).length
    : null;

  const actions = buildActions(activeAlerts, criticalTypes);

  return (
    <div style={{ display: "flex", gap: 0, margin: "-20px -24px", height: "calc(100vh - 48px)", overflow: "hidden" }}>
      {/* ── Main content ────────────────────────── */}
      <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", minWidth: 0 }}>

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
              14-day shortage forecast
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
              Real-time blood supply status across Singapore · updated {status?.asOf ?? "—"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={softBtn}>All types ▾</button>
            <button style={softBtn}>14 days ▾</button>
            <button style={outlineBtn}>Export</button>
          </div>
        </div>

        {/* KPI grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          {[
            {
              l: "TYPES AT RISK",
              v: urgentCount != null ? `${urgentCount} of 8` : "—",
              sub: criticalTypes.length > 0 ? `${criticalTypes.join(", ")} critical` : "monitor daily",
              tone: urgentCount > 0 ? "critical" : null,
            },
            {
              l: "ACTIVE SURGES",
              v: activeAlerts.length,
              sub: activeAlerts.length > 0 ? `${activeAlerts[0].bloodType} · ${activeAlerts[0].geoTier}` : "stand-by",
              tone: activeAlerts.length > 0 ? "urgent" : null,
            },
            {
              l: "NATIONAL STATUS",
              v: status?.nationalStatus?.toUpperCase() ?? "—",
              sub: "HSA blood supply ops",
              tone: null,
            },
            {
              l: "TOTAL ALERTS",
              v: alerts.length,
              sub: `${activeAlerts.length} currently active`,
              tone: null,
            },
          ].map((k, i) => (
            <W key={i} pad={14}>
              <Tag>{k.l}</Tag>
              <div style={{ fontFamily: BL.mono, fontSize: 26, fontWeight: 600, color: BL.ink, marginTop: 4, letterSpacing: -0.6 }}>
                {k.v}
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 11, color: k.tone ? BL.need[k.tone].fg : BL.muted, marginTop: 2 }}>
                {k.sub}
              </div>
            </W>
          ))}
        </div>

        {/* Stock grid */}
        <W pad={0} style={{ marginBottom: 16 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BL.hair}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink }}>Live stock by blood type</div>
              <Tag>units in reserve · tint = risk level</Tag>
            </div>
            <div style={{ display: "flex", gap: 10, fontFamily: BL.mono, fontSize: 9 }}>
              {["ok", "low", "urgent", "critical"].map(k => (
                <span key={k} style={{ color: BL.need[k].fg }}>● {BL.need[k].label}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 0, padding: "16px" }}>
            {BLOOD_TYPE_ORDER.map(bt => {
              const info = stock?.[bt];
              const need = info ? riskLevel(info.units) : "ok";
              return (
                <div key={bt} style={{
                  background: BL.need[need].bg,
                  border: `1px solid ${BL.need[need].fg}22`,
                  borderRadius: 4, margin: 4, padding: "14px 8px", textAlign: "center",
                }}>
                  <div style={{ fontFamily: BL.mono, fontSize: 13, fontWeight: 700, color: BL.ink }}>{bt}</div>
                  <div style={{ fontFamily: BL.mono, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 4, letterSpacing: -0.5 }}>
                    {info?.units ?? "—"}
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.need[need].fg, marginTop: 3, letterSpacing: 0.4, textTransform: "uppercase" }}>
                    {need}
                  </div>
                </div>
              );
            })}
          </div>
        </W>

        {/* Active alerts list */}
        {activeAlerts.length > 0 && (
          <W pad={0}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BL.hair}` }}>
              <Tag color={BL.need.urgent.fg}>Active Surge Alerts · {activeAlerts.length}</Tag>
            </div>
            {activeAlerts.map((a, i) => (
              <div key={a.alertId} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "12px 16px", borderTop: i > 0 ? `1px solid ${BL.hair}` : "none",
              }}>
                <div style={{ fontFamily: BL.mono, fontWeight: 600, color: BL.red, fontSize: 14, minWidth: 36 }}>
                  {a.bloodType}
                </div>
                <div style={{ flex: 1, fontFamily: BL.sans, fontSize: 13, color: BL.ink }}>
                  {a.geoTier} — {a.message?.slice(0, 60)}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted }}>
                    {a.activatedAt?.slice(0, 16).replace("T", " ")} · {a.donorsNotified ?? 0} notified · {a.bookings ?? 0} bookings
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, fontWeight: 600, color: BL.need.ok.fg, marginTop: 2 }}>
                    {a.status?.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </W>
        )}
      </div>

      {/* ── Right rail ──────────────────────────── */}
      <div style={{ width: 300, borderLeft: `1px solid ${BL.hair}`, background: "#fdfcf8", padding: 20, overflowY: "auto", flexShrink: 0 }}>
        <Tag>Recommended Actions</Tag>
        <div style={{ marginTop: 8 }}>
          {actions.map((a, i) => (
            <div key={i} style={{
              padding: 12, borderRadius: 6, marginBottom: 8,
              background: BL.need[a.tone].bg, border: `1px solid ${BL.need[a.tone].fg}33`,
            }}>
              <Tag color={BL.need[a.tone].fg}>{BL.need[a.tone].label}</Tag>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500, marginTop: 4 }}>{a.t}</div>
              <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.muted, marginTop: 4, lineHeight: 1.4 }}>{a.sub}</div>
            </div>
          ))}
        </div>

        <Tag style={{ marginTop: 8, display: "block" }}>Model Confidence</Tag>
        <W pad={12} style={{ marginTop: 6 }}>
          {[
            ["7-day AUC",    "0.91"],
            ["14-day AUC",   "0.84"],
            ["Last retrain", "16 May 2026"],
            ["Features",     "46 active"],
          ].map(([l, v], i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", padding: "6px 0",
              borderTop: i ? `1px solid ${BL.hair}` : "none",
            }}>
              <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>{l}</span>
              <span style={{ fontFamily: BL.mono, fontSize: 12, color: BL.ink, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </W>

        <Tag style={{ marginTop: 16, display: "block" }}>Blood Bank Capacity</Tag>
        <W pad={12} style={{ marginTop: 6 }}>
          {[
            ["Bloodbank@HSA", 86, 120],
            ["Bloodbank@Dhoby Ghaut", 54, 90],
            ["Bloodbank@Woodlands", 42, 80],
            ["Bloodbank@Westgate", 38, 70],
          ].map(([b, used, cap], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
              <span style={{ flex: 1, fontFamily: BL.sans, fontSize: 11, color: BL.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b}</span>
              <div style={{ width: 60, height: 6, background: BL.hair, borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
                <div style={{ width: `${(used / cap) * 100}%`, height: "100%", background: BL.ink }} />
              </div>
              <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, width: 40, textAlign: "right", flexShrink: 0 }}>{used}/{cap}</span>
            </div>
          ))}
        </W>
      </div>
    </div>
  );
}

const softBtn = {
  height: 28, padding: "0 10px", background: BL.fill, border: `1px solid ${BL.hair}`,
  borderRadius: 6, fontFamily: BL.sans, fontSize: 12, color: BL.ink, cursor: "pointer",
};
const outlineBtn = {
  height: 28, padding: "0 10px", background: "transparent", border: `1px solid ${BL.ink}`,
  borderRadius: 6, fontFamily: BL.sans, fontSize: 12, color: BL.ink, cursor: "pointer",
};
