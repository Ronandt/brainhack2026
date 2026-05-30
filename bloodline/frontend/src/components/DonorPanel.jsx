import { useState, useEffect } from "react";
import { getDonor, updateDonor } from "../api";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RISK_COLOR = { ok: "#2ecc71", low: "#f39c12", urgent: "#e67e22", critical: "#c0392b" };

const s = {
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#666", fontSize: 13, marginBottom: 24 },
  eligibilityBanner: (eligible) => ({
    background: eligible ? "#0a2a0a" : "#2a0a0a",
    border: `1px solid ${eligible ? "#2ecc71" : "#c0392b"}`,
    borderRadius: 10, padding: "14px 18px", marginBottom: 24,
    display: "flex", alignItems: "center", gap: 12,
  }),
  eligibilityDot: (eligible) => ({
    width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
    background: eligible ? "#2ecc71" : "#c0392b",
  }),
  eligibilityText: { fontSize: 15, fontWeight: 600 },
  eligibilitySub: { fontSize: 12, color: "#888", marginTop: 2 },
  card: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24, marginBottom: 20 },
  cardTitle: { fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#ccc" },
  row: { display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" },
  field: { flex: 1, minWidth: 140 },
  label: { display: "block", color: "#888", fontSize: 11, marginBottom: 4 },
  value: { fontSize: 15, color: "#f0f0f0" },
  input: { width: "100%", background: "#111", border: "1px solid #333", borderRadius: 6, padding: "8px 10px", color: "#f0f0f0", fontSize: 14, outline: "none" },
  select: { width: "100%", background: "#111", border: "1px solid #333", borderRadius: 6, padding: "8px 10px", color: "#f0f0f0", fontSize: 14, outline: "none" },
  btn: { background: "#c0392b", border: "none", borderRadius: 6, padding: "9px 20px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnGhost: { background: "none", border: "1px solid #333", borderRadius: 6, padding: "9px 20px", color: "#888", fontSize: 14, cursor: "pointer", marginRight: 8 },
  actions: { display: "flex", marginTop: 16 },
  ok: { color: "#2ecc71", fontSize: 13, marginTop: 10 },
  err: { color: "#e74c3c", fontSize: 13, marginTop: 10 },
  loading: { color: "#666", fontSize: 13 },
  badge: (tier) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700,
    background: { honorary: "#f1c40f22", gold: "#f39c1222", silver: "#95a5a622", bronze: "#e67e2222", none: "#33333322" }[tier] ?? "#33333322",
    color: { honorary: "#f1c40f", gold: "#f39c12", silver: "#95a5a6", bronze: "#e67e22", none: "#666" }[tier] ?? "#666",
  }),
};

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

  if (loading) return <div style={s.loading}>Loading profile…</div>;
  if (error) return <div style={s.err}>{error}</div>;
  if (!donor) return null;

  return (
    <div>
      <div style={s.title}>Donor Profile</div>
      <div style={s.sub}>Your details and eligibility status</div>

      <div style={s.eligibilityBanner(donor.eligible)}>
        <div style={s.eligibilityDot(donor.eligible)} />
        <div>
          <div style={s.eligibilityText}>
            {donor.eligible ? "You are eligible to donate" : `Not yet eligible — ${donor.daysUntilEligible} days remaining`}
          </div>
          {donor.nextEligibleDate && !donor.eligible && (
            <div style={s.eligibilitySub}>Eligible again from {donor.nextEligibleDate}</div>
          )}
        </div>
      </div>

      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={s.cardTitle}>Personal Details</div>
          {!editing && <button style={s.btnGhost} onClick={() => setEditing(true)}>Edit</button>}
        </div>

        {editing ? (
          <>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>Name</label>
                <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Blood Type</label>
                <select style={s.select} value={form.bloodType} onChange={e => setForm(f => ({ ...f, bloodType: e.target.value }))}>
                  {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ ...s.field, maxWidth: 200 }}>
              <label style={s.label}>Postal Code</label>
              <input style={s.input} value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} maxLength={6} />
            </div>
            <div style={s.actions}>
              <button style={s.btnGhost} onClick={() => setEditing(false)}>Cancel</button>
              <button style={s.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
            {saveError && <div style={s.err}>{saveError}</div>}
          </>
        ) : (
          <div style={s.row}>
            <div style={s.field}><div style={s.label}>Name</div><div style={s.value}>{donor.name ?? "—"}</div></div>
            <div style={s.field}><div style={s.label}>Blood Type</div><div style={s.value}>{donor.bloodType ?? "—"}</div></div>
            <div style={s.field}><div style={s.label}>Postal Code</div><div style={s.value}>{donor.postalCode ?? "—"}</div></div>
          </div>
        )}
        {saveResult && <div style={s.ok}>✓ {saveResult}</div>}
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Donation Stats</div>
        <div style={s.row}>
          <div style={s.field}><div style={s.label}>Total Donations</div><div style={s.value}>{donor.totalDonations ?? 0}</div></div>
          <div style={s.field}><div style={s.label}>Badge Tier</div><div style={s.value}><span style={s.badge(donor.badgeTier)}>{donor.badgeTier ?? "none"}</span></div></div>
          <div style={s.field}><div style={s.label}>Last Donated</div><div style={s.value}>{donor.lastDonatedAt?.slice(0, 10) ?? "Never"}</div></div>
        </div>
      </div>
    </div>
  );
}
