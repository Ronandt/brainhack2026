import { useState, useEffect } from "react";
import { signIn, signUp, confirmSignUp } from "../auth";
import { updateDonor } from "../api";
import { BL } from "../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

const inputStyle = {
  width: "100%", background: BL.paper, border: `1px solid ${BL.hair}`,
  borderRadius: 6, padding: "11px 13px", color: BL.ink,
  fontSize: 14, fontFamily: BL.sans, outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  display: "block", fontFamily: BL.mono, fontSize: 9,
  letterSpacing: 0.6, textTransform: "uppercase", color: BL.muted,
  marginBottom: 5, marginTop: 16,
};

function LeftPanel() {
  return (
    <div style={{
      background: BL.ink, color: "#fff",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "48px 44px", minHeight: "100vh", width: "42%", flexShrink: 0,
    }}>
      {/* Logo */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: BL.red }} />
          <span style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>BloodLine</span>
        </div>

        <div style={{ fontFamily: BL.sans, fontSize: 32, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1.2, maxWidth: 280 }}>
          Keeping Singapore safe, one donation at a time.
        </div>

        <div style={{ fontFamily: BL.sans, fontSize: 14, color: "#9e9993", marginTop: 18, lineHeight: 1.6, maxWidth: 260 }}>
          BloodLine connects donors, hospitals, and the HSA to anticipate shortages before they happen.
        </div>

        {/* Stats */}
        <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            ["14-day forecast", "Bayesian shortage prediction per blood type"],
            ["Surge alerts", "Break-glass mobilisation in under 30 seconds"],
            ["Real-time stock", "Scraped from Red Cross SG every 15 minutes"],
          ].map(([label, sub]) => (
            <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: BL.red, marginTop: 6, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: BL.sans, fontSize: 13, fontWeight: 600, color: "#e9e6e0" }}>{label}</div>
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: "#6b6560", marginTop: 1 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blood type grid */}
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 16 }}>
          {BLOOD_TYPES.map(bt => (
            <div key={bt} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 5, padding: "8px 0", textAlign: "center",
              fontFamily: BL.mono, fontSize: 11, fontWeight: 600, color: "#c8c3bc",
            }}>
              {bt}
            </div>
          ))}
        </div>
        <div style={{ fontFamily: BL.mono, fontSize: 9, color: "#4a4640", letterSpacing: 0.6, textTransform: "uppercase" }}>
          All blood types · Nationally tracked
        </div>
      </div>
    </div>
  );
}

export default function Auth({ onLogin }) {
  const mobile = useIsMobile();
  const [tab,       setTab]       = useState("signin");
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [bloodType, setBloodType] = useState("O+");
  const [postal,    setPostal]    = useState("");
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [loading,   setLoading]   = useState(false);

  const [verifying,   setVerifying]   = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPw,    setPendingPw]   = useState("");
  const [pendingName,  setPendingName] = useState("");
  const [pendingBT,    setPendingBT]   = useState("");
  const [pendingPC,    setPendingPC]   = useState("");
  const [code,         setCode]        = useState("");

  function switchTab(t) { setTab(t); setError(""); setSuccess(""); }

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
      await signUp(email, password, name, bloodType, postal);
      setPendingEmail(email);
      setPendingPw(password);
      setPendingName(name);
      setPendingBT(bloodType);
      setPendingPC(postal);
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
      // Auto sign-in then persist profile to DynamoDB immediately
      const { token } = await signIn(pendingEmail, pendingPw);
      try {
        await updateDonor({ name: pendingName, bloodType: pendingBT, postalCode: pendingPC });
      } catch {}
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formContent = verifying ? (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, marginBottom: 6 }}>
          Check your email
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.muted, lineHeight: 1.5 }}>
          We sent a 6-digit code to <strong style={{ color: BL.ink }}>{pendingEmail}</strong>
        </div>
      </div>
      <form onSubmit={handleConfirm}>
        <label style={labelStyle}>Verification code</label>
        <input
          style={{ ...inputStyle, fontSize: 24, textAlign: "center", letterSpacing: 10, fontFamily: BL.mono }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="000000"
          autoFocus
          required
        />
        <button
          type="submit"
          disabled={loading || code.length < 6}
          style={{
            width: "100%", marginTop: 20, padding: "13px 0",
            background: code.length < 6 ? BL.hair : BL.ink,
            color: code.length < 6 ? BL.muted : "#fff",
            border: "none", borderRadius: 8,
            fontFamily: BL.sans, fontSize: 14, fontWeight: 600,
            cursor: code.length < 6 ? "default" : "pointer",
          }}
        >
          {loading ? "Verifying…" : "Confirm email"}
        </button>
        <button
          type="button"
          onClick={() => { setVerifying(false); setError(""); }}
          style={{
            width: "100%", marginTop: 8, padding: "10px 0",
            background: "none", border: `1px solid ${BL.hair}`,
            borderRadius: 8, fontFamily: BL.sans, fontSize: 13,
            color: BL.muted, cursor: "pointer",
          }}
        >
          Back
        </button>
      </form>
      {error && <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.critical.fg, marginTop: 12 }}>{error}</div>}
    </div>
  ) : (
    <div>
      {/* Header */}
      {mobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 16, height: 16, borderRadius: 3, background: BL.red }} />
          <span style={{ fontFamily: BL.sans, fontSize: 15, fontWeight: 700, color: BL.ink, letterSpacing: -0.2 }}>BloodLine</span>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, marginBottom: 4 }}>
          {tab === "signin" ? "Welcome back" : "Create your account"}
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.muted }}>
          {tab === "signin" ? "Sign in to your donor account." : "Join Singapore's blood donor network."}
        </div>
      </div>

      {/* Tab toggle */}
      <div style={{ display: "flex", background: BL.fill, borderRadius: 8, padding: 3, marginBottom: 24 }}>
        {["signin", "signup"].map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            style={{
              flex: 1, padding: "8px 0", border: "none", borderRadius: 6, cursor: "pointer",
              fontFamily: BL.sans, fontSize: 13, fontWeight: 600,
              background: tab === t ? BL.card : "transparent",
              color: tab === t ? BL.ink : BL.muted,
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            {t === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      {tab === "signin" ? (
        <form onSubmit={handleSignIn}>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
          <label style={labelStyle}>Password</label>
          <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", marginTop: 24, padding: "13px 0",
              background: BL.ink, color: "#fff", border: "none", borderRadius: 8,
              fontFamily: BL.sans, fontSize: 14, fontWeight: 600,
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignUp}>
          <label style={labelStyle}>Full name</label>
          <input style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" placeholder="Your full name" />
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
          <label style={labelStyle}>Password</label>
          <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" placeholder="Min 8 characters" />

          <label style={labelStyle}>Blood type</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {BLOOD_TYPES.map(bt => {
              const sel = bloodType === bt;
              return (
                <button
                  key={bt}
                  type="button"
                  onClick={() => setBloodType(bt)}
                  style={{
                    width: 48, height: 40, borderRadius: 6, cursor: "pointer",
                    border: sel ? `2px solid ${BL.ink}` : `1px solid ${BL.hair}`,
                    background: sel ? BL.ink : BL.paper,
                    fontFamily: BL.mono, fontSize: 12, fontWeight: 600,
                    color: sel ? "#fff" : BL.muted,
                  }}
                >
                  {bt}
                </button>
              );
            })}
          </div>

          <label style={labelStyle}>Postal code</label>
          <input style={inputStyle} type="text" value={postal} onChange={e => setPostal(e.target.value)} placeholder="e.g. 560123" maxLength={6} />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", marginTop: 24, padding: "13px 0",
              background: BL.ink, color: "#fff", border: "none", borderRadius: 8,
              fontFamily: BL.sans, fontSize: 14, fontWeight: 600,
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}

      {error   && <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.critical.fg, marginTop: 12 }}>{error}</div>}
      {success && <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.ok.fg, marginTop: 12 }}>{success}</div>}
    </div>
  );

  if (mobile) {
    // On mobile the button is rendered separately so it can sit at the bottom
    const isSignIn = tab === "signin" && !verifying;
    const isSignUp = tab === "signup" && !verifying;

    return (
      <div style={{
        minHeight: "100dvh", background: BL.paper,
        display: "flex", flexDirection: "column",
        paddingTop: "max(52px, env(safe-area-inset-top))",
        paddingBottom: "max(36px, env(safe-area-inset-bottom))",
        paddingLeft: 24, paddingRight: 24,
        boxSizing: "border-box",
      }}>
        {/* ── Top: logo ─────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <div style={{ width: 16, height: 16, borderRadius: 3, background: BL.red }} />
          <span style={{ fontFamily: BL.sans, fontSize: 15, fontWeight: 700, color: BL.ink, letterSpacing: -0.2 }}>BloodLine</span>
        </div>

        {/* ── Title + subtitle ──────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: BL.sans, fontSize: 26, fontWeight: 600, color: BL.ink, letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 6 }}>
            {verifying ? "Check your email" : tab === "signin" ? "Welcome back" : "Create your account"}
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.muted, lineHeight: 1.5 }}>
            {verifying
              ? <>We sent a 6-digit code to <strong style={{ color: BL.ink }}>{pendingEmail}</strong></>
              : tab === "signin" ? "Sign in to your donor account." : "Join Singapore's blood donor network."}
          </div>
        </div>

        {/* ── Tab toggle (sign-in / sign-up only) ─ */}
        {!verifying && (
          <div style={{ display: "flex", background: BL.fill, borderRadius: 8, padding: 3, marginBottom: 20 }}>
            {["signin", "signup"].map(t => (
              <button key={t} onClick={() => switchTab(t)} style={{
                flex: 1, padding: "8px 0", border: "none", borderRadius: 6, cursor: "pointer",
                fontFamily: BL.sans, fontSize: 13, fontWeight: 600,
                background: tab === t ? BL.card : "transparent",
                color: tab === t ? BL.ink : BL.muted,
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>
                {t === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>
        )}

        {/* ── Fields ───────────────────────────── */}
        {verifying && (
          <form id="mobile-form" onSubmit={handleConfirm}>
            <label style={labelStyle}>Verification code</label>
            <input
              style={{ ...inputStyle, fontSize: 24, textAlign: "center", letterSpacing: 10, fontFamily: BL.mono }}
              type="text" inputMode="numeric" maxLength={6}
              value={code} onChange={e => setCode(e.target.value)}
              placeholder="000000" autoFocus required
            />
          </form>
        )}

        {isSignIn && (
          <form id="mobile-form" onSubmit={handleSignIn}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
            <label style={labelStyle}>Password</label>
            <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </form>
        )}

        {isSignUp && (
          <form id="mobile-form" onSubmit={handleSignUp} style={{ flex: 1, overflowY: "auto" }}>
            <label style={labelStyle}>Full name</label>
            <input style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" placeholder="Your full name" />
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
            <label style={labelStyle}>Password</label>
            <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" placeholder="Min 8 characters" />
            <label style={labelStyle}>Blood type</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {BLOOD_TYPES.map(bt => {
                const sel = bloodType === bt;
                return (
                  <button key={bt} type="button" onClick={() => setBloodType(bt)} style={{
                    width: 48, height: 40, borderRadius: 6, cursor: "pointer",
                    border: sel ? `2px solid ${BL.ink}` : `1px solid ${BL.hair}`,
                    background: sel ? BL.ink : BL.paper,
                    fontFamily: BL.mono, fontSize: 12, fontWeight: 600,
                    color: sel ? "#fff" : BL.muted,
                  }}>{bt}</button>
                );
              })}
            </div>
            <label style={labelStyle}>Postal code</label>
            <input style={inputStyle} type="text" value={postal} onChange={e => setPostal(e.target.value)} placeholder="e.g. 560123" maxLength={6} />
          </form>
        )}

        {error   && <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.critical.fg, marginTop: 10 }}>{error}</div>}
        {success && <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.ok.fg, marginTop: 10 }}>{success}</div>}

        {/* ── Spacer pushes button down ─────────── */}
        <div style={{ flex: 1 }} />

        {/* ── Bottom: primary action ────────────── */}
        <div style={{ marginTop: 24 }}>
          <button
            type="submit"
            form="mobile-form"
            disabled={loading || (verifying && code.length < 6)}
            style={{
              width: "100%", padding: "15px 0",
              background: BL.ink, color: "#fff", border: "none", borderRadius: 10,
              fontFamily: BL.sans, fontSize: 15, fontWeight: 600,
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
              minHeight: 52,
            }}
          >
            {loading ? "Please wait…"
              : verifying ? "Confirm email"
              : tab === "signin" ? "Sign in"
              : "Create account"}
          </button>
          {verifying && (
            <button type="button" onClick={() => { setVerifying(false); setError(""); }} style={{
              width: "100%", marginTop: 10, padding: "12px 0",
              background: "none", border: `1px solid ${BL.hair}`, borderRadius: 10,
              fontFamily: BL.sans, fontSize: 14, color: BL.muted, cursor: "pointer",
            }}>
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: BL.sans }}>
      <LeftPanel />
      <div style={{
        flex: 1, background: BL.paper,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 64px",
      }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {formContent}
        </div>
      </div>
    </div>
  );
}
