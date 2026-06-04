import { useState } from "react";
import { updateHospitalProfile } from "../../api";
import { BL } from "../../tokens";

const ACCENT = "#2563a8";

const s = {
  wrap:    { display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: 40 },
  card:    { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 8, padding: 36, maxWidth: 480, width: "100%" },
  logo:    { display: "flex", alignItems: "center", gap: 8, marginBottom: 28 },
  dot:     { width: 18, height: 18, borderRadius: 3, background: ACCENT, flexShrink: 0 },
  title:   { fontFamily: BL.sans, fontSize: 20, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 6 },
  sub:     { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 28, lineHeight: 1.5 },
  label:   { fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6, display: "block" },
  input:   {
    width: "100%", padding: "10px 12px", border: `1px solid ${BL.hair}`, borderRadius: 6,
    fontFamily: BL.sans, fontSize: 14, color: BL.ink, background: BL.paper,
    boxSizing: "border-box", outline: "none", marginBottom: 20,
  },
  btn:     {
    width: "100%", padding: "11px 0", background: ACCENT, color: "#fff",
    border: "none", borderRadius: 6, fontFamily: BL.sans, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  err:     { fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, marginTop: 12 },
};

export default function SetupLocationPanel({ onComplete }) {
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const val = location.trim();
    if (!val) return;
    setSaving(true);
    setError(null);
    try {
      await updateHospitalProfile({ location: val });
      onComplete(val);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.dot} />
          <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink }}>BloodLine</span>
        </div>

        <div style={s.title}>Set your hospital location</div>
        <div style={s.sub}>
          This is a one-time setup. Your location will be attached to every donation drive
          you create and cannot be changed per drive.
        </div>

        <form onSubmit={submit}>
          <label style={s.label}>Hospital / venue name</label>
          <input
            style={s.input}
            placeholder="e.g. Singapore General Hospital"
            value={location}
            onChange={e => setLocation(e.target.value)}
            autoFocus
            required
          />
          <button type="submit" style={{ ...s.btn, opacity: saving ? 0.6 : 1 }} disabled={saving}>
            {saving ? "Saving…" : "Continue →"}
          </button>
          {error && <div style={s.err}>{error}</div>}
        </form>
      </div>
    </div>
  );
}
