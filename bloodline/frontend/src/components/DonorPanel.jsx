import { useState, useEffect } from "react";
import { getDonor, updateDonor, getRetainStats } from "../api";
import { BL } from "../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const NOTIF_ROWS = [
  ["Surge alerts (your type)", "Always"],
  ["Surge alerts (compatible)", "Within 5 km"],
  ["Drive reminders", "On"],
  ["Weekly recap", "Sundays"],
  ["Cap: max 3 / week", "On"],
];

function AppHeader({ title }) {
  return (
    <div style={{ padding: "0 0 10px" }}>
      <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>
        {title}
      </div>
    </div>
  );
}

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
      background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6,
      padding: 14, marginBottom: 10, ...style,
    }}>
      {children}
    </div>
  );
}

export default function DonorPanel({ onLogout }) {
  const [donor, setDonor] = useState(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    Promise.allSettled([
      getDonor().then(d => {
        setDonor(d);
        setForm({ name: d.name ?? "", bloodType: d.bloodType ?? "O+", postalCode: d.postalCode ?? "" });
      }),
      getRetainStats().then(s => setStreak(s.streak ?? 0)),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setSaveResult(""); setSaveError("");
    try {
      await updateDonor(form);
      setDonor(prev => ({ ...prev, ...form }));
      setSaveResult("Profile updated");
      setEditing(false);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div>
      <AppHeader title="You" />
      <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13, padding: "8px 0" }}>Loading profile…</div>
    </div>
  );
  if (error) return <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13 }}>{error}</div>;
  if (!donor) return null;

  const bt = donor.bloodType;
  const eligible = donor.eligible;

  function nextEligibleLabel() {
    if (eligible) return "Eligible now";
    if (donor.nextEligibleDate) return donor.nextEligibleDate;
    return `${donor.daysUntilEligible ?? "?"} days`;
  }

  const inputStyle = {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "8px 10px", color: BL.ink, fontSize: 13, fontFamily: BL.sans, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div>
      <AppHeader title="You" />

      {/* Profile identity card — avatar + name + blood chip + next eligible */}
      <Card>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28, flexShrink: 0,
            background: BL.fill, border: `1px solid ${BL.hair}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: BL.sans, fontSize: 20, fontWeight: 600, color: BL.ink,
          }}>
            {(donor.name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink }}>
              {donor.name ?? "—"}
            </div>
            {donor.donorId && (
              <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginTop: 2, letterSpacing: 0.4 }}>
                #{donor.donorId?.slice(0, 10)} · since {donor.createdAt?.slice(0, 4) ?? "—"}
              </div>
            )}
          </div>
          {bt && (
            <div style={{
              background: eligible ? BL.need.ok.bg : BL.need.critical.bg,
              border: `1.5px solid ${eligible ? BL.need.ok.fg : BL.need.critical.fg}22`,
              borderRadius: 6, padding: "8px 10px", textAlign: "center", flexShrink: 0,
            }}>
              <div style={{ fontFamily: BL.mono, fontSize: 14, fontWeight: 700, color: BL.ink }}>{bt}</div>
              <div style={{ fontFamily: BL.mono, fontSize: 8, color: eligible ? BL.need.ok.fg : BL.need.critical.fg, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 }}>
                {eligible ? "eligible" : "ineligible"}
              </div>
            </div>
          )}
        </div>

        <div style={{
          marginTop: 14, padding: "10px 12px", background: BL.fill, borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Tag>Next eligible</Tag>
          <span style={{ fontFamily: BL.mono, fontSize: 12, color: BL.ink, fontWeight: 600 }}>
            {nextEligibleLabel()}
          </span>
        </div>
      </Card>

      {/* Streak */}
      <Card>
        <Tag>Streak</Tag>
        <div style={{ fontFamily: BL.sans, fontSize: 20, fontWeight: 600, color: BL.ink, marginTop: 6, letterSpacing: -0.4 }}>
          {streak > 0 ? `${streak} month${streak !== 1 ? "s" : ""} in a row` : "Start your streak"}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} style={{
              flex: 1, height: 26, borderRadius: 3,
              background: i <= streak ? BL.ink : BL.fill,
              border: `1px solid ${i <= streak ? BL.ink : BL.hair}`,
            }} />
          ))}
        </div>
      </Card>

      {/* Squads */}
      <Card>
        <Tag>Squads</Tag>
        <div style={{
          marginTop: 10, padding: "16px 0", textAlign: "center",
          fontFamily: BL.sans, fontSize: 13, color: BL.faint,
        }}>
          No squads yet
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.faint, marginTop: 4, letterSpacing: 0.4 }}>
            JOIN OR CREATE A WORKPLACE SQUAD
          </div>
        </div>
      </Card>

      {/* Personal details */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Tag>Personal details</Tag>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{
                background: "none", border: `1px solid ${BL.hair}`, borderRadius: 5,
                color: BL.muted, padding: "4px 12px", fontSize: 12, fontFamily: BL.sans, cursor: "pointer",
              }}
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label htmlFor="donor-name" style={{ display: "block", fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginBottom: 5, letterSpacing: 0.4, textTransform: "uppercase" }}>Name</label>
                <input id="donor-name" style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label htmlFor="donor-blood-type" style={{ display: "block", fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginBottom: 5, letterSpacing: 0.4, textTransform: "uppercase" }}>Blood Type</label>
                <select id="donor-blood-type" style={inputStyle} value={form.bloodType} onChange={e => setForm(f => ({ ...f, bloodType: e.target.value }))}>
                  {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ maxWidth: 200, marginBottom: 14 }}>
              <label htmlFor="donor-postal" style={{ display: "block", fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginBottom: 5, letterSpacing: 0.4, textTransform: "uppercase" }}>Postal Code</label>
              <input id="donor-postal" style={inputStyle} value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} maxLength={6} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditing(false)} style={{ background: "none", border: `1px solid ${BL.hair}`, borderRadius: 6, color: BL.muted, padding: "7px 16px", fontSize: 13, fontFamily: BL.sans, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ background: BL.ink, border: "none", borderRadius: 6, color: "#fff", padding: "7px 20px", fontSize: 13, fontFamily: BL.sans, fontWeight: 500, cursor: "pointer" }}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            {saveError && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginTop: 8 }}>{saveError}</div>}
          </>
        ) : (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { l: "Name", v: donor.name ?? "—" },
              { l: "Blood Type", v: donor.bloodType ?? "—" },
              { l: "Postal Code", v: donor.postalCode ?? "—" },
            ].map(({ l, v }) => (
              <div key={l} style={{ minWidth: 100 }}>
                <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink }}>{v}</div>
              </div>
            ))}
          </div>
        )}
        {saveResult && <div style={{ fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 12, marginTop: 10 }}>✓ {saveResult}</div>}
      </Card>

      {/* Donation stats */}
      <Card>
        <Tag>Donations</Tag>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {[
            { l: "Total", v: donor.totalDonations ?? 0 },
            { l: "Badge", v: donor.badgeTier ?? "—" },
            { l: "Last donated", v: donor.lastDonatedAt?.slice(0, 10) ?? "Never" },
          ].map(({ l, v }) => (
            <div key={l} style={{ flex: 1, background: BL.fill, borderRadius: 5, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontFamily: BL.mono, fontSize: 18, fontWeight: 600, color: BL.ink, letterSpacing: -0.4 }}>{v}</div>
              <div style={{ fontFamily: BL.mono, fontSize: 8, color: BL.muted, marginTop: 3, letterSpacing: 0.4, textTransform: "uppercase" }}>{l}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <Tag>Notifications</Tag>
        <div style={{ marginTop: 10 }}>
          {NOTIF_ROWS.map(([label, value], i) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderTop: i > 0 ? `1px solid ${BL.hair}` : "none",
            }}>
              <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink }}>{label}</span>
              <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>{value} ›</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Sign out */}
      {onLogout && (
        <button
          onClick={onLogout}
          style={{
            width: "100%", padding: "12px 0", marginTop: 6, marginBottom: 8,
            background: "none", border: `1px solid ${BL.hair}`, borderRadius: 6,
            fontFamily: BL.sans, fontSize: 13, color: BL.muted, cursor: "pointer",
          }}
        >
          Sign out
        </button>
      )}
    </div>
  );
}
