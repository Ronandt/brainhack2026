import { useState } from "react";
import { signIn, signUp, confirmSignUp } from "../auth";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const s = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f0f" },
  card: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: 36, width: "100%", maxWidth: 400 },
  logo: { color: "#c0392b", fontSize: 28, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#666", fontSize: 13, marginBottom: 28 },
  tabs: { display: "flex", gap: 8, marginBottom: 24 },
  tab: (active) => ({
    flex: 1, padding: "8px 0", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600,
    background: active ? "#c0392b" : "#2a2a2a", color: active ? "#fff" : "#888", transition: "all .15s",
  }),
  label: { display: "block", color: "#aaa", fontSize: 12, marginBottom: 6, marginTop: 16 },
  input: { width: "100%", background: "#111", border: "1px solid #333", borderRadius: 6, padding: "10px 12px", color: "#f0f0f0", fontSize: 14, outline: "none" },
  select: { width: "100%", background: "#111", border: "1px solid #333", borderRadius: 6, padding: "10px 12px", color: "#f0f0f0", fontSize: 14, outline: "none" },
  btn: { width: "100%", marginTop: 24, padding: "12px 0", background: "#c0392b", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  btnGhost: { width: "100%", marginTop: 10, padding: "10px 0", background: "none", color: "#666", border: "1px solid #333", borderRadius: 6, fontSize: 13, cursor: "pointer" },
  err: { marginTop: 12, color: "#e74c3c", fontSize: 13 },
  ok: { marginTop: 12, color: "#2ecc71", fontSize: 13 },
  verifyBox: { textAlign: "center", marginBottom: 8 },
  verifyTitle: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  verifySub: { color: "#888", fontSize: 13, marginBottom: 20 },
  codeInput: { width: "100%", background: "#111", border: "2px solid #c0392b", borderRadius: 6, padding: "14px 12px", color: "#f0f0f0", fontSize: 22, outline: "none", textAlign: "center", letterSpacing: 8 },
};

export default function Auth({ onLogin }) {
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bloodType, setBloodType] = useState("O+");
  const [postal, setPostal] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // verification step
  const [verifying, setVerifying] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState("");

  async function handleSignIn(e) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const { token } = await signIn(email, password);
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      await signUp(email, password, bloodType, postal);
      setPendingEmail(email);
      setVerifying(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await confirmSignUp(pendingEmail, code.trim());
      setVerifying(false);
      setTab("signin");
      setSuccess("Email verified! Sign in to continue.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.logo}>🩸 Bloodline</div>
          <div style={s.verifyBox}>
            <div style={s.verifyTitle}>Check your email</div>
            <div style={s.verifySub}>We sent a 6-digit code to<br /><strong>{pendingEmail}</strong></div>
          </div>
          <form onSubmit={handleConfirm}>
            <label style={s.label}>Verification Code</label>
            <input
              style={s.codeInput}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="000000"
              autoFocus
              required
            />
            <button style={s.btn} disabled={loading || code.length < 6}>
              {loading ? "Verifying…" : "Confirm Email"}
            </button>
            <button type="button" style={s.btnGhost} onClick={() => { setVerifying(false); setError(""); }}>
              Back
            </button>
          </form>
          {error && <div style={s.err}>{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🩸 Bloodline</div>
        <div style={s.sub}>Singapore's blood supply platform</div>

        <div style={s.tabs}>
          <button style={s.tab(tab === "signin")} onClick={() => { setTab("signin"); setError(""); setSuccess(""); }}>Sign In</button>
          <button style={s.tab(tab === "signup")} onClick={() => { setTab("signup"); setError(""); setSuccess(""); }}>Sign Up</button>
        </div>

        {tab === "signin" ? (
          <form onSubmit={handleSignIn}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            <button style={s.btn} disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" placeholder="Min 8 characters" />
            <label style={s.label}>Blood Type</label>
            <select style={s.select} value={bloodType} onChange={e => setBloodType(e.target.value)}>
              {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <label style={s.label}>Postal Code</label>
            <input style={s.input} type="text" value={postal} onChange={e => setPostal(e.target.value)} placeholder="e.g. 560123" maxLength={6} />
            <button style={s.btn} disabled={loading}>{loading ? "Creating account…" : "Create Account"}</button>
          </form>
        )}

        {error && <div style={s.err}>{error}</div>}
        {success && <div style={s.ok}>{success}</div>}
      </div>
    </div>
  );
}
