import { useState, useEffect } from "react";
import { getBloodStock, getStatus, getAllAlerts, getForecast, getTrafficIncidents } from "../../api";
import { BL } from "../../tokens";
import { OverviewPanelSkeleton } from "../Skeleton";

function statusToNeed(s) {
  return ({ Healthy: "ok", Moderate: "low", Low: "urgent", Critical: "critical" })[s] ?? "ok";
}

// Soft card — shadow depth, no hard border
function Card({ children, style, pad = 18 }) {
  return (
    <div style={{
      background: BL.card,
      borderRadius: 14,
      boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
      padding: pad,
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, sub, right, pad = "14px 18px" }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: pad, borderBottom: `1px solid ${BL.fill}`,
    }}>
      <div>
        <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink }}>{title}</div>
        {sub && <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.faint, marginTop: 3, letterSpacing: 0.5, textTransform: "uppercase" }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

const BLOOD_TYPE_ORDER = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

const BT_COLORS = {
  "O+": "#b83a33", "O-": "#7f1d1d",
  "A+": "#1d4ed8", "A-": "#1e3a8a",
  "B+": "#059669", "B-": "#064e3b",
  "AB+": "#7c3aed", "AB-": "#4c1d95",
};

const BT_THRESHOLDS = {
  "O+":  [65, 40, 18],
  "O-":  [62, 38, 16],
  "A+":  [55, 32, 14],
  "A-":  [60, 36, 15],
  "B+":  [70, 45, 20],
  "B-":  [65, 40, 18],
  "AB+": [78, 52, 22],
  "AB-": [88, 62, 28],
};

// ── Projected stock line chart ────────────────────────────────────────────────
function ForecastChart({ forecast, hovered, setHovered }) {
  const types = BLOOD_TYPE_ORDER;

  const W_vb = 680, H_vb = 210;
  const PAD = { left: 48, right: 40, top: 14, bottom: 30 };
  const cW = W_vb - PAD.left - PAD.right;
  const cH = H_vb - PAD.top - PAD.bottom;

  const days = forecast[types[0]] ?? [];

  function xOf(i)   { return PAD.left + (i / Math.max(days.length - 1, 1)) * cW; }
  function yOf(pct) { return PAD.top + cH - (Math.min(100, Math.max(0, pct)) / 100) * cH; }

  const thresholds = hovered ? BT_THRESHOLDS[hovered] : null;
  const [okMin, lowMin, urgentMin] = thresholds ?? [60, 35, 15];

  const zoneFills = hovered ? [
    { from: 0,         to: urgentMin, need: "critical" },
    { from: urgentMin, to: lowMin,    need: "urgent"   },
    { from: lowMin,    to: okMin,     need: "low"      },
  ] : [];

  const gridLines = hovered
    ? [{ pct: urgentMin, need: "urgent" }, { pct: lowMin, need: "low" }, { pct: okMin, need: "ok" }]
    : [25, 50, 75].map(pct => ({ pct, need: null }));

  return (
    <Card pad={0} style={{ marginBottom: 14 }}>
      <CardHeader
        title="14-day projected stock"
        sub="model · anchored to live Red Cross data · hover a type to see its risk thresholds"
      />
      <div style={{ padding: "14px 18px" }} onMouseLeave={() => setHovered(null)}>
        <svg
          viewBox={`0 0 ${W_vb} ${H_vb}`}
          width="100%"
          style={{ display: "block", overflow: "visible" }}
          onMouseEnter={() => setHovered(null)}
        >
          {zoneFills.map(({ from, to, need }) => (
            <rect key={need}
              x={PAD.left} y={yOf(to)} width={cW} height={Math.max(0, yOf(from) - yOf(to))}
              fill={BL.need[need].bg} opacity={0.6}
            />
          ))}
          {gridLines.map(({ pct, need }) => (
            <g key={pct}>
              <line
                x1={PAD.left} y1={yOf(pct)} x2={PAD.left + cW} y2={yOf(pct)}
                stroke={need ? BL.need[need].fg : BL.hair}
                strokeWidth={need ? 0.8 : 0.5} strokeDasharray="3,4"
                opacity={need ? 0.7 : 1}
              />
              <text x={PAD.left - 5} y={yOf(pct) + 3.5}
                textAnchor="end" fontFamily={BL.mono} fontSize={8.5}
                fill={need ? BL.need[need].fg : BL.muted} fontWeight={need ? 600 : 400}>
                {pct}%
              </text>
            </g>
          ))}
          {hovered && [
            { need: "critical", top: urgentMin,  bottom: 0        },
            { need: "urgent",   top: lowMin,     bottom: urgentMin },
            { need: "low",      top: okMin,      bottom: lowMin    },
            { need: "ok",       top: 100,        bottom: okMin     },
          ].map(({ need, top, bottom }) => {
            const midPct = (top + bottom) / 2;
            return (
              <text key={need}
                x={PAD.left + cW + 4} y={yOf(midPct) + 3.5}
                fontFamily={BL.mono} fontSize={7.5} fill={BL.need[need].fg} fontWeight={600}>
                {BL.need[need].label}
              </text>
            );
          })}
          {days.map((d, i) => {
            if (i % 2 !== 0 && i !== days.length - 1) return null;
            const label = new Date(d.date + "T00:00:00").toLocaleDateString("en-SG", { day: "2-digit", month: "short" });
            return (
              <text key={i} x={xOf(i)} y={H_vb - 4}
                textAnchor="middle" fontFamily={BL.mono} fontSize={8} fill={BL.muted}>
                {label}
              </text>
            );
          })}
          <line x1={xOf(0)} y1={PAD.top} x2={xOf(0)} y2={PAD.top + cH}
            stroke={BL.ink} strokeWidth={1} strokeDasharray="3,3" opacity={0.3}
          />
          <text x={xOf(0) + 3} y={PAD.top + 9} fontFamily={BL.mono} fontSize={7.5} fill={BL.muted}>Today</text>
          {types.map(bt => {
            const pts = forecast[bt] ?? [];
            if (pts.length < 2) return null;
            const active = hovered === null || hovered === bt;
            const isHovered = hovered === bt;
            const points = pts.map((d, i) => `${xOf(i)},${yOf(d.percentage)}`).join(" ");
            const last = pts[pts.length - 1];
            return (
              <g key={bt}>
                <polyline points={points} fill="none" stroke={BT_COLORS[bt]}
                  strokeWidth={isHovered ? 2.4 : 1.5} strokeLinejoin="round" strokeLinecap="round"
                  opacity={active ? 1 : 0.07} style={{ pointerEvents: "none" }}
                />
                <polyline points={points} fill="none" stroke="transparent" strokeWidth={18}
                  onMouseEnter={e => { e.stopPropagation(); setHovered(bt); }}
                  style={{ cursor: "crosshair" }}
                />
                {active && (
                  <circle cx={xOf(0)} cy={yOf(pts[0].percentage)} r={isHovered ? 4 : 2.5}
                    fill={BT_COLORS[bt]} opacity={active ? 1 : 0.07} style={{ pointerEvents: "none" }}
                  />
                )}
                {active && (
                  <text x={xOf(pts.length - 1) + 4} y={yOf(last.percentage) + 3.5}
                    fontFamily={BL.mono} fontSize={isHovered ? 9.5 : 8} fontWeight={isHovered ? 700 : 600}
                    fill={BT_COLORS[bt]} opacity={active ? 1 : 0} style={{ pointerEvents: "none" }}>
                    {bt}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Blood type legend */}
      <div
        style={{ padding: "10px 18px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: `1px solid ${BL.fill}` }}
        onMouseLeave={() => setHovered(null)}
      >
        {types.map(bt => {
          const active = hovered === null || hovered === bt;
          return (
            <button key={bt} onMouseEnter={() => setHovered(bt)}
              style={{
                padding: "4px 10px", borderRadius: 6, cursor: "default",
                border: `1.5px solid ${BT_COLORS[bt]}`,
                background: active ? BT_COLORS[bt] : "transparent",
                color: active ? "#fff" : BT_COLORS[bt],
                fontFamily: BL.mono, fontSize: 10, fontWeight: 600,
                transition: "all 0.1s",
              }}>
              {bt}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ── 14-day shortage heatmap ───────────────────────────────────────────────────
function ShortageHeatmap({ forecast, hovered }) {
  const types = BLOOD_TYPE_ORDER;
  const days = forecast[types[0]] ?? [];

  return (
    <Card pad={0} style={{ marginBottom: 14 }}>
      <CardHeader
        title="14-day shortage heatmap"
        sub={`colour = risk level · value = projected %${hovered ? ` · showing ${hovered}` : ""}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            {["ok", "low", "urgent", "critical"].map(n => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 9, height: 9, background: BL.need[n].bg, border: `1px solid ${BL.need[n].fg}55`, borderRadius: 2 }} />
                <span style={{ fontFamily: BL.mono, fontSize: 8, color: BL.need[n].fg, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {BL.need[n].label}
                </span>
              </div>
            ))}
          </div>
        }
      />
      <div style={{ padding: "14px 18px", overflowX: "auto" }}>
        <div style={{ display: "flex", marginBottom: 6, paddingLeft: 36 }}>
          {days.map((d, i) => (
            <div key={i} style={{
              flex: "0 0 44px", margin: "0 1px", textAlign: "center",
              fontFamily: BL.mono, fontSize: 8,
              color: i === 0 ? BL.ink : BL.faint,
              fontWeight: i === 0 ? 600 : 400, letterSpacing: 0.2,
            }}>
              {i === 0 ? "Today" : new Date(d.date + "T00:00:00").toLocaleDateString("en-SG", { day: "2-digit", month: "short" })}
            </div>
          ))}
        </div>
        {types.map(bt => {
          const isActive = hovered === null || hovered === bt;
          return (
            <div key={bt} style={{
              display: "flex", alignItems: "center", marginBottom: 3,
              opacity: isActive ? 1 : 0.12, transition: "opacity 0.15s",
            }}>
              <div style={{
                width: 36, fontFamily: BL.mono, fontSize: 10, fontWeight: 700,
                color: BT_COLORS[bt], flexShrink: 0, textAlign: "right", paddingRight: 8,
              }}>
                {bt}
              </div>
              {(forecast[bt] ?? []).map((d, i) => {
                const need = d.riskLevel;
                return (
                  <div key={i}
                    title={`${bt} · ${d.date} · ${Math.round(d.percentage)}% · ${need}`}
                    style={{
                      flex: "0 0 44px", height: 36,
                      background: BL.need[need].bg,
                      border: `1px solid ${i === 0 ? BL.need[need].fg + "88" : BL.need[need].fg + "33"}`,
                      borderWidth: i === 0 ? "1px 1px 1px 2px" : "1px",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      borderRadius: 4, margin: "0 1px",
                    }}>
                    <div style={{ fontFamily: BL.mono, fontSize: 9, fontWeight: 700, color: BL.need[need].fg, lineHeight: 1 }}>
                      {Math.round(d.percentage)}%
                    </div>
                    <div style={{ fontFamily: BL.mono, fontSize: 7, color: BL.need[need].fg + "99", marginTop: 1, textTransform: "uppercase", letterSpacing: 0.3 }}>
                      {BL.need[need].label}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function OverviewPanel() {
  const [bloodStock, setBloodStock]         = useState([]);
  const [stockUpdatedAt, setStockUpdatedAt] = useState("");
  const [status, setStatus]                 = useState(null);
  const [alerts, setAlerts]                 = useState([]);
  const [forecast, setForecast]             = useState({});
  const [hovered, setHovered]               = useState(null);
  const [incidents, setIncidents]           = useState([]);
  const [incidentsUpdatedAt, setIncidentsUpdatedAt] = useState("");
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getBloodStock().then(d => { setBloodStock(d.bloodStock ?? []); setStockUpdatedAt(d.updatedAt ?? ""); }),
      getStatus().then(setStatus),
      getAllAlerts().then(d => setAlerts(d.alerts ?? [])),
      getForecast().then(d => setForecast(d.forecast ?? {})),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function loadIncidents() {
      getTrafficIncidents().then(d => {
        setIncidents(d.incidents ?? []);
        setIncidentsUpdatedAt(d.asOf ?? "");
      }).catch(() => {});
    }
    loadIncidents();
    const id = setInterval(loadIncidents, 60000);
    return () => clearInterval(id);
  }, []);

  const stockByType   = Object.fromEntries(bloodStock.map(s => [s.bloodType, s]));
  const activeAlerts  = alerts.filter(a => a.status === "active");
  const criticalTypes = BLOOD_TYPE_ORDER.filter(bt => stockByType[bt] && statusToNeed(stockByType[bt].status) === "critical");
  const urgentCount   = BLOOD_TYPE_ORDER.filter(bt => {
    const n = stockByType[bt] ? statusToNeed(stockByType[bt].status) : null;
    return n === "urgent" || n === "critical";
  }).length || null;

  const hasForecast = Object.keys(forecast).length > 0;

  if (loading) return <OverviewPanelSkeleton />;

  return (
    <div style={{ display: "flex", gap: 0, margin: "-20px -24px", height: "calc(100vh - 48px)", overflow: "hidden" }}>

      {/* ── Main content ─────────────────────────── */}
      <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", minWidth: 0 }}>

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: BL.sans, fontSize: 20, fontWeight: 700, color: BL.ink, letterSpacing: -0.4 }}>
              14-day shortage forecast
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
              Real-time blood supply across Singapore · updated {status?.asOf ?? "—"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={softBtn}>All types ▾</button>
            <button style={softBtn}>14 days ▾</button>
            <button style={outlineBtn}>Export</button>
          </div>
        </div>

        {/* ── KPI row ─────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          {[
            {
              label: "Types at risk",
              value: urgentCount != null ? `${urgentCount} of 8` : "—",
              sub: criticalTypes.length > 0 ? `${criticalTypes.join(", ")} critical` : "monitor daily",
              tone: urgentCount > 0 ? "critical" : null,
            },
            {
              label: "Active surges",
              value: activeAlerts.length,
              sub: activeAlerts.length > 0 ? `${activeAlerts[0].bloodType} · ${activeAlerts[0].geoTier}` : "stand-by",
              tone: activeAlerts.length > 0 ? "urgent" : null,
            },
            {
              label: "National status",
              value: status?.nationalStatus ?? "—",
              sub: "HSA blood supply ops",
              tone: null,
            },
            {
              label: "Total alerts",
              value: alerts.length,
              sub: `${activeAlerts.length} currently active`,
              tone: null,
            },
          ].map((k, i) => (
            <Card key={i} pad={0}>
              <div style={{
                padding: "16px 18px",
                borderLeft: k.tone ? `3px solid ${BL.need[k.tone].fg}` : "3px solid transparent",
                borderRadius: "14px",
              }}>
                <div style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: BL.faint, marginBottom: 8 }}>
                  {k.label}
                </div>
                <div style={{ fontFamily: BL.mono, fontSize: 28, fontWeight: 700, color: BL.ink, letterSpacing: -0.8, lineHeight: 1 }}>
                  {k.value}
                </div>
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: k.tone ? BL.need[k.tone].fg : BL.muted, marginTop: 6 }}>
                  {k.sub}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Live stock grid ──────────────────────── */}
        <Card pad={0} style={{ marginBottom: 14 }}>
          <CardHeader
            title="Live stock by blood type"
            sub={`Red Cross SG · scraped every 15 min${stockUpdatedAt ? ` · ${stockUpdatedAt.slice(0, 16).replace("T", " ")}` : ""}`}
            right={
              <div style={{ display: "flex", gap: 10, fontFamily: BL.mono, fontSize: 9 }}>
                {["ok", "low", "urgent", "critical"].map(k => (
                  <span key={k} style={{ color: BL.need[k].fg }}>● {BL.need[k].label}</span>
                ))}
              </div>
            }
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8, padding: "18px" }}>
            {BLOOD_TYPE_ORDER.map(bt => {
              const info = stockByType[bt];
              const need = info ? statusToNeed(info.status) : "ok";
              return (
                <div key={bt} style={{
                  background: BL.need[need].bg,
                  borderRadius: 10, padding: "14px 8px", textAlign: "center",
                  boxShadow: `0 0 0 1px ${BL.need[need].fg}20`,
                }}>
                  <div style={{ fontFamily: BL.mono, fontSize: 12, fontWeight: 700, color: BL.ink, marginBottom: 4 }}>{bt}</div>
                  <div style={{ fontFamily: BL.mono, fontSize: 22, fontWeight: 700, color: BL.ink, letterSpacing: -0.5, lineHeight: 1 }}>
                    {info ? `${info.percentage}%` : "—"}
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.need[need].fg, marginTop: 5, letterSpacing: 0.4, textTransform: "uppercase" }}>
                    {info?.status ?? need}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Forecast chart + heatmap */}
        {hasForecast && <ForecastChart forecast={forecast} hovered={hovered} setHovered={setHovered} />}
        {hasForecast && <ShortageHeatmap forecast={forecast} hovered={hovered} />}

        {/* Active alerts */}
        {activeAlerts.length > 0 && (
          <Card pad={0}>
            <CardHeader
              title="Active surge alerts"
              sub={`${activeAlerts.length} active`}
              right={
                <span style={{ fontFamily: BL.mono, fontSize: 9, color: BL.need.urgent.fg, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  ● Live
                </span>
              }
            />
            {activeAlerts.map((a, i) => (
              <div key={a.alertId} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "12px 18px", borderTop: i > 0 ? `1px solid ${BL.fill}` : "none",
              }}>
                <div style={{
                  fontFamily: BL.mono, fontWeight: 700, color: "#fff", fontSize: 12,
                  background: BL.surge, borderRadius: 6, padding: "4px 8px", flexShrink: 0,
                }}>
                  {a.bloodType}
                </div>
                <div style={{ flex: 1, fontFamily: BL.sans, fontSize: 13, color: BL.ink }}>
                  {a.geoTier} — {a.message?.slice(0, 60)}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted }}>
                    {a.activatedAt?.slice(0, 16).replace("T", " ")} · {a.donorsNotified ?? 0} notified
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, fontWeight: 600, color: BL.need.ok.fg, marginTop: 2 }}>
                    {a.status?.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* ── Right rail ───────────────────────────── */}
      <div style={{
        width: 288, background: BL.paper,
        borderLeft: `1px solid ${BL.hair}`,
        padding: "24px 20px",
        overflowY: "auto", flexShrink: 0,
      }}>

        {/* Live incidents */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{
              fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase",
              color: incidents.length > 0 ? BL.need.critical.fg : BL.faint,
            }}>
              Live accidents · LTA{incidents.length > 0 ? ` · ${incidents.length}` : ""}
            </div>
            {incidentsUpdatedAt && (
              <span style={{ fontFamily: BL.mono, fontSize: 9, color: BL.faint }}>{incidentsUpdatedAt.slice(11, 16)}</span>
            )}
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {incidents.length === 0 ? (
              <div style={{
                padding: "10px 12px", borderRadius: 8,
                background: BL.need.ok.bg,
                boxShadow: `0 0 0 1px ${BL.need.ok.fg}25`,
              }}>
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, lineHeight: 1.45 }}>
                  No accidents on the road network.
                </div>
              </div>
            ) : (
              incidents.map((inc, i) => {
                const tone = BL.need[inc.tone] ? inc.tone : "critical";
                return (
                  <div key={i} style={{
                    padding: "8px 10px", borderRadius: 8, marginBottom: 6,
                    background: BL.need[tone].bg,
                    boxShadow: `0 0 0 1px ${BL.need[tone].fg}30`,
                  }}>
                    <div style={{
                      fontFamily: BL.sans, fontSize: 12, color: BL.ink, lineHeight: 1.4,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {inc.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Model confidence */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: BL.faint, marginBottom: 10 }}>
            Model confidence
          </div>
          <Card pad={14}>
            {[
              ["Method",   "Seasonality + mean-rev."],
              ["Anchor",   "Live Red Cross SG"],
              ["Horizon",  "14 days"],
              ["Refresh",  "Hourly via EventBridge"],
              ["History",  "2 days · 15-min scrapes"],
            ].map(([l, v], i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 0", borderTop: i ? `1px solid ${BL.fill}` : "none",
              }}>
                <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>{l}</span>
                <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.ink, fontWeight: 600, textAlign: "right", maxWidth: 130 }}>{v}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Blood bank capacity */}
        <div>
          <div style={{ fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: BL.faint, marginBottom: 10 }}>
            Blood bank capacity
          </div>
          <Card pad={14}>
            {[
              ["Bloodbank@HSA",          86, 120],
              ["Bloodbank@Dhoby Ghaut",  54, 90],
              ["Bloodbank@Woodlands",    42, 80],
              ["Bloodbank@Westgate",     38, 70],
            ].map(([b, used, cap], i) => (
              <div key={i} style={{ padding: "6px 0", borderTop: i ? `1px solid ${BL.fill}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{
                    flex: 1, fontFamily: BL.sans, fontSize: 11, color: BL.ink,
                    minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {b.replace("Bloodbank@", "")}
                  </span>
                  <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginLeft: 8, flexShrink: 0 }}>
                    {used}/{cap}
                  </span>
                </div>
                <div style={{ height: 5, background: BL.fill, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    width: `${(used / cap) * 100}%`, height: "100%",
                    background: used / cap > 0.8 ? BL.need.urgent.fg : BL.ink,
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

    </div>
  );
}

const softBtn = {
  height: 30, padding: "0 12px", background: BL.card,
  border: `1px solid ${BL.hair}`, borderRadius: 8,
  fontFamily: BL.sans, fontSize: 12, color: BL.ink, cursor: "pointer",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};
const outlineBtn = {
  height: 30, padding: "0 12px", background: "transparent",
  border: `1px solid ${BL.rule}`, borderRadius: 8,
  fontFamily: BL.sans, fontSize: 12, color: BL.ink, cursor: "pointer",
};
