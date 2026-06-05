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

const labelStyle = {
  display: "block", fontFamily: BL.mono, fontSize: 9, color: BL.muted,
  marginBottom: 5, letterSpacing: 0.4, textTransform: "uppercase",
};

export default function DonorPanel({ onLogout }) {
  const [donor,      setDonor]      = useState(null);
  const [isNew,      setIsNew]      = useState(false);
  const [streak,     setStreak]     = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [editing,    setEditing]    = useState(false);
  const [form,       setForm]       = useState({});
  const [saving,     setSaving]     = useState(false);
  const [saveResult, setSaveResult] = useState("");
  const [saveError,  setSaveError]  = useState("");

  const inputStyle = {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "10px 12px", color: BL.ink, fontSize: 14, fontFamily: BL.sans, outline: "none",
    boxSizing: "border-box",
  };

  useEffect(() => {
    getDonor()
      .then(d => {
        setDonor(d);
        setForm({ name: d.name ?? "", postalCode: d.postalCode ?? "" });
      })
      .catch(e => {
        if (e.message?.includes("not found") || e.message?.includes("404")) {
          // No DynamoDB record yet — show the initial setup form
          setIsNew(true);
          setEditing(true);
          setForm({ name: "", bloodType: "O+", postalCode: "" });
        } else {
          setError(e.message);
        }
      })
      .finally(() => {
        getRetainStats().then(s => setStreak(s.streak ?? 0)).catch(() => {});
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true); setSaveResult(""); setSaveError("");
    try {
      const payload = { name: form.name, postalCode: form.postalCode };
      // Blood type only sent on initial setup (immutable after first save)
      if (isNew && form.bloodType) payload.bloodType = form.bloodType;

      await updateDonor(payload);

      // Refetch the now-created donor record
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

  if (loading) return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, marginBottom: 16 }}>You</div>
      <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13 }}>Loading profile…</div>
    </div>
  );

  if (error) return (
    <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, padding: "8px 0" }}>{error}</div>
  );

  // ── Initial setup — no profile exists yet ────────────────────────
  if (isNew) {
    return (
      <div>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, marginBottom: 4 }}>
          Set up your profile
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 20, lineHeight: 1.5 }}>
          Tell us a bit about yourself so we can match you to the right surges and drives.
        </div>

        <Card>
          <Tag>Your details</Tag>
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle} htmlFor="setup-name">Full name</label>
            <input
              id="setup-name"
              style={inputStyle}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Tan Wei Ming"
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Blood type</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {BLOOD_TYPES.map(bt => {
                const sel = form.bloodType === bt;
                return (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, bloodType: bt }))}
                    style={{
                      width: 52, height: 52, borderRadius: 6, cursor: "pointer",
                      border: sel ? `2px solid ${BL.ink}` : `1px solid ${BL.hair}`,
                      background: sel ? BL.fill : BL.card,
                      fontFamily: BL.mono, fontSize: 13, fontWeight: 600,
                      color: sel ? BL.ink : BL.muted,
                    }}
                  >
                    {bt}
                  </button>
                );
              })}
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.faint, marginTop: 6 }}>
              This cannot be changed after saving.
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={labelStyle} htmlFor="setup-postal">Postal code</label>
            <input
              id="setup-postal"
              style={inputStyle}
              value={form.postalCode}
              onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
              placeholder="e.g. 049326"
              maxLength={6}
            />
            <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.faint, marginTop: 4 }}>
              Used to match you to nearby drives. Never shared.
            </div>
          </div>
        </Card>

        {saveError && (
          <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginBottom: 12 }}>
            {saveError}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !form.name || !form.bloodType}
          style={{
            width: "100%", padding: "14px 0", marginTop: 4,
            background: (!form.name || !form.bloodType) ? BL.hair : BL.ink,
            color: (!form.name || !form.bloodType) ? BL.muted : "#fff",
            border: "none", borderRadius: 8, fontFamily: BL.sans,
            fontSize: 14, fontWeight: 600,
            cursor: (!form.name || !form.bloodType) ? "default" : "pointer",
            minHeight: 50,
          }}
        >
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
    <div>
      <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2, marginBottom: 14 }}>
        You
      </div>

      {/* Identity card */}
      <Card>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28, flexShrink: 0,
            background: BL.fill, border: `1px solid ${BL.hair}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: BL.sans, fontSize: 20, fontWeight: 600, color: BL.ink,
          }}>
            {(donor?.name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink }}>
              {donor?.name ?? "—"}
            </div>
            {donor?.donorId && (
              <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginTop: 2, letterSpacing: 0.4 }}>
                #{donor.donorId.slice(0, 10)} · since {donor.createdAt?.slice(0, 4) ?? "—"}
              </div>
            )}
          </div>
          {bt && (
            <div style={{
              background: eligible ? BL.need.ok.bg : BL.fill,
              border: `1.5px solid ${eligible ? BL.need.ok.fg : BL.hair}`,
              borderRadius: 6, padding: "8px 12px", textAlign: "center", flexShrink: 0,
            }}>
              <div style={{ fontFamily: BL.mono, fontSize: 15, fontWeight: 700, color: BL.ink }}>{bt}</div>
              <div style={{ fontFamily: BL.mono, fontSize: 8, color: eligible ? BL.need.ok.fg : BL.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 }}>
                {eligible ? "eligible" : "ineligible"}
              </div>
            </div>
          )}
        </div>

        <div style={{
          marginTop: 12, padding: "10px 12px", background: BL.fill, borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Tag>Next eligible</Tag>
          <span style={{ fontFamily: BL.mono, fontSize: 12, color: BL.ink, fontWeight: 600 }}>
            {nextEligibleLabel()}
          </span>
        </div>
      </Card>

      {/* Personal details — editable (blood type read-only) */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Tag>Personal details</Tag>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setSaveResult(""); }}
              style={{
                background: "none", border: `1px solid ${BL.hair}`, borderRadius: 5,
                color: BL.muted, padding: "5px 14px", fontSize: 12, fontFamily: BL.sans,
                cursor: "pointer", minHeight: 32,
              }}
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="edit-name">Name</label>
              <input
                id="edit-name"
                style={inputStyle}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>

            {/* Blood type — read-only in edit mode */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Blood type</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  padding: "10px 16px", background: BL.fill, border: `1px solid ${BL.hair}`,
                  borderRadius: 6, fontFamily: BL.mono, fontSize: 14, fontWeight: 700, color: BL.ink,
                }}>
                  {bt ?? "—"}
                </div>
                <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.faint }}>
                  Cannot be changed
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="edit-postal">Postal code</label>
              <input
                id="edit-postal"
                style={{ ...inputStyle, maxWidth: 160 }}
                value={form.postalCode}
                onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
                maxLength={6}
                placeholder="e.g. 049326"
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setEditing(false); setSaveResult(""); setSaveError(""); }}
                style={{
                  background: "none", border: `1px solid ${BL.hair}`, borderRadius: 6,
                  color: BL.muted, padding: "9px 18px", fontSize: 13, fontFamily: BL.sans,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: BL.ink, border: "none", borderRadius: 6,
                  color: "#fff", padding: "9px 22px", fontSize: 13,
                  fontFamily: BL.sans, fontWeight: 500, cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            {saveError && (
              <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginTop: 8 }}>
                {saveError}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", gap: 0, flexDirection: "column" }}>
            {[
              { l: "Name",        v: donor?.name ?? "—" },
              { l: "Blood type",  v: bt ?? "—",  note: "immutable" },
              { l: "Postal code", v: donor?.postalCode ?? "—" },
            ].map(({ l, v, note }, i) => (
              <div key={l} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderTop: i > 0 ? `1px solid ${BL.hair}` : "none",
              }}>
                <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.4, textTransform: "uppercase" }}>
                  {l}
                  {note && <span style={{ marginLeft: 6, color: BL.faint }}>· {note}</span>}
                </div>
                <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: l === "Blood type" ? 600 : 400 }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        )}
        {saveResult && (
          <div style={{ fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 12, marginTop: 10 }}>
            ✓ {saveResult}
          </div>
        )}
      </Card>

      {/* Donation stats */}
      <Card>
        <Tag>Donations</Tag>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {[
            { l: "Total",        v: donor?.totalDonations ?? 0 },
            { l: "Badge",        v: donor?.badgeTier !== "none" ? donor?.badgeTier ?? "—" : "—" },
            { l: "Last donated", v: donor?.lastDonatedAt?.slice(0, 10) ?? "Never" },
          ].map(({ l, v }) => (
            <div key={l} style={{
              flex: 1, background: BL.fill, borderRadius: 5, padding: "10px 8px", textAlign: "center",
            }}>
              <div style={{ fontFamily: BL.mono, fontSize: 16, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>{v}</div>
              <div style={{ fontFamily: BL.mono, fontSize: 8, color: BL.muted, marginTop: 3, letterSpacing: 0.4, textTransform: "uppercase" }}>{l}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Streak */}
      <Card>
        <Tag>Streak</Tag>
        <div style={{ fontFamily: BL.sans, fontSize: 18, fontWeight: 600, color: BL.ink, marginTop: 6, letterSpacing: -0.3 }}>
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
          marginTop: 10, padding: "14px 0", textAlign: "center",
          fontFamily: BL.sans, fontSize: 13, color: BL.faint,
        }}>
          No squads yet
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.faint, marginTop: 4, letterSpacing: 0.4 }}>
            JOIN OR CREATE A WORKPLACE SQUAD
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <Tag>Notifications</Tag>
        <div style={{ marginTop: 8 }}>
          {NOTIF_ROWS.map(([label, value], i) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderTop: i > 0 ? `1px solid ${BL.hair}` : "none",
              minHeight: 44,
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
            fontFamily: BL.sans, fontSize: 13, color: BL.muted, cursor: "pointer", minHeight: 44,
          }}
        >
          Sign out
        </button>
      )}
    </div>
  );
}
