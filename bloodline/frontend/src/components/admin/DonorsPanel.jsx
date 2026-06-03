import { useState, useEffect } from "react";
import { getDonorSegments } from "../../api";

const SEGMENT_COLOR = { active: "#2ecc71", atRisk: "#f39c12", dormant: "#e67e22", lapsed: "#c0392b", neverDonated: "#555" };
const SEGMENT_LABEL = { active: "Active", atRisk: "At Risk", dormant: "Dormant", lapsed: "Lapsed", neverDonated: "Never Donated" };
const SEGMENT_DESC = {
  active: "Donated within 56 days",
  atRisk: "57–180 days since last donation",
  dormant: "181–365 days since last donation",
  lapsed: "Over 1 year since last donation",
  neverDonated: "Registered but never donated",
};

const s = {
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#555", fontSize: 13, marginBottom: 24 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 28 },
  segCard: (seg) => ({ background: "#12121a", border: `1px solid ${SEGMENT_COLOR[seg]}33`, borderRadius: 10, padding: 16 }),
  segNum: (seg) => ({ fontSize: 28, fontWeight: 700, color: SEGMENT_COLOR[seg] }),
  segLabel: { fontSize: 13, fontWeight: 600, color: "#ccc", margin: "4px 0 2px" },
  segDesc: { fontSize: 11, color: "#555" },
  tabs: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  tabBtn: (active, seg) => ({
    padding: "6px 14px", border: `1px solid ${active ? SEGMENT_COLOR[seg] : "#1e1e2e"}`,
    background: active ? SEGMENT_COLOR[seg] + "22" : "none",
    color: active ? SEGMENT_COLOR[seg] : "#666", borderRadius: 20, fontSize: 12, cursor: "pointer",
  }),
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px 12px", fontSize: 11, color: "#555", borderBottom: "1px solid #1e1e2e", textTransform: "uppercase" },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #0f0f18", color: "#ccc" },
  bt: (bt) => ({ display: "inline-block", background: "#1e1e2e", borderRadius: 4, padding: "1px 6px", fontSize: 11, color: "#aaa" }),
  empty: { color: "#555", fontSize: 13, padding: 16 },
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
      <div style={s.title}>Donor Pool Segmentation</div>
      <div style={s.sub}>Segment donors by recency to target re-engagement and surge alerts</div>

      {loading && <div style={{ color: "#555", fontSize: 13 }}>Loading…</div>}

      {data && (
        <>
          <div style={s.grid}>
            {Object.entries(SEGMENT_LABEL).map(([seg, label]) => (
              <div key={seg} style={s.segCard(seg)}>
                <div style={s.segNum(seg)}>{data.summary[seg] ?? 0}</div>
                <div style={s.segLabel}>{label}</div>
                <div style={s.segDesc}>{SEGMENT_DESC[seg]}</div>
              </div>
            ))}
          </div>

          <div style={s.tabs}>
            {Object.entries(SEGMENT_LABEL).map(([seg, label]) => (
              <button key={seg} style={s.tabBtn(activeSegment === seg, seg)} onClick={() => setActiveSegment(seg)}>
                {label} ({data.summary[seg] ?? 0})
              </button>
            ))}
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
                    <td style={s.td}><span style={s.bt(d.bloodType)}>{d.bloodType}</span></td>
                    <td style={s.td}>{d.lastDonatedAt?.slice(0, 10) ?? "Never"}</td>
                    <td style={s.td}>{d.email || "—"}</td>
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
