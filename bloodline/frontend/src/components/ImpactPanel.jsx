import { useState, useEffect } from "react";
import { getRetainStats } from "../api";
import { BL } from "../tokens";
import { ImpactSkeleton } from "./Skeleton";

const MILESTONES = [
  { n: 10,  label: "Bronze",   key: "bronze" },
  { n: 25,  label: "Silver",   key: "silver" },
  { n: 50,  label: "Gold",     key: "gold" },
  { n: 100, label: "Honorary", key: "honorary" },
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
      fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase",
      color: color || BL.muted,
    }}>
      {children}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: BL.card, borderRadius: 14,
      padding: 16, marginBottom: 12,
      boxShadow: "0 1px 8px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Empty state — no donations yet ───────────────────────────────────────────
function EmptyImpact({ nextMilestone }) {
  const first = MILESTONES[0];
  return (
    <div>
      <div style={{ padding: "0 0 16px" }}>
        <div style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: BL.muted, marginBottom: 4 }}>
          Lifetime · 0 donations
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4 }}>
          Your impact
        </div>
      </div>

      {/* Hero empty card */}
      <Card style={{ textAlign: "center", padding: "32px 20px" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 32, margin: "0 auto 16px",
          background: BL.fill, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.39 4.262 1 7.5 1c1.997 0 3.94.954 5.157 2.512C13.88 2.09 15.773 1 18.5 1c3.238 0 5.5 2.39 5.5 5.191 0 4.105-5.375 8.863-11 14.402z" fill={BL.need.critical.fg} opacity="0.2"/>
          </svg>
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 17, fontWeight: 600, color: BL.ink, marginBottom: 8 }}>
          Make your first donation
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, lineHeight: 1.6, marginBottom: 20, maxWidth: 280, margin: "0 auto 20px" }}>
          Each whole blood donation can help up to 3 patients. Your stats unlock here after your first visit.
        </div>
        {/* Progress toward Bronze */}
        <div style={{ background: BL.fill, borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 600 }}>Bronze milestone</span>
            <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>0 / {first.n}</span>
          </div>
          <div style={{ height: 6, background: BL.card, borderRadius: 4, overflow: "hidden", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ height: "100%", width: "0%", background: BL.ink, borderRadius: 4 }} />
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.faint, marginTop: 6 }}>
            {first.n} donations to earn your first badge
          </div>
        </div>
      </Card>

      {/* What to expect */}
      <Card style={{ background: BL.fill, boxShadow: "none", border: "none" }}>
        <Tag>What unlocks</Tag>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { n: 1,   icon: "📊", label: "Lifetime stats",       desc: "Donations, patients helped, volume" },
            { n: 2,   icon: "📅", label: "Yearly history",        desc: "Your donation cadence over time" },
            { n: 10,  icon: "🥉", label: "Bronze badge",          desc: "First HSA milestone" },
          ].map(({ n, icon, label, desc }) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, opacity: 0.7 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: BL.card, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}>{icon}</div>
              <div>
                <div style={{ fontFamily: BL.sans, fontSize: 13, fontWeight: 600, color: BL.ink }}>{label}</div>
                <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.muted }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ImpactPanel() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getRetainStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ImpactSkeleton />;
  if (error)   return <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13 }}>{error}</div>;
  if (!stats)  return null;

  const { impact, badge, streak, annualHistory } = stats;
  const total      = impact?.totalDonations ?? 0;
  const tierColor  = BADGE_COLOR[badge?.tier] ?? BL.faint;
  const tierBg     = BADGE_BG[badge?.tier] ?? BL.fill;

  // Show empty state until first donation
  if (total === 0) {
    return <EmptyImpact />;
  }

  const maxCount    = Math.max(...(annualHistory?.map(h => h.count) ?? [1]), 1);
  const nextMilestone = MILESTONES.find(m => m.n > total);
  const prevMilestone = [...MILESTONES].reverse().find(m => m.n <= total);
  const progressPct   = nextMilestone
    ? ((total - (prevMilestone?.n ?? 0)) / (nextMilestone.n - (prevMilestone?.n ?? 0))) * 100
    : 100;

  // Annual chart needs at least 2 years to look meaningful
  const showAnnual = (annualHistory?.length ?? 0) >= 2 || total >= 5;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "0 0 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: BL.muted, marginBottom: 4 }}>
            Lifetime · {total} donation{total !== 1 ? "s" : ""}
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4 }}>
            Your impact
          </div>
        </div>
        {streak > 0 && (
          <div style={{
            fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase",
            color: BL.surge, background: BL.surgeBg,
            borderRadius: 20, padding: "5px 12px", whiteSpace: "nowrap", marginTop: 4,
            boxShadow: `0 1px 6px ${BL.surge}20`,
          }}>
            {streak} streak
          </div>
        )}
      </div>

      {/* KPI stats */}
      {impact && (
        <Card>
          <Tag>Your donations</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink, lineHeight: 1.3, marginTop: 8, letterSpacing: -0.2 }}>
            Your donations reached{" "}
            <span style={{ color: BL.red }}>{impact.patientsReached ?? 0} patients</span>.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {[
              { val: total,                                              label: "donations"    },
              { val: impact.patientsReached ?? 0,                       label: "lives reached" },
              { val: `${((impact.volumeMl ?? 0) / 1000).toFixed(1)}L`,  label: "blood given"  },
            ].map(({ val, label }) => (
              <div key={label} style={{
                flex: 1, background: BL.fill, borderRadius: 10, padding: "12px 10px", textAlign: "center",
              }}>
                <div style={{ fontFamily: BL.mono, fontSize: 22, fontWeight: 700, color: BL.ink, letterSpacing: -0.5 }}>
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

      {/* Annual history chart — shown after 2+ years or 5+ donations */}
      {showAnnual && annualHistory?.length > 0 && (
        <Card>
          <Tag>Donations per year</Tag>
          <div style={{ marginTop: 14 }}>
            {annualHistory.map(h => (
              <div key={h.year} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, textAlign: "right", width: 38 }}>{h.year}</div>
                <div style={{ flex: 1, background: BL.fill, borderRadius: 4, height: 16, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${Math.min(100, (h.count / maxCount) * 100)}%`,
                    background: BL.ink, borderRadius: 4, minWidth: h.count > 0 ? 6 : 0,
                    transition: "width 0.4s",
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Tag>HSA Milestones</Tag>
          {nextMilestone && (
            <Tag color={BL.faint}>next: {nextMilestone.n} · {nextMilestone.label}</Tag>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginBottom: 16 }}>
          {MILESTONES.map((m) => {
            const achieved = total >= m.n;
            const isCurrent = !achieved && m.n === nextMilestone?.n;
            const dotColor  = achieved ? BL.ink : isCurrent ? BL.red : BL.hair;
            const textColor = achieved ? BL.ink : isCurrent ? BL.red : BL.muted;
            return (
              <div key={m.key} style={{ textAlign: "center", flex: 1 }}>
                <div style={{
                  width: 44, height: 44, margin: "0 auto", borderRadius: 22,
                  border: `${achieved ? 2 : 1.5}px ${isCurrent ? "dashed" : "solid"} ${dotColor}`,
                  background: achieved ? BL.ink : "transparent",
                  color: achieved ? "#fff" : BL.faint,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: BL.mono, fontSize: 13, fontWeight: 600,
                  boxShadow: achieved ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                }}>
                  {achieved ? "✓" : m.n}
                </div>
                <div style={{ fontFamily: BL.sans, fontSize: 10, color: textColor, marginTop: 6, fontWeight: isCurrent ? 600 : 400 }}>
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: BL.fill, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, progressPct)}%`, height: "100%", background: BL.ink, borderRadius: 4, transition: "width 0.4s" }} />
        </div>
        <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 6, textAlign: "right" }}>
          {total} / {nextMilestone?.n ?? MILESTONES[MILESTONES.length - 1].n}
          {nextMilestone && ` · ${nextMilestone.n - total} to ${nextMilestone.label.toLowerCase()}`}
        </div>

        {/* Current badge */}
        {badge?.tier && badge.tier !== "none" && (
          <div style={{
            marginTop: 14, background: tierBg, borderRadius: 10, padding: "12px 16px", textAlign: "center",
            boxShadow: `0 2px 10px ${tierColor}18`,
          }}>
            <div style={{ fontFamily: BL.sans, fontSize: 15, fontWeight: 700, color: tierColor }}>
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
