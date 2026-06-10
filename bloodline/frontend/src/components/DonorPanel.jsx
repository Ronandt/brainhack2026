import { useState, useEffect } from "react";
import { getDonor, updateDonor } from "../api";
import { BL } from "../tokens";
import { DonorProfileSkeleton } from "./Skeleton";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const NOTIF_ROWS = [
  ["Surge alerts (your type)", "Always"],
  ["Surge alerts (compatible)", "Within 5 km"],
  ["Drive reminders", "On"],
  ["Weekly recap", "Sundays"],
  ["Cap: max 3 / week", "On"],
];

// Soft card — shadow-only depth, no visible border
function Section({ children, style }) {
  return (
    <div style={{
      background: BL.card,
      borderRadius: 18,
      padding: "16px 18px",
      marginBottom: 12,
      boxShadow: "0 1px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.6,
      textTransform: "uppercase", color: BL.faint, marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

export default function DonorPanel({ onLogout }) {
  const [donor,      setDonor]      = useState(null);
  const [isNew,      setIsNew]      = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [editing,    setEditing]    = useState(false);
  const [form,       setForm]       = useState({});
  const [saving,     setSaving]     = useState(false);
  const [saveResult, setSaveResult] = useState("");
  const [saveError,  setSaveError]  = useState("");

  const inputStyle = {
    width: "100%", background: BL.fill, border: `1.5px solid ${BL.hair}`,
    borderRadius: 12, padding: "13px 16px", color: BL.ink, fontSize: 15,
    fontFamily: BL.sans, outline: "none", boxSizing: "border-box",
  };

  useEffect(() => {
    getDonor()
      .then(d => {
        setDonor(d);
        setForm({ name: d.name ?? "", postalCode: d.postalCode ?? "", gender: d.gender ?? "" });
      })
      .catch(e => {
        if (e.message?.includes("not found") || e.message?.includes("404")) {
          setIsNew(true);
          setEditing(true);
          setForm({ name: "", bloodType: "O+", postalCode: "", gender: "" });
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setSaveResult(""); setSaveError("");
    try {
      const payload = { name: form.name, postalCode: form.postalCode };
      if (form.gender) payload.gender = form.gender;
      if (isNew && form.bloodType) payload.bloodType = form.bloodType;

      await updateDonor(payload);
      const fresh = await getDonor();
      setDonor(fresh);
      setIsNew(false);
      setSaveResult("Profile saved");
      setEditing(false);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <DonorProfileSkeleton />;

  if (error) return (
    <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, padding: "24px 0" }}>{error}</div>
  );

  // ── Initial setup ─────────────────────────────────────────────────
  if (isNew) {
    return (
      <div style={{ paddingBottom: 16 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 700, color: BL.ink, letterSpacing: -0.5, marginBottom: 6 }}>
          Set up your profile
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.muted, marginBottom: 24, lineHeight: 1.55 }}>
          Help us match you to the right surges and drives.
        </div>

        <Section>
          <SectionLabel>Your details</SectionLabel>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 8 }}
              htmlFor="setup-name">Full name</label>
            <input id="setup-name" style={inputStyle} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Tan Wei Ming" />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 8 }}>
              Blood type
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {BLOOD_TYPES.map(bt => {
                const sel = form.bloodType === bt;
                return (
                  <button key={bt} type="button" onClick={() => setForm(f => ({ ...f, bloodType: bt }))}
                    style={{
                      width: 58, height: 58, borderRadius: 14, cursor: "pointer",
                      border: sel ? `2px solid ${BL.ink}` : `1.5px solid ${BL.hair}`,
                      background: sel ? BL.ink : BL.fill,
                      fontFamily: BL.mono, fontSize: 14, fontWeight: 700,
                      color: sel ? "#fff" : BL.muted,
                    }}>
                    {bt}
                  </button>
                );
              })}
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.faint, marginTop: 8 }}>
              Cannot be changed after saving.
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 8 }}
              htmlFor="setup-postal">Postal code</label>
            <input id="setup-postal" style={{ ...inputStyle, maxWidth: 180 }} value={form.postalCode}
              onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
              placeholder="e.g. 049326" maxLength={6} />
            <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.faint, marginTop: 6 }}>
              Used to match you to nearby drives. Never shared.
            </div>
          </div>
        </Section>

        {saveError && (
          <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, marginBottom: 12 }}>
            {saveError}
          </div>
        )}

        <button onClick={handleSave} disabled={saving || !form.name || !form.bloodType}
          style={{
            width: "100%", padding: "16px 0",
            background: (!form.name || !form.bloodType) ? BL.fill : BL.ink,
            color: (!form.name || !form.bloodType) ? BL.muted : "#fff",
            border: "none", borderRadius: 16, fontFamily: BL.sans,
            fontSize: 15, fontWeight: 600,
            cursor: (!form.name || !form.bloodType) ? "default" : "pointer",
            minHeight: 54,
          }}>
          {saving ? "Saving…" : "Save profile →"}
        </button>
      </div>
    );
  }

  // ── Full profile view ─────────────────────────────────────────────
  const bt = donor?.bloodType;
  const eligible = donor?.eligible;

  function nextEligibleLabel() {
    if (eligible) return "Eligible now";
    if (donor?.nextEligibleDate) return donor.nextEligibleDate;
    return `${donor?.daysUntilEligible ?? "?"} days`;
  }

  return (
    <div style={{ paddingBottom: 16 }}>

      {/* ── Hero identity ─────────────────────────────────────── */}
      <Section>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {/* Avatar */}
          <div style={{
            width: 68, height: 68, borderRadius: 34, flexShrink: 0,
            background: "linear-gradient(145deg, #f5ede4 0%, #ecddd4 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: BL.sans, fontSize: 26, fontWeight: 700, color: BL.ink,
          }}>
            {(donor?.name ?? "?").charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: BL.sans, fontSize: 18, fontWeight: 700, color: BL.ink, lineHeight: 1.2 }}>
              {donor?.name ?? "—"}
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.faint, marginTop: 3 }}>
              Donor · since {donor?.createdAt?.slice(0, 4) ?? "—"}
            </div>
          </div>

          {/* Blood type pill */}
          {bt && (
            <div style={{
              borderRadius: 14, padding: "10px 14px", textAlign: "center", flexShrink: 0,
              background: eligible ? "#e8f4ed" : BL.fill,
              boxShadow: eligible
                ? `0 0 0 1.5px ${BL.need.ok.fg}50`
                : `0 0 0 1.5px ${BL.hair}`,
            }}>
              <div style={{ fontFamily: BL.mono, fontSize: 19, fontWeight: 700, color: BL.ink }}>{bt}</div>
              <div style={{ fontFamily: BL.mono, fontSize: 8, color: eligible ? BL.need.ok.fg : BL.faint, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {eligible ? "ready" : "rest"}
              </div>
            </div>
          )}
        </div>

        {/* Eligibility strip */}
        <div style={{
          marginTop: 14, padding: "12px 14px", borderRadius: 12,
          background: eligible ? "#e8f4ed" : BL.fill,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: BL.sans, fontSize: 13, color: eligible ? BL.need.ok.fg : BL.muted, fontWeight: 500 }}>
            {eligible ? "You can donate now" : "Next eligible"}
          </span>
          <span style={{ fontFamily: BL.mono, fontSize: 12, color: BL.ink, fontWeight: 700 }}>
            {nextEligibleLabel()}
          </span>
        </div>
      </Section>

      {/* ── Quick stats ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
        {[
          { l: "Donations", v: donor?.totalDonations ?? 0 },
          { l: "Last donated", v: donor?.lastDonatedAt?.slice(0, 7) ?? "—" },
          { l: "Badge", v: donor?.badgeTier && donor.badgeTier !== "none" ? donor.badgeTier : "—" },
        ].map(({ l, v }) => (
          <div key={l} style={{
            background: BL.card, borderRadius: 16, padding: "16px 10px", textAlign: "center",
            boxShadow: "0 1px 10px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)",
          }}>
            <div style={{ fontFamily: BL.mono, fontSize: 24, fontWeight: 700, color: BL.ink, letterSpacing: -0.5, lineHeight: 1 }}>
              {v}
            </div>
            <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.faint, marginTop: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {l}
            </div>
          </div>
        ))}
      </div>

      {/* ── Personal details ──────────────────────────────────── */}
      <Section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionLabel>Profile</SectionLabel>
          {!editing && (
            <button onClick={() => { setEditing(true); setSaveResult(""); }}
              style={{
                background: BL.fill, border: "none", borderRadius: 10,
                color: BL.ink2, padding: "7px 18px", fontSize: 13,
                fontFamily: BL.sans, cursor: "pointer", minHeight: 36, fontWeight: 500,
              }}>
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 8 }}
                htmlFor="edit-name">Name</label>
              <input id="edit-name" style={inputStyle} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 8 }}>
                Gender
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {["male", "female"].map(g => {
                  const sel = form.gender === g;
                  return (
                    <button key={g} type="button" onClick={() => setForm(f => ({ ...f, gender: g }))}
                      style={{
                        flex: 1, padding: "12px 0", borderRadius: 12, cursor: "pointer",
                        fontFamily: BL.sans, fontSize: 14, fontWeight: sel ? 600 : 400,
                        background: sel ? BL.ink : BL.fill,
                        color: sel ? "#fff" : BL.muted,
                        border: "none", textTransform: "capitalize", minHeight: 48,
                      }}>
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 8 }}>
                Blood type
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  padding: "11px 18px", background: BL.fill, borderRadius: 12,
                  fontFamily: BL.mono, fontSize: 16, fontWeight: 700, color: BL.ink,
                }}>
                  {bt ?? "—"}
                </div>
                <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.faint }}>
                  Cannot be changed
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 8 }}
                htmlFor="edit-postal">Postal code</label>
              <input id="edit-postal" style={{ ...inputStyle, maxWidth: 180 }} value={form.postalCode}
                onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
                maxLength={6} placeholder="e.g. 049326" />
            </div>

            {saveError && (
              <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, marginBottom: 12 }}>
                {saveError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setEditing(false); setSaveResult(""); setSaveError(""); }}
                style={{
                  flex: 1, background: BL.fill, border: "none", borderRadius: 12,
                  color: BL.muted, padding: "13px 0", fontSize: 14,
                  fontFamily: BL.sans, cursor: "pointer", minHeight: 50,
                }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{
                  flex: 2, background: BL.ink, border: "none", borderRadius: 12,
                  color: "#fff", padding: "13px 0", fontSize: 14,
                  fontFamily: BL.sans, fontWeight: 600, cursor: "pointer",
                  minHeight: 50, opacity: saving ? 0.7 : 1,
                }}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        ) : (
          <>
            {[
              { l: "Name",             v: donor?.name ?? "—" },
              { l: "Gender",           v: donor?.gender ? (donor.gender.charAt(0).toUpperCase() + donor.gender.slice(1)) : "—" },
              { l: "Blood type",       v: bt ?? "—",           bold: true },
              { l: "Postal code",      v: donor?.postalCode ?? "—" },
              { l: "Donation interval", v: "Every 84 days" },
            ].map(({ l, v, bold }, i) => (
              <div key={l} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "13px 0", minHeight: 52,
                borderTop: i > 0 ? `1px solid ${BL.fill}` : "none",
              }}>
                <span style={{ fontFamily: BL.sans, fontSize: 14, color: BL.muted }}>{l}</span>
                <span style={{
                  fontFamily: bold ? BL.mono : BL.sans,
                  fontSize: bold ? 16 : 14,
                  fontWeight: bold ? 700 : 400,
                  color: BL.ink,
                }}>
                  {v}
                </span>
              </div>
            ))}
            {saveResult && (
              <div style={{ fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 13, marginTop: 8 }}>
                ✓ {saveResult}
              </div>
            )}
          </>
        )}
      </Section>

      {/* ── Notifications ─────────────────────────────────────── */}
      <Section>
        <SectionLabel>Notifications</SectionLabel>
        {NOTIF_ROWS.map(([label, value], i) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "13px 0", minHeight: 52,
            borderTop: i > 0 ? `1px solid ${BL.fill}` : "none",
          }}>
            <span style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink }}>{label}</span>
            <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.faint }}>
              {value} ›
            </span>
          </div>
        ))}
      </Section>

      {/* ── Sign out ──────────────────────────────────────────── */}
      {onLogout && (
        <button onClick={onLogout}
          style={{
            width: "100%", padding: "15px 0", marginTop: 4, marginBottom: 8,
            background: BL.card, border: "none", borderRadius: 18,
            boxShadow: "0 1px 10px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)",
            fontFamily: BL.sans, fontSize: 14, color: "#c0392b",
            cursor: "pointer", minHeight: 52, fontWeight: 500,
          }}>
          Sign out
        </button>
      )}
    </div>
  );
}
