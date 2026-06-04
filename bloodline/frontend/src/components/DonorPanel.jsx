import { useState, useEffect } from "react";
import { getDonor, updateDonor } from "../api";
import { BL } from "../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const NOTIF_ROWS = [
  ["Surge alerts (your type)", "Always"],
  ["Surge alerts (compatible)", "Within 5 km"],
  ["Drive reminders", "On"],
  ["Weekly recap", "Sundays"],
  ["Cap: max 3 / week", "On"],
];

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

export default function DonorPanel() {
  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    getDonor()
      .then(d => { setDonor(d); setForm({ name: d.name ?? "", bloodType: d.bloodType ?? "O+", postalCode: d.postalCode ?? "" }); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
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

  if (loading) return <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13 }}>Loading profile…</div>;
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
  };
  const selectStyle = { ...inputStyle };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>You</div>
      </div>

      {/* Profile identity card */}
      <Card>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
          {/* Avatar circle */}
          <div style={{
            width: 52, height: 52, borderRadius: 26, flexShrink: 0,
            background: BL.fill, border: `1px solid ${BL.hair}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: BL.sans, fontSize: 18, fontWeight: 600, color: BL.ink,
          }}>
            {(donor.name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink }}>
              {donor.name ?? "—"}
            </div>
            {donor.donorId && (
              <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2, letterSpacing: 0.4 }}>
                #{donor.donorId?.slice(0, 10)}
              </div>
            )}
          </div>
          {/* Blood chip */}
          {bt && (
            <div style={{
              background: eligible ? BL.need.ok.bg : BL.need.critical.bg,
              border: `1.5px solid ${eligible ? BL.need.ok.fg : BL.need.critical.fg}`,
              borderRadius: 6, padding: "8px 10px", textAlign: "center", flexShrink: 0,
            }}>
              <div style={{ fontFamily: BL.mono, fontSize: 13, fontWeight: 700, color: BL.ink }}>{bt}</div>
              <div style={{ fontFamily: BL.mono, fontSize: 8, color: eligible ? BL.need.ok.fg : BL.need.critical.fg, marginTop: 2, textTransform: "uppercase" }}>
                {eligible ? "eligible" : "ineligible"}
              </div>
            </div>
          )}
        </div>

        {/* Next eligible row */}
        <div style={{
          padding: "10px 12px", background: BL.fill, borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Tag>Next eligible</Tag>
          <span style={{ fontFamily: BL.mono, fontSize: 12, color: BL.ink, fontWeight: 600 }}>
            {nextEligibleLabel()}
          </span>
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
                <select id="donor-blood-type" style={selectStyle} value={form.bloodType} onChange={e => setForm(f => ({ ...f, bloodType: e.target.value }))}>
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
              <div key={l} style={{ minWidth: 120 }}>
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
        <Tag>Donation stats</Tag>
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { l: "Total Donations", v: donor.totalDonations ?? 0 },
            { l: "Badge Tier", v: donor.badgeTier ?? "none" },
            { l: "Last Donated", v: donor.lastDonatedAt?.slice(0, 10) ?? "Never" },
          ].map(({ l, v }) => (
            <div key={l} style={{ minWidth: 120 }}>
              <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
              <div style={{ fontFamily: BL.mono, fontSize: 18, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>{v}</div>
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
    </div>
  );
}
