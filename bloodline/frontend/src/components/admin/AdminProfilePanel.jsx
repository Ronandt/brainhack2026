import { useState, useEffect } from "react";
import { getDonor, updateDonor } from "../../api";
import { getToken } from "../../auth";
import { BL } from "../../tokens";

function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

function Tag({ children, color }) {
  return (
    <span style={{
      fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase",
      color: color ?? BL.muted,
    }}>
      {children}
    </span>
  );
}

function Card({ children, style, pad = 20 }) {
  return (
    <div style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: pad, ...style }}>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", background: BL.fill, border: `1px solid ${BL.hair}`,
  borderRadius: 10, padding: "10px 13px", color: BL.ink,
  fontSize: 14, fontFamily: BL.sans, outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  display: "block", fontFamily: BL.mono, fontSize: 9,
  letterSpacing: 0.6, textTransform: "uppercase", color: BL.muted,
  marginBottom: 5, marginTop: 16,
};

export default function AdminProfilePanel() {
  const [profile,   setProfile]   = useState(null);
  const [jwtData,   setJwtData]   = useState({});
  const [name,      setName]      = useState("");
  const [department, setDepartment] = useState("");
  const [phone,     setPhone]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    getToken().then(token => {
      if (token) setJwtData(decodeJwt(token));
    });
    getDonor()
      .then(d => {
        setProfile(d);
        setName(d.name ?? "");
        setDepartment(d.department ?? "");
        setPhone(d.phone ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setSaved(false); setError("");
    try {
      await updateDonor({ name: name.trim(), department: department.trim(), phone: phone.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const initials = name
    ? name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const email   = jwtData.email ?? "—";
  const staffId = (jwtData.sub ?? "—").slice(0, 8).toUpperCase();
  const updatedAt = profile?.updatedAt
    ? new Date(profile.updatedAt).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
          My Profile
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
          HSA Operations · National Blood Supply Platform
          {updatedAt && <span> · Last updated {updatedAt}</span>}
        </div>
      </div>

      {loading ? (
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted }}>Loading…</div>
      ) : (
        <>
          {/* Identity card */}
          <Card style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 20 }}>
            {/* Avatar */}
            <div style={{
              width: 64, height: 64, borderRadius: 32, flexShrink: 0,
              background: BL.ink, display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: BL.sans, fontSize: 22, fontWeight: 700, color: "#fff",
              letterSpacing: -0.5,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: BL.sans, fontSize: 18, fontWeight: 600, color: BL.ink, marginBottom: 3 }}>
                {name || <span style={{ color: BL.faint }}>Name not set</span>}
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted }}>
                {department || "HSA National Operations"}
              </div>
              <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                <span style={{
                  fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6,
                  background: BL.ink, color: "#fff",
                  padding: "2px 8px", borderRadius: 6, textTransform: "uppercase",
                }}>
                  HSA Admin
                </span>
                <span style={{
                  fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6,
                  background: BL.fill, color: BL.muted,
                  padding: "2px 8px", borderRadius: 6, textTransform: "uppercase",
                }}>
                  National Operations
                </span>
              </div>
            </div>
          </Card>

          {/* Editable fields */}
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink, marginBottom: 2 }}>
              Edit details
            </div>
            <Tag>Changes are saved to your account</Tag>

            <form onSubmit={handleSave}>
              <label style={labelStyle}>Full name</label>
              <input
                style={inputStyle}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Dr. Rachel Lim"
                autoComplete="name"
              />

              <label style={labelStyle}>Department</label>
              <input
                style={inputStyle}
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Blood Services Group"
              />

              <label style={labelStyle}>Contact / extension</label>
              <input
                style={inputStyle}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +65 6213 0000 ext 123"
              />

              {error && (
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg, marginTop: 10 }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 28px", background: saving ? BL.fill : BL.ink,
                    color: saving ? BL.muted : "#fff", border: "none", borderRadius: 10,
                    fontFamily: BL.sans, fontSize: 13, fontWeight: 600,
                    cursor: saving ? "default" : "pointer",
                  }}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {saved && (
                  <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.ok.fg }}>
                    ✓ Saved
                  </span>
                )}
              </div>
            </form>
          </Card>

          {/* Read-only account info */}
          <Card pad={0}>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${BL.fill}` }}>
              <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink }}>
                Account information
              </div>
              <Tag>Read-only · managed by HSA IT</Tag>
            </div>
            {[
              { label: "Email address", value: email },
              { label: "Staff ID",      value: staffId, mono: true },
              { label: "Role",          value: "HSA Administrator" },
              { label: "Access level",  value: "National — all blood types and regions" },
              { label: "Platform",      value: "BloodLine · Singapore Blood Supply System" },
            ].map(({ label, value, mono }, i) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "13px 20px",
                borderTop: i > 0 ? `1px solid ${BL.fill}` : "none",
              }}>
                <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {label}
                </span>
                <span style={{
                  fontFamily: mono ? BL.mono : BL.sans,
                  fontSize: mono ? 11 : 13,
                  color: BL.ink, fontWeight: 500,
                  textAlign: "right", maxWidth: "60%",
                }}>
                  {value}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
