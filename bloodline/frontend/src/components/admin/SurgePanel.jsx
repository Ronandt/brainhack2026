import { useState, useEffect } from "react";
import { activateSurge, getAllAlerts } from "../../api";
import { BL } from "../../tokens";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

const GEO_TIERS = [
  { id: "5km",         label: "Tier 1 · within 5 km of a blood bank", est: "~1,820 donors · est 22% response" },
  { id: "15km",        label: "Tier 2 · within 15 km",               est: "~4,200 donors · est 14% response" },
  { id: "island-wide", label: "Tier 3 · island-wide",                est: "~11,420 donors · est 7% response" },
];

const TIER_REACH = {
  "5km":         { notified: 1820,  responses: 400 },
  "15km":        { notified: 4200,  responses: 588 },
  "island-wide": { notified: 11420, responses: 800 },
};

const BLOOD_BANKS = [
  ["Bloodbank@HSA",           86, 120],
  ["Bloodbank@Dhoby Ghaut",   54, 90],
  ["Bloodbank@Woodlands",     42, 80],
  ["Bloodbank@Westgate",      38, 70],
];

function Tag({ children, color, bg }) {
  return (
    <span style={{
      fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase",
      color: color || BL.muted,
      ...(bg ? { background: bg, padding: "2px 6px", borderRadius: 3, display: "inline-block" } : {}),
    }}>
      {children}
    </span>
  );
}

function W({ children, style, pad = 16 }) {
  return (
    <div style={{ background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: pad, ...style }}>
      {children}
    </div>
  );
}

export default function SurgePanel() {
  const [bloodType,  setBloodType]  = useState("O-");
  const [geoTier,    setGeoTier]    = useState("island-wide");
  const [message,    setMessage]    = useState("");
  const [approverId, setApproverId] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState("");
  const [alerts,     setAlerts]     = useState([]);

  useEffect(() => {
    getAllAlerts().then(d => setAlerts(d.alerts ?? [])).catch(() => {});
  }, [result]);

  async function handleActivate(e) {
    e.preventDefault();
    setLoading(true); setResult(null); setError("");
    try {
      const res = await activateSurge({ bloodType, geoTier, message, approverId });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const reach = TIER_REACH[geoTier];
  const activeAlerts = alerts.filter(a => a.status === "active");

  const labelStyle = { display: "block", fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginBottom: 6, marginTop: 16 };
  const inputStyle = {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "9px 12px", color: BL.ink, fontSize: 13, fontFamily: BL.sans, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
            Surge Mode activation
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
            Mobilise the donor pool when forecasted shortage exceeds the response threshold. Requires Director sign-off.
          </div>
        </div>
        <Tag color={BL.muted}>Status · Stand-by · {activeAlerts.length} active surges</Tag>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
        {/* ── Configure (left) ───────────────────── */}
        <W pad={20}>
          <Tag color={BL.muted}>Step 1 · Configure</Tag>

          {/* Blood type chips */}
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Blood type(s)</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {BLOOD_TYPES.map(bt => {
                const sel = bloodType === bt;
                return (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setBloodType(bt)}
                    style={{
                      width: 44, height: 44, borderRadius: 6, border: sel ? `2px solid ${BL.ink}` : `1px solid ${BL.hair}`,
                      background: sel ? BL.fill : BL.card,
                      fontFamily: BL.mono, fontSize: 12, fontWeight: 600, color: sel ? BL.ink : BL.muted,
                      cursor: "pointer", outline: sel ? `2px solid ${BL.ink}` : "none", outlineOffset: 1,
                    }}
                  >
                    {bt}
                  </button>
                );
              })}
            </div>
            <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 8, letterSpacing: 0.3 }}>
              {bloodType} selected · eligible donors nationally vary by region
            </div>
          </div>

          {/* Tier selection */}
          <div style={{ marginTop: 18 }}>
            <label style={labelStyle}>Reach tiers</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {GEO_TIERS.map(tier => {
                const sel = geoTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setGeoTier(tier.id)}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: 12, borderRadius: 6, cursor: "pointer",
                      border: sel ? `2px solid ${BL.ink}` : `1px solid ${BL.hair}`,
                      background: BL.card, display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                      border: `1.5px solid ${sel ? BL.ink : BL.faint}`,
                      background: sel ? BL.ink : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 11,
                    }}>
                      {sel ? "✓" : ""}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>{tier.label}</div>
                      <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>{tier.est}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Channels */}
          <div style={{ marginTop: 18 }}>
            <label style={labelStyle}>Channel + cap</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <W pad={10} style={{ flex: 1 }}>
                <Tag>Channels</Tag>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {[["Push", true], ["SMS", true], ["WhatsApp", false], ["Email", false]].map(([ch, on]) => (
                    <span key={ch} style={{
                      fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase",
                      color: on ? BL.ink : BL.faint,
                      background: on ? BL.fill : "transparent",
                      border: `1px solid ${on ? BL.hair : "transparent"}`,
                      padding: "3px 8px", borderRadius: 3,
                    }}>
                      {ch}{on ? " ✓" : ""}
                    </span>
                  ))}
                </div>
              </W>
              <W pad={10} style={{ flex: 1 }}>
                <Tag>Send cap / donor</Tag>
                <div style={{ fontFamily: BL.mono, fontSize: 12, color: BL.ink, fontWeight: 600, marginTop: 8, lineHeight: 1.5 }}>1 push · then SMS at 6h</div>
              </W>
            </div>
          </div>

          {/* Surge message preview */}
          <div style={{ marginTop: 18 }}>
            <label style={labelStyle}>Surge message</label>
            <W pad={12} style={{ marginTop: 6, background: BL.surgeBg, border: `1px solid ${BL.surge}44` }}>
              <Tag color={BL.surge}>Surge · {bloodType}</Tag>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500, marginTop: 4 }}>
                {bloodType} is needed today. Bloodbank@HSA · slots in next 24h.
              </div>
            </W>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 60, marginTop: 8 }}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Urgent ${bloodType} blood needed at Singapore General Hospital.`}
            />
          </div>

          {/* Second approver */}
          <label style={labelStyle} htmlFor="asc-approver">Second approver ID (dual sign-off)</label>
          <input
            id="asc-approver"
            style={inputStyle}
            value={approverId}
            onChange={e => setApproverId(e.target.value)}
            placeholder="Second HSA officer's user ID"
          />
        </W>

        {/* ── Right column ────────────────────────── */}
        <div>
          {/* Projected reach */}
          <W pad={20} style={{ marginBottom: 14 }}>
            <Tag>Step 2 · Projected reach</Tag>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: BL.mono, fontSize: 32, color: BL.ink, fontWeight: 600, letterSpacing: -0.6 }}>
                  {reach.notified.toLocaleString()}
                </span>
                <Tag>donors notified</Tag>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: BL.mono, fontSize: 32, color: BL.red, fontWeight: 600, letterSpacing: -0.6 }}>
                  ~{reach.responses}
                </span>
                <Tag>projected responses · 24h</Tag>
              </div>
            </div>
          </W>

          {/* Capacity check */}
          <W pad={20} style={{ marginBottom: 14 }}>
            <Tag>Step 3 · Capacity check</Tag>
            <div style={{ marginTop: 12 }}>
              {BLOOD_BANKS.map(([name, used, cap], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <span style={{ flex: 1, fontFamily: BL.sans, fontSize: 12, color: BL.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                  <div style={{ width: 80, height: 8, background: BL.hair, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                    <div style={{ width: `${(used / cap) * 100}%`, height: "100%", background: BL.ink }} />
                  </div>
                  <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, width: 50, textAlign: "right", flexShrink: 0 }}>{used}/{cap}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <Tag color={BL.need.urgent.fg}>⚠ +120 slots will be opened automatically</Tag>
            </div>
          </W>

          {/* Break-glass */}
          <form onSubmit={handleActivate}>
            <div style={{
              padding: 20, borderRadius: 8,
              background: BL.surgeBg, border: `2px solid ${BL.surge}`,
            }}>
              <Tag color={BL.surge}>Break glass · requires dual sign-off</Tag>
              <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500, marginTop: 8, lineHeight: 1.4 }}>
                Activating will notify <strong>{reach.notified.toLocaleString()}</strong> donors and shift the donor app into surge mode.
                Cannot be undone for 6h.
              </div>
              <button
                type="submit"
                disabled={loading || !approverId}
                style={{
                  marginTop: 14, width: "100%", padding: "13px 0",
                  background: loading || !approverId ? BL.faint : BL.surge,
                  color: "#fff", border: "none", borderRadius: 8,
                  fontFamily: BL.sans, fontSize: 14, fontWeight: 600,
                  cursor: loading || !approverId ? "default" : "pointer",
                }}
              >
                {loading ? "Activating…" : "Activate Surge Mode →"}
              </button>
              <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginTop: 8, textAlign: "center", letterSpacing: 0.4 }}>
                REQUIRES · DIRECTOR LIM · DIRECTOR TAN
              </div>
              {result && <div style={{ fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 12, marginTop: 10 }}>✓ Alert {result.alertId?.slice(0, 8)}… activated</div>}
              {error  && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginTop: 10 }}>{error}</div>}
            </div>
          </form>

          {/* Live monitor */}
          {alerts.length > 0 && (
            <W pad={16} style={{ marginTop: 14 }}>
              <div style={{ fontFamily: BL.sans, fontSize: 13, fontWeight: 600, color: BL.ink, marginBottom: 10 }}>Live alert monitor</div>
              {alerts.slice(0, 3).map(a => (
                <div key={a.alertId} style={{ background: BL.fill, borderRadius: 6, padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontFamily: BL.mono, fontWeight: 600, color: BL.red, fontSize: 14 }}>{a.bloodType}</span>
                    <span style={{ fontFamily: BL.mono, fontSize: 10, background: BL.hair, borderRadius: 3, padding: "2px 7px", color: BL.muted }}>{a.geoTier}</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontFamily: BL.mono, fontSize: 10, fontWeight: 600, color: a.status === "active" ? BL.need.ok.fg : BL.muted }}>
                      {a.status?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 20, fontFamily: BL.mono, fontSize: 11 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: BL.ink }}>{a.donorsNotified ?? 0}</div>
                      <div style={{ fontSize: 9, color: BL.muted, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 2 }}>Notified</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: BL.ink }}>{a.responses ?? 0}</div>
                      <div style={{ fontSize: 9, color: BL.muted, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 2 }}>Responses</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: BL.ink }}>{a.bookings ?? 0}</div>
                      <div style={{ fontSize: 9, color: BL.muted, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 2 }}>Bookings</div>
                    </div>
                  </div>
                </div>
              ))}
            </W>
          )}
        </div>
      </div>
    </div>
  );
}
