import { useState, useEffect } from "react";
import { getRetainStats } from "../api";

const BADGE_COLOR = { honorary: "#f1c40f", gold: "#f39c12", silver: "#95a5a6", bronze: "#e67e22", none: "#444" };
const BADGE_EMOJI = { honorary: "🏆", gold: "🥇", silver: "🥈", bronze: "🥉", none: "🩸" };

const s = {
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#666", fontSize: 13, marginBottom: 24 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 },
  statCard: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "18px 16px", textAlign: "center" },
  statNum: { fontSize: 28, fontWeight: 700, color: "#c0392b" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  badgeCard: (tier) => ({
    background: "#1a1a1a", border: `2px solid ${BADGE_COLOR[tier] ?? "#333"}`, borderRadius: 12,
    padding: 24, textAlign: "center", marginBottom: 24,
  }),
  badgeEmoji: { fontSize: 48 },
  badgeName: (tier) => ({ fontSize: 20, fontWeight: 700, color: BADGE_COLOR[tier], marginTop: 8 }),
  badgeSub: { color: "#888", fontSize: 13, marginTop: 4 },
  chartSection: { marginBottom: 24 },
  chartTitle: { fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#ccc" },
  bar: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  barYear: { width: 40, fontSize: 12, color: "#888", textAlign: "right" },
  barFill: (pct) => ({ height: 18, width: `${Math.min(100, pct)}%`, background: "#c0392b", borderRadius: 3, minWidth: 4, transition: "width .3s" }),
  barCount: { fontSize: 12, color: "#666", minWidth: 20 },
  streakBadge: { display: "inline-block", background: "#1a0000", border: "1px solid #c0392b", borderRadius: 20, padding: "4px 14px", fontSize: 13, color: "#c0392b", marginBottom: 24 },
  err: { color: "#e74c3c", fontSize: 13 },
  loading: { color: "#666", fontSize: 13 },
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
      <div style={s.title}>Your Impact</div>
      <div style={s.sub}>Every donation matters — here's yours</div>

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
          <div style={s.chartTitle}>Annual Donation History</div>
          {annualHistory.map(h => (
            <div key={h.year} style={s.bar}>
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
