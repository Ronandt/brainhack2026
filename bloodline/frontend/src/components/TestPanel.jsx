import { useState } from "react";
import { getDiagnostics, triggerFunction, getStatus, getForecast, getDonor, getSurgeMonitor, getDrives, getRetainStats } from "../api";
import { BL } from "../tokens";

const STATUS_COLOR = {
  ok:       BL.need.ok.fg,
  error:    BL.need.critical.fg,
  empty:    BL.need.low.fg,
  degraded: BL.need.urgent.fg,
};
const STATUS_BG = {
  ok:       BL.need.ok.bg,
  error:    BL.need.critical.bg,
  empty:    BL.need.low.bg,
  degraded: BL.need.urgent.bg,
};
const STATUS_ICON = { ok: "✓", error: "✗", empty: "⚠", degraded: "⚠" };

const s = {
  pageTitle:     { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:       { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 24 },
  section:       { marginBottom: 28 },
  sectionLabel:  { fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 },
  checkRow:      { display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, marginBottom: 5 },
  dot:           (status) => ({ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: STATUS_COLOR[status] ?? BL.faint }),
  rowLabel:      { fontFamily: BL.sans, flex: 1, fontSize: 13, color: BL.ink },
  rowMeta:       { fontFamily: BL.mono, fontSize: 11, color: BL.muted },
  badge:         (status) => ({
    fontFamily: BL.mono, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
    background: STATUS_BG[status] ?? BL.fill,
    color: STATUS_COLOR[status] ?? BL.faint,
  }),
  btn:           {
    background: BL.ink, border: "none", borderRadius: 6, padding: "8px 18px",
    color: "#fff", fontSize: 13, fontFamily: BL.sans, fontWeight: 500, cursor: "pointer",
  },
  btnGhost:      {
    background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "6px 14px", color: BL.muted, fontSize: 12, fontFamily: BL.sans, cursor: "pointer",
  },
  btnRow:        { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  json:          {
    background: BL.fill, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 12,
    fontFamily: BL.mono, fontSize: 11, color: BL.ink2,
    overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
    maxHeight: 280, overflowY: "auto", marginTop: 8,
  },
  epCard:        { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 14, marginBottom: 8 },
  epHeader:      { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  method:        (m) => ({
    fontFamily: BL.mono, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
    background: m === "GET" ? BL.need.ok.bg : BL.need.critical.bg,
    color: m === "GET" ? BL.need.ok.fg : BL.need.critical.fg,
  }),
  path:          { fontFamily: BL.mono, fontSize: 12, color: BL.ink2 },
  triggerBox:    { background: BL.surgeBg, border: `1px solid ${BL.surge}44`, borderRadius: 6, padding: 16, marginBottom: 8 },
  triggerTitle:  { fontFamily: BL.mono, fontSize: 11, fontWeight: 600, color: BL.surge, letterSpacing: 0.4, marginBottom: 6 },
  triggerDesc:   { fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginBottom: 10 },
  ok:            { fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 12, marginTop: 6 },
  err:           { fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginTop: 6 },
};

const API_ENDPOINTS = [
  { method: "GET", path: "/api/v1/predict/status",   label: "Predict — national status",  fn: getStatus },
  { method: "GET", path: "/api/v1/predict/forecast",  label: "Predict — 14-day forecast",  fn: () => getForecast(null) },
  { method: "GET", path: "/api/v1/donors/me",         label: "Donors — my profile",        fn: getDonor },
  { method: "GET", path: "/api/v1/surge/monitor",     label: "Surge — active alerts",      fn: getSurgeMonitor },
  { method: "GET", path: "/api/v1/schedule/drives",   label: "Schedule — list drives",     fn: getDrives },
  { method: "GET", path: "/api/v1/retain/stats",      label: "Retain — impact stats",      fn: getRetainStats },
];

export default function TestPanel() {
  const [diag, setDiag] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState("");
  const [endpointResults, setEndpointResults] = useState({});
  const [triggerResults, setTriggerResults] = useState({});

  async function runDiagnostics() {
    setDiagLoading(true); setDiagError(""); setDiag(null);
    try { setDiag(await getDiagnostics()); }
    catch (e) { setDiagError(e.message); }
    finally { setDiagLoading(false); }
  }

  async function testEndpoint(ep) {
    setEndpointResults(prev => ({ ...prev, [ep.path]: { loading: true } }));
    const start = Date.now();
    try {
      const data = await ep.fn();
      setEndpointResults(prev => ({ ...prev, [ep.path]: { status: "ok", data, ms: Date.now() - start } }));
    } catch (e) {
      setEndpointResults(prev => ({ ...prev, [ep.path]: { status: "error", error: e.message, ms: Date.now() - start } }));
    }
  }

  async function runAllEndpoints() {
    for (const ep of API_ENDPOINTS) await testEndpoint(ep);
  }

  async function trigger(target) {
    setTriggerResults(prev => ({ ...prev, [target]: { loading: true } }));
    try {
      const data = await triggerFunction(target);
      setTriggerResults(prev => ({ ...prev, [target]: { status: "ok", data } }));
    } catch (e) {
      setTriggerResults(prev => ({ ...prev, [target]: { status: "error", error: e.message } }));
    }
  }

  return (
    <div>
      <div style={s.pageTitle}>Test Panel</div>
      <div style={s.pageSub}>Probe all services, trigger scheduled functions, and inspect API responses</div>

      <div style={s.section}>
        <div style={s.sectionLabel}>Infrastructure Health</div>
        <div style={s.btnRow}>
          <button style={s.btn} onClick={runDiagnostics} disabled={diagLoading}>
            {diagLoading ? "Running…" : "Run Full Diagnostics"}
          </button>
        </div>
        {diagError && <div style={s.err}>{diagError}</div>}
        {diag && (
          <>
            <CheckRow label="Overall status" status={diag.overall}
              meta={diag.timestamp?.slice(0, 19).replace("T", " ") + " UTC"} />
            {diag.checks?.aws_identity && (
              <CheckRow label="AWS Identity (STS)" status={diag.checks.aws_identity.status}
                meta={diag.checks.aws_identity.arn ?? diag.checks.aws_identity.error} />
            )}
            {diag.checks?.dynamodb && Object.entries(diag.checks.dynamodb).map(([name, info]) => (
              <CheckRow key={name} label={`${name} (${info.tableName})`} status={info.status}
                meta={info.status === "ok" ? `${info.itemCount} items` : info.error} />
            ))}
            {diag.checks?.eventbridge && Object.entries(diag.checks.eventbridge).map(([name, info]) => (
              <CheckRow key={name} label={name} status={info.state === "ENABLED" ? "ok" : "error"}
                meta={`${info.schedule ?? ""} — ${info.state ?? info}`} />
            ))}
            {diag.checks?.sns && (
              <CheckRow label="SNS Surge Alert Topic" status={diag.checks.sns.status}
                meta={diag.checks.sns.status === "ok"
                  ? `${diag.checks.sns.subscriptions} subscriptions confirmed`
                  : diag.checks.sns.error} />
            )}
            {diag.checks?.predictions_freshness && (
              <CheckRow label="Predictions table" status={diag.checks.predictions_freshness.status}
                meta={diag.checks.predictions_freshness.lastGeneratedAt ?? diag.checks.predictions_freshness.note} />
            )}
            {diag.checks?.blood_stock_freshness && (
              <CheckRow label="Blood stock table" status={diag.checks.blood_stock_freshness.status}
                meta={diag.checks.blood_stock_freshness.lastUpdatedAt ?? diag.checks.blood_stock_freshness.note} />
            )}
          </>
        )}
      </div>

      <div style={s.section}>
        <div style={s.sectionLabel}>Manual Triggers (EventBridge simulation)</div>
        {[
          { target: "hsa-sync", label: "HSA Sync",        desc: "Pulls mock blood stock data → populates BloodStockTable" },
          { target: "predict",  label: "Predict Refresh",  desc: "Generates 14-day forecast → populates PredictionsTable" },
        ].map(({ target, label, desc }) => {
          const r = triggerResults[target];
          return (
            <div key={target} style={s.triggerBox}>
              <div style={s.triggerTitle}>{label.toUpperCase()}</div>
              <div style={s.triggerDesc}>{desc}</div>
              <button style={s.btn} onClick={() => trigger(target)} disabled={r?.loading}>
                {r?.loading ? "Triggering…" : `Trigger ${label}`}
              </button>
              {r?.status === "ok"    && <div style={s.ok}>✓ {r.data?.message}</div>}
              {r?.status === "error" && <div style={s.err}>✗ {r.error}</div>}
            </div>
          );
        })}
      </div>

      <div style={s.section}>
        <div style={s.sectionLabel}>API Endpoints</div>
        <div style={s.btnRow}>
          <button style={s.btn} onClick={runAllEndpoints}>Test All Endpoints</button>
        </div>
        {API_ENDPOINTS.map(ep => {
          const r = endpointResults[ep.path];
          return (
            <div key={ep.path} style={s.epCard}>
              <div style={s.epHeader}>
                <span style={s.method(ep.method)}>{ep.method}</span>
                <span style={s.path}>{ep.path}</span>
                <span style={{ flex: 1 }} />
                {r && <span style={s.badge(r.status)}>{r.status === "ok" ? `${r.ms}ms` : "error"}</span>}
                <button style={s.btnGhost} onClick={() => testEndpoint(ep)} disabled={r?.loading}>
                  {r?.loading ? "…" : "Test"}
                </button>
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginBottom: r ? 6 : 0 }}>{ep.label}</div>
              {r?.status === "error" && <div style={s.err}>✗ {r.error}</div>}
              {r?.status === "ok"    && <pre style={s.json}>{JSON.stringify(r.data, null, 2)}</pre>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckRow({ label, status, meta }) {
  return (
    <div style={s.checkRow}>
      <div style={s.dot(status)} />
      <div style={s.rowLabel}>{label}</div>
      <div style={{ ...s.rowMeta, maxWidth: 360, textAlign: "right" }}>{meta}</div>
      <span style={s.badge(status)}>{STATUS_ICON[status]} {status}</span>
    </div>
  );
}
