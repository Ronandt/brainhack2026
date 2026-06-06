import { useState, useEffect } from "react";
import { getBloodStock, getStatus, getAllAlerts, getForecast } from "../../api";
import { BL } from "../../tokens";

function statusToNeed(s) {
  return ({ Healthy: "ok", Moderate: "low", Low: "urgent", Critical: "critical" })[s] ?? "ok";
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

const BT_COLORS = {
  "O+": "#b83a33", "O-": "#7f1d1d",
  "A+": "#1d4ed8", "A-": "#1e3a8a",
  "B+": "#059669", "B-": "#064e3b",
  "AB+": "#7c3aed", "AB-": "#4c1d95",
};

function buildActions(activeAlerts, criticalTypes) {
  const actions = [];
  if (criticalTypes.length > 0)
    actions.push({ tone: "critical", t: `Activate Surge Mode for ${criticalTypes[0]}`, sub: `${criticalTypes[0]} units critically low — activate surge to mobilise donors.` });
  if (activeAlerts.length === 0)
    actions.push({ tone: "low", t: "No active surge alerts", sub: "System is in stand-by. Monitor forecast daily." });
  else
    activeAlerts.slice(0, 2).forEach(a =>
      actions.push({ tone: "urgent", t: `${a.bloodType} surge active · ${a.geoTier}`, sub: `${a.donorsNotified ?? 0} notified · ${a.bookings ?? 0} bookings so far.` })
    );
  actions.push({ tone: "ok", t: "Review pending drives", sub: "Approve community drives to expand collection capacity." });
  return actions.slice(0, 3);
}

// Per-blood-type risk thresholds mirroring predict/handler.py _BT_THRESHOLDS
// [ok_min, low_min, urgent_min] — below urgent_min is critical
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

  // When a type is hovered: type-specific thresholds drive the zone fills + gridlines
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
    <W pad={0} style={{ marginBottom: 14 }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BL.hair}` }}>
        <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink }}>14-day projected stock</div>
        <Tag>model · anchored to live Red Cross data · hover a type to see its risk thresholds</Tag>
      </div>

      <div
        style={{ padding: "12px 16px" }}
        onMouseLeave={() => setHovered(null)}
      >
        <svg
          viewBox={`0 0 ${W_vb} ${H_vb}`}
          width="100%"
          style={{ display: "block", overflow: "visible" }}
          onMouseEnter={() => setHovered(null)}
        >
          {/* Type-specific zone fills — only when a type is hovered */}
          {zoneFills.map(({ from, to, need }) => (
            <rect key={need}
              x={PAD.left} y={yOf(to)} width={cW} height={Math.max(0, yOf(from) - yOf(to))}
              fill={BL.need[need].bg} opacity={0.6}
            />
          ))}

          {/* Gridlines — standard when idle, threshold-aligned when hovered */}
          {gridLines.map(({ pct, need }) => (
            <g key={pct}>
              <line
                x1={PAD.left} y1={yOf(pct)} x2={PAD.left + cW} y2={yOf(pct)}
                stroke={need ? BL.need[need].fg : BL.hair}
                strokeWidth={need ? 0.8 : 0.5}
                strokeDasharray="3,4"
                opacity={need ? 0.7 : 1}
              />
              <text x={PAD.left - 5} y={yOf(pct) + 3.5}
                textAnchor="end" fontFamily={BL.mono} fontSize={8.5}
                fill={need ? BL.need[need].fg : BL.muted} fontWeight={need ? 600 : 400}>
                {pct}%
              </text>
            </g>
          ))}

          {/* Zone labels — placed at midpoint of each zone so they sit inside their band */}
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
                fontFamily={BL.mono} fontSize={7.5} fill={BL.need[need].fg} fontWeight={600}
              >
                {BL.need[need].label}
              </text>
            );
          })}

          {/* X axis date labels */}
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

          {/* Today marker */}
          <line x1={xOf(0)} y1={PAD.top} x2={xOf(0)} y2={PAD.top + cH}
            stroke={BL.ink} strokeWidth={1} strokeDasharray="3,3" opacity={0.35}
          />
          <text x={xOf(0) + 3} y={PAD.top + 9} fontFamily={BL.mono} fontSize={7.5} fill={BL.muted}>Today</text>

          {/* Lines per blood type */}
          {types.map(bt => {
            const pts = forecast[bt] ?? [];
            if (pts.length < 2) return null;
            const active = hovered === null || hovered === bt;
            const isHovered = hovered === bt;
            const points = pts.map((d, i) => `${xOf(i)},${yOf(d.percentage)}`).join(" ");
            const last = pts[pts.length - 1];
            return (
              <g key={bt}>
                {/* Visible line */}
                <polyline
                  points={points}
                  fill="none"
                  stroke={BT_COLORS[bt]}
                  strokeWidth={isHovered ? 2.4 : 1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={active ? 1 : 0.07}
                  style={{ pointerEvents: "none" }}
                />
                {/* Wide transparent hit area — captures hover */}
                <polyline
                  points={points}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={18}
                  onMouseEnter={e => { e.stopPropagation(); setHovered(bt); }}
                  style={{ cursor: "crosshair" }}
                />
                {/* Dot at today */}
                {active && (
                  <circle cx={xOf(0)} cy={yOf(pts[0].percentage)} r={isHovered ? 4 : 2.5}
                    fill={BT_COLORS[bt]} opacity={active ? 1 : 0.07}
                    style={{ pointerEvents: "none" }}
                  />
                )}
                {/* End label — only show when this type is hovered or nothing is hovered */}
                {active && (
                  <text
                    x={xOf(pts.length - 1) + 4} y={yOf(last.percentage) + 3.5}
                    fontFamily={BL.mono} fontSize={isHovered ? 9.5 : 8} fontWeight={isHovered ? 700 : 600}
                    fill={BT_COLORS[bt]} opacity={active ? 1 : 0}
                    style={{ pointerEvents: "none" }}
                  >
                    {bt}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Blood type legend — hover to isolate */}
      <div
        style={{ padding: "8px 16px", display: "flex", gap: 5, flexWrap: "wrap", borderTop: `1px solid ${BL.hair}` }}
        onMouseLeave={() => setHovered(null)}
      >
        {types.map(bt => {
          const active = hovered === null || hovered === bt;
          return (
            <button
              key={bt}
              onMouseEnter={() => setHovered(bt)}
              style={{
                padding: "3px 9px", borderRadius: 4, cursor: "default",
                border: `1.5px solid ${BT_COLORS[bt]}`,
                background: active ? BT_COLORS[bt] : "transparent",
                color: active ? "#fff" : BT_COLORS[bt],
                fontFamily: BL.mono, fontSize: 10, fontWeight: 600,
                transition: "all 0.1s",
              }}
            >
              {bt}
            </button>
          );
        })}
      </div>
    </W>
  );
}

// ── 14-day shortage heatmap ───────────────────────────────────────────────────
function ShortageHeatmap({ forecast, hovered }) {
  const types = BLOOD_TYPE_ORDER;
  const days = forecast[types[0]] ?? [];

  return (
    <W pad={0} style={{ marginBottom: 14 }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BL.hair}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink }}>14-day shortage heatmap</div>
          <Tag>colour = risk level · value = projected %{hovered ? ` · showing ${hovered}` : ""}</Tag>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {["ok", "low", "urgent", "critical"].map(n => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, background: BL.need[n].bg, border: `1px solid ${BL.need[n].fg}66`, borderRadius: 2 }} />
              <span style={{ fontFamily: BL.mono, fontSize: 8, color: BL.need[n].fg, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {BL.need[n].label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 16px", overflowX: "auto" }}>
        {/* Date header */}
        <div style={{ display: "flex", marginBottom: 4, paddingLeft: 36 }}>
          {days.map((d, i) => (
            <div key={i} style={{
              flex: "0 0 44px", margin: "0 1px", textAlign: "center",
              fontFamily: BL.mono, fontSize: 8, color: i === 0 ? BL.ink : BL.muted,
              fontWeight: i === 0 ? 600 : 400, letterSpacing: 0.2,
            }}>
              {i === 0 ? "Today" : new Date(d.date + "T00:00:00").toLocaleDateString("en-SG", { day: "2-digit", month: "short" })}
            </div>
          ))}
        </div>

        {/* Heatmap rows */}
        {types.map(bt => {
          const isActive = hovered === null || hovered === bt;
          return (
            <div key={bt} style={{
              display: "flex", alignItems: "center", marginBottom: 3,
              opacity: isActive ? 1 : 0.15,
              transition: "opacity 0.15s",
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
                  <div key={i} title={`${bt} · ${d.date} · ${Math.round(d.percentage)}% · ${need}`} style={{
                    flex: "0 0 44px", height: 36,
                    background: BL.need[need].bg,
                    border: `1px solid ${i === 0 ? BL.ink : BL.need[need].fg + "44"}`,
                    borderWidth: i === 0 ? "1px 1px 1px 2px" : "1px",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    borderRadius: 2, margin: "0 1px",
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
    </W>
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

  useEffect(() => {
    getBloodStock().then(d => {
      setBloodStock(d.bloodStock ?? []);
      setStockUpdatedAt(d.updatedAt ?? "");
    }).catch(() => {});
    getStatus().then(setStatus).catch(() => {});
    getAllAlerts().then(d => setAlerts(d.alerts ?? [])).catch(() => {});
    getForecast().then(d => setForecast(d.forecast ?? {})).catch(() => {});
  }, []);

  const stockByType  = Object.fromEntries(bloodStock.map(s => [s.bloodType, s]));
  const activeAlerts = alerts.filter(a => a.status === "active");
  const criticalTypes = BLOOD_TYPE_ORDER.filter(bt => stockByType[bt] && statusToNeed(stockByType[bt].status) === "critical");
  const urgentCount = BLOOD_TYPE_ORDER.filter(bt => {
    const n = stockByType[bt] ? statusToNeed(stockByType[bt].status) : null;
    return n === "urgent" || n === "critical";
  }).length || null;

  const actions = buildActions(activeAlerts, criticalTypes);
  const hasForecast = Object.keys(forecast).length > 0;

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
            { l: "TYPES AT RISK",    v: urgentCount != null ? `${urgentCount} of 8` : "—", sub: criticalTypes.length > 0 ? `${criticalTypes.join(", ")} critical` : "monitor daily", tone: urgentCount > 0 ? "critical" : null },
            { l: "ACTIVE SURGES",   v: activeAlerts.length, sub: activeAlerts.length > 0 ? `${activeAlerts[0].bloodType} · ${activeAlerts[0].geoTier}` : "stand-by", tone: activeAlerts.length > 0 ? "urgent" : null },
            { l: "NATIONAL STATUS", v: status?.nationalStatus?.toUpperCase() ?? "—", sub: "HSA blood supply ops", tone: null },
            { l: "TOTAL ALERTS",    v: alerts.length, sub: `${activeAlerts.length} currently active`, tone: null },
          ].map((k, i) => (
            <W key={i} pad={14}>
              <Tag>{k.l}</Tag>
              <div style={{ fontFamily: BL.mono, fontSize: 26, fontWeight: 600, color: BL.ink, marginTop: 4, letterSpacing: -0.6 }}>{k.v}</div>
              <div style={{ fontFamily: BL.sans, fontSize: 11, color: k.tone ? BL.need[k.tone].fg : BL.muted, marginTop: 2 }}>{k.sub}</div>
            </W>
          ))}
        </div>

        {/* Live stock grid */}
        <W pad={0} style={{ marginBottom: 14 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BL.hair}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink }}>Live stock by blood type</div>
              <Tag>Red Cross SG · scraped every 15 min{stockUpdatedAt ? ` · ${stockUpdatedAt.slice(0, 16).replace("T", " ")}` : ""}</Tag>
            </div>
            <div style={{ display: "flex", gap: 10, fontFamily: BL.mono, fontSize: 9 }}>
              {["ok", "low", "urgent", "critical"].map(k => (
                <span key={k} style={{ color: BL.need[k].fg }}>● {BL.need[k].label}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", padding: "16px" }}>
            {BLOOD_TYPE_ORDER.map(bt => {
              const info = stockByType[bt];
              const need = info ? statusToNeed(info.status) : "ok";
              return (
                <div key={bt} style={{
                  background: BL.need[need].bg, border: `1px solid ${BL.need[need].fg}22`,
                  borderRadius: 4, margin: 4, padding: "14px 8px", textAlign: "center",
                }}>
                  <div style={{ fontFamily: BL.mono, fontSize: 13, fontWeight: 700, color: BL.ink }}>{bt}</div>
                  <div style={{ fontFamily: BL.mono, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 4, letterSpacing: -0.5 }}>
                    {info ? `${info.percentage}%` : "—"}
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.need[need].fg, marginTop: 3, letterSpacing: 0.4, textTransform: "uppercase" }}>
                    {info?.status ?? need}
                  </div>
                </div>
              );
            })}
          </div>
        </W>

        {/* Forecast visualisations */}
        {hasForecast && <ForecastChart forecast={forecast} hovered={hovered} setHovered={setHovered} />}
        {hasForecast && <ShortageHeatmap forecast={forecast} hovered={hovered} />}

        {/* Active alerts */}
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
                <div style={{ fontFamily: BL.mono, fontWeight: 600, color: BL.red, fontSize: 14, minWidth: 36 }}>{a.bloodType}</div>
                <div style={{ flex: 1, fontFamily: BL.sans, fontSize: 13, color: BL.ink }}>{a.geoTier} — {a.message?.slice(0, 60)}</div>
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
            <div key={i} style={{ padding: 12, borderRadius: 6, marginBottom: 8, background: BL.need[a.tone].bg, border: `1px solid ${BL.need[a.tone].fg}33` }}>
              <Tag color={BL.need[a.tone].fg}>{BL.need[a.tone].label}</Tag>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500, marginTop: 4 }}>{a.t}</div>
              <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.muted, marginTop: 4, lineHeight: 1.4 }}>{a.sub}</div>
            </div>
          ))}
        </div>

        <Tag style={{ marginTop: 8, display: "block" }}>Model Confidence</Tag>
        <W pad={12} style={{ marginTop: 6 }}>
          {[
            ["Method",       "Seasonality + mean-rev."],
            ["Anchor",       "Live Red Cross SG"],
            ["Horizon",      "14 days"],
            ["Refresh",      "Hourly via EventBridge"],
            ["History",      "2 days · 15-min scrapes"],
          ].map(([l, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: i ? `1px solid ${BL.hair}` : "none" }}>
              <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>{l}</span>
              <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.ink, fontWeight: 600, textAlign: "right", maxWidth: 140 }}>{v}</span>
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
