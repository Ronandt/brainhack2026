import { useState } from "react";
import { getDiagnostics, triggerFunction, getStatus, getForecast, getDonor, getSurgeMonitor, getDrives, getRetainStats } from "../api";

const STATUS_COLOR = { ok: "#2ecc71", error: "#e74c3c", empty: "#f39c12", degraded: "#e67e22" };
const STATUS_ICON = { ok: "✓", error: "✗", empty: "⚠", degraded: "⚠" };

const s = {
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#666", fontSize: 13, marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#aaa", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1, fontSize: 12 },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#1a1a1a", borderRadius: 8, marginBottom: 6 },
  dot: (status) => ({ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: STATUS_COLOR[status] ?? "#555" }),
  rowLabel: { flex: 1, fontSize: 14, color: "#ddd" },
  rowMeta: { fontSize: 12, color: "#666" },
  badge: (status) => ({
    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
    background: (STATUS_COLOR[status] ?? "#555") + "22",
    color: STATUS_COLOR[status] ?? "#555",
  }),
  btn: { background: "#c0392b", border: "none", borderRadius: 6, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnGhost: { background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "8px 14px", color: "#aaa", fontSize: 13, cursor: "pointer" },
  btnRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 },
  json: { background: "#111", border: "1px solid #222", borderRadius: 8, padding: 14, fontSize: 11, color: "#7ec8e3", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 300, overflowY: "auto", marginTop: 8 },
  endpointCard: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: 14, marginBottom: 8 },
  endpointHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  method: (m) => ({ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: m === "GET" ? "#1a3a1a" : "#3a1a1a", color: m === "GET" ? "#2ecc71" : "#e74c3c" }),
  path: { fontSize: 13, color: "#ccc", fontFamily: "monospace" },
  triggerBox: { background: "#1a0a0a", border: "1px solid #c0392b33", borderRadius: 8, padding: 16, marginBottom: 8 },
  triggerTitle: { fontSize: 13, fontWeight: 700, color: "#c0392b", marginBottom: 8 },
  ok: { color: "#2ecc71", fontSize: 12, marginTop: 6 },
  err: { color: "#e74c3c", fontSize: 12, marginTop: 6 },
};

const API_ENDPOINTS = [
  { method: "GET", path: "/api/v1/predict/status", label: "Predict — national status", fn: getStatus },
  { method: "GET", path: "/api/v1/predict/forecast", label: "Predict — 14-day forecast", fn: () => getForecast(null) },
  { method: "GET", path: "/api/v1/donors/me", label: "Donors — my profile", fn: getDonor },
  { method: "GET", path: "/api/v1/surge/monitor", label: "Surge — active alerts", fn: getSurgeMonitor },
  { method: "GET", path: "/api/v1/schedule/drives", label: "Schedule — list drives", fn: getDrives },
  { method: "GET", path: "/api/v1/retain/stats", label: "Retain — impact stats", fn: getRetainStats },
];

export default function TestPanel() {
  const [diag, setDiag] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState("");
  const [endpointResults, setEndpointResults] = useState({});
  const [triggerResults, setTriggerResults] = useState({});

  async function runDiagnostics() {
    setDiagLoading(true); setDiagError(""); setDiag(null);
    try {
      const data = await getDiagnostics();
      setDiag(data);
    } catch (e) {
      setDiagError(e.message);
    } finally {
      setDiagLoading(false);
    }
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
      <div style={s.title}>Test Panel</div>
      <div style={s.sub}>Probe all services, trigger scheduled functions, and inspect API responses</div>

      {/* ── Infrastructure diagnostics ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Infrastructure Health</div>
        <div style={s.btnRow}>
          <button style={s.btn} onClick={runDiagnostics} disabled={diagLoading}>
            {diagLoading ? "Running…" : "Run Full Diagnostics"}
          </button>
        </div>

        {diagError && <div style={{ color: "#e74c3c", fontSize: 13 }}>{diagError}</div>}

        {diag && (
          <>
            <div style={{ ...s.row, background: "#111", marginBottom: 16 }}>
              <div style={s.dot(diag.overall)} />
              <div style={s.rowLabel}>Overall status</div>
              <span style={s.badge(diag.overall)}>{diag.overall?.toUpperCase()}</span>
              <div style={s.rowMeta}>{diag.timestamp?.slice(0, 19).replace("T", " ")} UTC</div>
            </div>

            {/* AWS identity */}
            {diag.checks?.aws_identity && (
              <CheckRow
                label="AWS Identity (STS)"
                status={diag.checks.aws_identity.status}
                meta={diag.checks.aws_identity.arn ?? diag.checks.aws_identity.error}
              />
            )}

            {/* DynamoDB */}
            <div style={s.sectionTitle} style={{ color: "#666", fontSize: 11, margin: "12px 0 6px" }}>DynamoDB Tables</div>
            {diag.checks?.dynamodb && Object.entries(diag.checks.dynamodb).map(([name, info]) => (
              <CheckRow key={name}
                label={`${name} (${info.tableName})`}
                status={info.status}
                meta={info.status === "ok" ? `${info.itemCount} items` : info.error}
              />
            ))}

            {/* EventBridge */}
            <div style={{ color: "#666", fontSize: 11, margin: "12px 0 6px" }}>EventBridge Rules</div>
            {diag.checks?.eventbridge && Object.entries(diag.checks.eventbridge).map(([name, info]) => (
              <CheckRow key={name}
                label={name}
                status={info.state === "ENABLED" ? "ok" : "error"}
                meta={`${info.schedule ?? ""} — ${info.state ?? info}`}
              />
            ))}

            {/* SNS */}
            {diag.checks?.sns && (
              <CheckRow
                label="SNS Surge Alert Topic"
                status={diag.checks.sns.status}
                meta={diag.checks.sns.status === "ok"
                  ? `${diag.checks.sns.subscriptions} subscriptions confirmed`
                  : diag.checks.sns.error}
              />
            )}

            {/* Freshness */}
            <div style={{ color: "#666", fontSize: 11, margin: "12px 0 6px" }}>Data Freshness</div>
            {diag.checks?.predictions_freshness && (
              <CheckRow
                label="Predictions table"
                status={diag.checks.predictions_freshness.status}
                meta={diag.checks.predictions_freshness.lastGeneratedAt ?? diag.checks.predictions_freshness.note}
              />
            )}
            {diag.checks?.blood_stock_freshness && (
              <CheckRow
                label="Blood stock table"
                status={diag.checks.blood_stock_freshness.status}
                meta={diag.checks.blood_stock_freshness.lastUpdatedAt ?? diag.checks.blood_stock_freshness.note}
              />
            )}
          </>
        )}
      </div>

      {/* ── Manual triggers ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Manual Triggers (EventBridge simulation)</div>
        {[
          { target: "hsa-sync", label: "HSA Sync", desc: "Pulls mock blood stock data → populates BloodStockTable" },
          { target: "predict", label: "Predict Refresh", desc: "Generates 14-day forecast → populates PredictionsTable" },
        ].map(({ target, label, desc }) => {
          const r = triggerResults[target];
          return (
            <div key={target} style={s.triggerBox}>
              <div style={s.triggerTitle}>{label}</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{desc}</div>
              <button style={s.btn} onClick={() => trigger(target)} disabled={r?.loading}>
                {r?.loading ? "Triggering…" : `Trigger ${label}`}
              </button>
              {r?.status === "ok" && <div style={s.ok}>✓ {r.data?.message}</div>}
              {r?.status === "error" && <div style={s.err}>✗ {r.error}</div>}
            </div>
          );
        })}
      </div>

      {/* ── API endpoint tests ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>API Endpoints</div>
        <div style={s.btnRow}>
          <button style={s.btn} onClick={runAllEndpoints}>Test All Endpoints</button>
        </div>
        {API_ENDPOINTS.map(ep => {
          const r = endpointResults[ep.path];
          return (
            <div key={ep.path} style={s.endpointCard}>
              <div style={s.endpointHeader}>
                <span style={s.method(ep.method)}>{ep.method}</span>
                <span style={s.path}>{ep.path}</span>
                <span style={{ flex: 1 }} />
                {r && <span style={s.badge(r.status)}>{r.status === "ok" ? `${r.ms}ms` : "error"}</span>}
                <button style={s.btnGhost} onClick={() => testEndpoint(ep)} disabled={r?.loading}>
                  {r?.loading ? "…" : "Test"}
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: r ? 6 : 0 }}>{ep.label}</div>
              {r?.status === "error" && <div style={s.err}>✗ {r.error}</div>}
              {r?.status === "ok" && (
                <pre style={s.json}>{JSON.stringify(r.data, null, 2)}</pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckRow({ label, status, meta }) {
  return (
    <div style={s.row}>
      <div style={s.dot(status)} />
      <div style={s.rowLabel}>{label}</div>
      <div style={{ ...s.rowMeta, maxWidth: 360, textAlign: "right" }}>{meta}</div>
      <span style={s.badge(status)}>{STATUS_ICON[status]} {status}</span>
    </div>
  );
}
