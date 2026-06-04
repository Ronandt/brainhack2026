import { useState, useEffect } from "react";
import { getRetainStats } from "../api";
import { BL } from "../tokens";

const BADGE_COLOR = {
  honorary: "#b8860b", gold: "#c07800", silver: "#6b7280", bronze: "#a05a2c", none: BL.faint,
};
const BADGE_BG = {
  honorary: "#fef9c3", gold: "#fef3c7", silver: "#f1f5f9", bronze: "#fdf0e8", none: BL.fill,
};
const BADGE_EMOJI = { honorary: "🏆", gold: "🥇", silver: "🥈", bronze: "🥉", none: "🩸" };

const s = {
  pageTitle:    { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:      { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 24 },
  grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 24 },
  statCard:     { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: "18px 16px", textAlign: "center" },
  statNum:      { fontFamily: BL.mono, fontSize: 28, fontWeight: 600, color: BL.ink, letterSpacing: -0.6 },
  statLabel:    { fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginTop: 4, letterSpacing: 0.6, textTransform: "uppercase" },
  badgeCard:    (tier) => ({
    background: BADGE_BG[tier] ?? BL.fill,
    border: `1px solid ${BADGE_COLOR[tier] ?? BL.hair}44`,
    borderRadius: 6, padding: 24, textAlign: "center", marginBottom: 20,
  }),
  badgeEmoji:   { fontSize: 44 },
  badgeName:    (tier) => ({
    fontFamily: BL.sans, fontSize: 18, fontWeight: 600,
    color: BADGE_COLOR[tier] ?? BL.muted, marginTop: 8,
  }),
  badgeSub:     { fontFamily: BL.sans, color: BL.muted, fontSize: 13, marginTop: 4 },
  chartSection: { marginBottom: 20 },
  chartLabel:   { fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 },
  barRow:       { display: "flex", alignItems: "center", gap: 10, marginBottom: 7 },
  barYear:      { fontFamily: BL.mono, width: 38, fontSize: 11, color: BL.muted, textAlign: "right" },
  barFill:      (pct) => ({
    height: 16, width: `${Math.min(100, pct)}%`, background: BL.ink,
    borderRadius: 2, minWidth: 4,
  }),
  barCount:     { fontFamily: BL.mono, fontSize: 11, color: BL.muted, minWidth: 20 },
  streakBadge:  {
    display: "inline-block", background: BL.surgeBg,
    border: `1px solid ${BL.surge}44`, borderRadius: 20,
    padding: "4px 14px", fontFamily: BL.sans, fontSize: 13,
    color: BL.surge, marginBottom: 20,
  },
  err:     { fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13 },
  loading: { fontFamily: BL.sans, color: BL.muted, fontSize: 13 },
};

export default function RetainPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getRetainStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={s.loading}>Loading your impact…</div>;
  if (error) return <div style={s.err}>{error}</div>;
  if (!stats) return null;

  const { impact, badge, streak, annualHistory } = stats;
  const maxCount = Math.max(...(annualHistory?.map(h => h.count) ?? [1]), 1);

  return (
    <div>
      <div style={s.pageTitle}>Your Impact</div>
      <div style={s.pageSub}>Every donation matters — here is yours</div>

      {streak > 0 && (
        <div style={s.streakBadge}>🔥 {streak}-month donation streak</div>
      )}

      <div style={s.grid}>
        <div style={s.statCard}>
          <div style={s.statNum}>{impact.totalDonations}</div>
          <div style={s.statLabel}>Total Donations</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statNum}>{impact.patientsReached}</div>
          <div style={s.statLabel}>Patients Reached</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statNum}>{((impact.volumeMl ?? 0) / 1000).toFixed(1)}L</div>
          <div style={s.statLabel}>Blood Donated</div>
        </div>
      </div>

      <div style={s.badgeCard(badge.tier)}>
        <div style={s.badgeEmoji}>{BADGE_EMOJI[badge.tier]}</div>
        <div style={s.badgeName(badge.tier)}>{badge.label}</div>
        {badge.achieved ? (
          <div style={s.badgeSub}>Milestone achieved</div>
        ) : (
          <div style={s.badgeSub}>{badge.donationsToNext} more donations to {badge.nextBadge}</div>
        )}
      </div>

      {annualHistory?.length > 0 && (
        <div style={s.chartSection}>
          <div style={s.chartLabel}>Annual Donation History</div>
          {annualHistory.map(h => (
            <div key={h.year} style={s.barRow}>
              <div style={s.barYear}>{h.year}</div>
              <div style={s.barFill((h.count / maxCount) * 100)} />
              <div style={s.barCount}>{h.count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
