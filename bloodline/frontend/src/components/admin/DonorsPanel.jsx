import { useState, useEffect } from "react";
import { getDonorSegments } from "../../api";
import { BL } from "../../tokens";

const SEG_NEED  = { active: "ok", dormant: "low", atRisk: "urgent", lapsed: "critical" };
const SEG_LABEL = {
  active:       "Active · donated ≤ 12mo",
  dormant:      "Dormant · 12–24mo",
  atRisk:       "At-risk · 24mo+",
  lapsed:       "Lapsed · 36mo+",
  neverDonated: "Never donated",
};
const SEG_DESC  = {
  active:       "39% of pool",
  dormant:      "29% — target reactivate",
  atRisk:       "21% — churn imminent",
  lapsed:       "10% — archive",
  neverDonated: "Registered only",
};

const BLOOD_TYPES_MIX = [
  { t: "O+",  pct: 38 }, { t: "A+",  pct: 25 }, { t: "B+",  pct: 14 },
  { t: "AB+", pct: 7 },  { t: "O-",  pct: 9 },  { t: "A-",  pct: 4 },
  { t: "B-",  pct: 2 },  { t: "AB-", pct: 1 },
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

function W({ children, style, pad = 14 }) {
  return (
    <div style={{ background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: pad, ...style }}>
      {children}
    </div>
  );
}

export default function DonorsPanel() {
  const [data,          setData]          = useState(null);
  const [activeSegment, setActiveSegment] = useState("atRisk");
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    getDonorSegments().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const segments = data?.segments ?? {};
  const donors   = segments[activeSegment] ?? [];
  const summary  = data?.summary ?? {};

  const segsForKpi = ["active", "dormant", "atRisk", "lapsed"];

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
            Donor pool · {data ? Object.values(summary).reduce((a, b) => a + b, 0).toLocaleString() : "—"} total
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
            Active retention curve vs at-risk segment. Filter to plan retention sends.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={softBtn}>All types ▾</button>
          <button style={softBtn}>All regions ▾</button>
          <button style={outlineBtn}>+ Save segment</button>
        </div>
      </div>

      {loading && <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13 }}>Loading…</div>}

      {data && (
        <>
          {/* Funnel KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
            {segsForKpi.map(seg => {
              const need = SEG_NEED[seg];
              return (
                <W key={seg} pad={14}>
                  <Tag color={BL.need[need].fg} bg={BL.need[need].bg}>{SEG_LABEL[seg]}</Tag>
                  <div style={{ fontFamily: BL.mono, fontSize: 24, fontWeight: 600, color: BL.ink, marginTop: 6, letterSpacing: -0.6 }}>
                    {(summary[seg] ?? 0).toLocaleString()}
                  </div>
                  <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.muted, marginTop: 2 }}>
                    {SEG_DESC[seg]}
                  </div>
                </W>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Segment table */}
            <W pad={0}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BL.hair}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink }}>Segment · donor list</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {Object.entries(SEG_LABEL).map(([seg, label]) => {
                    const need = SEG_NEED[seg];
                    const active = activeSegment === seg;
                    const fg = need ? BL.need[need].fg : BL.muted;
                    const bg = need ? BL.need[need].bg : BL.fill;
                    return (
                      <button
                        key={seg}
                        onClick={() => setActiveSegment(seg)}
                        style={{
                          padding: "4px 10px", borderRadius: 3, fontSize: 11, fontFamily: BL.mono,
                          cursor: "pointer", letterSpacing: 0.4, textTransform: "uppercase",
                          border: active ? `1px solid ${fg}` : `1px solid ${BL.hair}`,
                          background: active ? bg : "none",
                          color: active ? fg : BL.muted,
                        }}
                      >
                        {seg === "neverDonated" ? "Never" : seg} ({summary[seg] ?? 0})
                      </button>
                    );
                  })}
                </div>
              </div>
              {donors.length === 0 ? (
                <div style={{ padding: 16, fontFamily: BL.sans, color: BL.faint, fontSize: 13 }}>No donors in this segment.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: BL.sans, fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BL.hair}` }}>
                      {["DONOR", "BLOOD TYPE", "LAST DONATED", "EMAIL"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 16px", fontFamily: BL.mono, fontSize: 9, color: BL.muted, fontWeight: 500, letterSpacing: 0.4 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {donors.map(d => (
                      <tr key={d.donorId} style={{ borderBottom: `1px solid ${BL.hair}` }}>
                        <td style={{ padding: "10px 16px", color: BL.ink }}>{d.name || "—"}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ background: BL.fill, borderRadius: 3, padding: "2px 7px", fontFamily: BL.mono, fontSize: 11, color: BL.ink }}>{d.bloodType}</span>
                        </td>
                        <td style={{ padding: "10px 16px", fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>
                          {d.lastDonatedAt?.slice(0, 10) ?? "Never"}
                        </td>
                        <td style={{ padding: "10px 16px", fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>
                          {d.email || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </W>

            {/* Blood type mix */}
            <W pad={16}>
              <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink, marginBottom: 12 }}>Mix by blood type</div>
              {BLOOD_TYPES_MIX.map(({ t, pct }) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                  <span style={{
                    width: 34, height: 34, borderRadius: 6, flexShrink: 0,
                    background: BL.fill, border: `1px solid ${BL.hair}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: BL.mono, fontSize: 11, fontWeight: 600, color: BL.ink,
                  }}>{t}</span>
                  <div style={{ flex: 1, height: 8, background: BL.hair, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct * 2}%`, height: "100%", background: BL.ink }} />
                  </div>
                  <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, width: 30, textAlign: "right" }}>{pct}%</span>
                </div>
              ))}
              <Tag style={{ marginTop: 12, display: "block" }}>vs national pop. · O− is 4.2% low</Tag>
            </W>
          </div>

          {/* Campaigns table */}
          <W pad={0}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BL.hair}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink }}>Retention campaigns · scheduled</div>
              <button style={outlineBtn}>+ New campaign</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: BL.sans, fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BL.hair}` }}>
                  {["CAMPAIGN", "SEGMENT", "SIZE", "CHANNEL", "SEND", "STATUS", "EXPECTED LIFT"].map(h => (
                    <th key={h} style={{ padding: "8px 16px", fontFamily: BL.mono, fontSize: 9, color: BL.muted, textAlign: "left", fontWeight: 500, letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Q2 reactivation · O−/B−", "At-risk · O− or B−",   "8,420", "Push + SMS", "Mon 19 May 10:00", "Scheduled",       "+2.1pp M3"],
                  ["Birthday bridge",         "Dormant · birthday",   "1,240", "Email",       "Daily",            "Live",             "+1.4pp M3"],
                  ["NSF re-enrolment",        "Lapsed · age 21–24",   "6,180", "Push",        "Thu 22 May 14:00", "Draft",            "+3.8pp M6"],
                  ["Workplace re-light",      "Drive captains",         "180", "WhatsApp",    "Fri 23 May 09:00", "Pending approval", "+18 drives"],
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BL.hair}` }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "10px 16px", color: j === 0 ? BL.ink : BL.muted, fontFamily: j === 2 || j === 6 ? BL.mono : BL.sans }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </W>
        </>
      )}
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
