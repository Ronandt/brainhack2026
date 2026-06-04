import { useState, useEffect } from "react";
import { getRetainStats } from "../api";
import { BL } from "../tokens";

const MILESTONES = [
  { n: 10,  label: "Bronze",    key: "bronze" },
  { n: 25,  label: "Silver",    key: "silver" },
  { n: 50,  label: "Gold",      key: "gold" },
  { n: 100, label: "Honorary",  key: "honorary" },
];

const BADGE_COLOR = {
  honorary: "#b8860b", gold: "#c07800", silver: "#6b7280", bronze: "#a05a2c", none: BL.faint,
};
const BADGE_BG = {
  honorary: "#fef9c3", gold: "#fef3c7", silver: "#f1f5f9", bronze: "#fdf0e8", none: BL.fill,
};

function Tag({ children, color }) {
  return (
    <span style={{
      fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase",
      color: color || BL.muted,
    }}>
      {children}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 8,
      padding: 16, marginBottom: 12, ...style,
    }}>
      {children}
    </div>
  );
}

export default function ImpactPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getRetainStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13 }}>Loading your impact…</div>;
  if (error) return <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13 }}>{error}</div>;
  if (!stats) return null;

  const { impact, badge, streak, annualHistory } = stats;
  const total = impact?.totalDonations ?? 0;
  const maxCount = Math.max(...(annualHistory?.map(h => h.count) ?? [1]), 1);
  const tierColor = BADGE_COLOR[badge?.tier] ?? BL.faint;
  const tierBg = BADGE_BG[badge?.tier] ?? BL.fill;

  // Determine milestone progress
  const nextMilestone = MILESTONES.find(m => m.n > total);
  const prevMilestone = [...MILESTONES].reverse().find(m => m.n <= total);
  const progressPct = nextMilestone
    ? ((total - (prevMilestone?.n ?? 0)) / (nextMilestone.n - (prevMilestone?.n ?? 0))) * 100
    : 100;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 }}>
          Your impact
        </div>
        <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>
          Lifetime · {total} donation{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Streak badge */}
      {streak > 0 && (
        <div style={{
          display: "inline-block", background: BL.surgeBg,
          border: `1px solid ${BL.surge}44`, borderRadius: 20,
          padding: "5px 16px", fontFamily: BL.sans, fontSize: 13,
          color: BL.surge, marginBottom: 16, fontWeight: 500,
        }}>
          {streak}-donation streak
        </div>
      )}

      {/* Last donation impact */}
      {impact && (
        <Card>
          <Tag>Your donations</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink, lineHeight: 1.3, marginTop: 8, letterSpacing: -0.2 }}>
            Your donations reached{" "}
            <span style={{ color: BL.red }}>{impact.patientsReached ?? 0} patients</span>.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {[
              { val: total, label: "donations" },
              { val: impact.patientsReached ?? 0, label: "lives reached" },
              { val: `${((impact.volumeMl ?? 0) / 1000).toFixed(1)}L`, label: "blood given" },
            ].map(({ val, label }) => (
              <div key={label} style={{
                flex: 1, background: BL.fill, borderRadius: 6, padding: "12px 10px", textAlign: "center",
              }}>
                <div style={{ fontFamily: BL.mono, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.5 }}>
                  {val}
                </div>
                <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginTop: 3, letterSpacing: 0.4, textTransform: "uppercase" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Annual history chart */}
      {annualHistory?.length > 0 && (
        <Card>
          <Tag>Donations per year</Tag>
          <div style={{ marginTop: 12 }}>
            {annualHistory.map(h => (
              <div key={h.year} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, textAlign: "right", width: 38 }}>{h.year}</div>
                <div style={{ flex: 1, background: BL.fill, borderRadius: 2, height: 16, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${Math.min(100, (h.count / maxCount) * 100)}%`,
                    background: BL.ink, borderRadius: 2, minWidth: h.count > 0 ? 4 : 0,
                  }} />
                </div>
                <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, minWidth: 16 }}>{h.count}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* HSA Milestones */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Tag>HSA Milestones</Tag>
          {nextMilestone && (
            <Tag color={BL.faint}>next: {nextMilestone.n} ({nextMilestone.label})</Tag>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginBottom: 14 }}>
          {MILESTONES.map((m) => {
            const achieved = total >= m.n;
            const current = !achieved && (prevMilestone ? m.n === nextMilestone?.n : m.n === MILESTONES[0].n);
            const dotColor = achieved ? BL.ink : current ? BL.red : BL.hair;
            const textColor = achieved ? BL.ink : current ? BL.red : BL.muted;
            return (
              <div key={m.key} style={{ textAlign: "center", flex: 1 }}>
                <div style={{
                  width: 44, height: 44, margin: "0 auto", borderRadius: 22,
                  border: `${achieved ? 2 : 1.5}px ${achieved ? "solid" : current ? "dashed" : "solid"} ${dotColor}`,
                  background: achieved ? BL.ink : "transparent",
                  color: achieved ? "#fff" : BL.faint,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: BL.mono, fontSize: 13, fontWeight: 600,
                }}>
                  {m.n}
                </div>
                <div style={{ fontFamily: BL.sans, fontSize: 10, color: textColor, marginTop: 5, fontWeight: current ? 600 : 400 }}>
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: BL.fill, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, progressPct)}%`, height: "100%", background: BL.ink, borderRadius: 3 }} />
        </div>
        <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 6, textAlign: "right" }}>
          {total} / {nextMilestone?.n ?? MILESTONES[MILESTONES.length - 1].n}
          {nextMilestone && ` · ${nextMilestone.n - total} to ${nextMilestone.label.toLowerCase()}`}
        </div>

        {/* Current badge */}
        {badge?.tier && badge.tier !== "none" && (
          <div style={{
            marginTop: 14, background: tierBg, border: `1px solid ${tierColor}44`,
            borderRadius: 6, padding: "12px 16px", textAlign: "center",
          }}>
            <div style={{ fontFamily: BL.sans, fontSize: 15, fontWeight: 600, color: tierColor }}>
              {badge.label}
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 3 }}>
              {badge.achieved ? "Milestone achieved" : `${badge.donationsToNext} more to ${badge.nextBadge}`}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
