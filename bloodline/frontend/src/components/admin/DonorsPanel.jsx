import { useState, useEffect } from "react";
import { getDonorSegments } from "../../api";
import { BL } from "../../tokens";

// Map segments to prototype need levels
const SEG_NEED = { active: "ok", atRisk: "urgent", dormant: "low", lapsed: "critical", neverDonated: null };
const SEG_LABEL = { active: "Active", atRisk: "At Risk", dormant: "Dormant", lapsed: "Lapsed", neverDonated: "Never Donated" };
const SEG_DESC  = {
  active:       "Donated within 56 days",
  atRisk:       "57–180 days since last donation",
  dormant:      "181–365 days since last donation",
  lapsed:       "Over 1 year since last donation",
  neverDonated: "Registered but never donated",
};

function segStyle(seg) {
  const need = SEG_NEED[seg];
  if (!need) return { bg: BL.fill, fg: BL.muted, border: BL.hair };
  return { bg: BL.need[need].bg, fg: BL.need[need].fg, border: `${BL.need[need].fg}33` };
}

const s = {
  pageTitle:  { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:    { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 24 },
  grid:       { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 24 },
  tabs:       { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  table:      { width: "100%", borderCollapse: "collapse", fontFamily: BL.sans, fontSize: 13 },
  th:         { textAlign: "left", padding: "8px 12px", fontFamily: BL.mono, fontSize: 10, color: BL.muted, borderBottom: `1px solid ${BL.hair}`, textTransform: "uppercase", letterSpacing: 0.4 },
  td:         { padding: "10px 12px", borderBottom: `1px solid ${BL.hair}`, color: BL.ink2 },
  btTag:      { display: "inline-block", background: BL.fill, borderRadius: 3, padding: "1px 6px", fontFamily: BL.mono, fontSize: 11, color: BL.ink2 },
  empty:      { fontFamily: BL.sans, color: BL.faint, fontSize: 13, padding: 16 },
  loading:    { fontFamily: BL.sans, color: BL.muted, fontSize: 13 },
};

export default function DonorsPanel() {
  const [data, setData] = useState(null);
  const [activeSegment, setActiveSegment] = useState("atRisk");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDonorSegments().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const segments = data?.segments ?? {};
  const donors = segments[activeSegment] ?? [];

  return (
    <div>
      <div style={s.pageTitle}>Donor pool · segmentation</div>
      <div style={s.pageSub}>Segment donors by recency to target re-engagement and surge alerts</div>

      {loading && <div style={s.loading}>Loading…</div>}

      {data && (
        <>
          <div style={s.grid}>
            {Object.entries(SEG_LABEL).map(([seg, label]) => {
              const { bg, fg, border } = segStyle(seg);
              return (
                <div key={seg} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: 14 }}>
                  <div style={{ fontFamily: BL.mono, fontSize: 9, color: fg, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 24, fontWeight: 600, color: BL.ink, letterSpacing: -0.6, marginBottom: 2 }}>
                    {data.summary[seg] ?? 0}
                  </div>
                  <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.muted }}>{SEG_DESC[seg]}</div>
                </div>
              );
            })}
          </div>

          <div style={s.tabs}>
            {Object.entries(SEG_LABEL).map(([seg, label]) => {
              const { bg, fg } = segStyle(seg);
              const active = activeSegment === seg;
              return (
                <button
                  key={seg}
                  onClick={() => setActiveSegment(seg)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontFamily: BL.sans,
                    cursor: "pointer",
                    border: active ? `1px solid ${fg}` : `1px solid ${BL.hair}`,
                    background: active ? bg : "none",
                    color: active ? fg : BL.muted,
                  }}
                >
                  {label} ({data.summary[seg] ?? 0})
                </button>
              );
            })}
          </div>

          {donors.length === 0 ? (
            <div style={s.empty}>No donors in this segment.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Blood Type</th>
                  <th style={s.th}>Last Donated</th>
                  <th style={s.th}>Email</th>
                </tr>
              </thead>
              <tbody>
                {donors.map(d => (
                  <tr key={d.donorId}>
                    <td style={s.td}>{d.name || "—"}</td>
                    <td style={s.td}><span style={s.btTag}>{d.bloodType}</span></td>
                    <td style={{ ...s.td, fontFamily: BL.mono, fontSize: 12 }}>{d.lastDonatedAt?.slice(0, 10) ?? "Never"}</td>
                    <td style={{ ...s.td, fontFamily: BL.mono, fontSize: 12 }}>{d.email || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
