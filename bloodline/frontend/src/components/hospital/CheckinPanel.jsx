import { useState, useEffect, useRef } from "react";
import { lookupDonor, recordDonation } from "../../api";
import { BL } from "../../tokens";

// ── QR scanner overlay ────────────────────────────────────────────
// Mounts html5-qrcode into a div, streams back camera, calls onScan on decode.
function QrScanner({ onScan, onClose }) {
  const containerRef = useRef(null);
  const scannerRef   = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = "hs-qr-reader";
    let scanner;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode(id, { verbose: false });
      scannerRef.current = scanner;

      const config = { fps: 12, qrbox: { width: 240, height: 240 } };
      const onDecode = (decodedText) => {
        scanner.stop().catch(() => {});
        onScan(decodedText);
      };

      // Enumerate cameras first so we work on both laptops (front cam only)
      // and mobile (prefer back cam)
      Html5Qrcode.getCameras()
        .then(cameras => {
          if (!cameras || cameras.length === 0) {
            setError("No camera found on this device.");
            return;
          }
          // Prefer back camera by label; fall back to last in list, then first
          const back = cameras.find(c =>
            /back|rear|environment/i.test(c.label)
          );
          const cam = back ?? cameras[cameras.length - 1];
          return scanner.start(cam.id, config, onDecode, () => {});
        })
        .catch(err => {
          setError("Camera access denied — allow camera permission in your browser and try again.");
          console.error("[QR] camera error:", err);
        });
    }).catch(() => setError("Failed to load QR scanner."));

    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
  }, []);

  return (
    // Fixed full-screen overlay
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 480, padding: "0 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: "#fff" }}>
            Scan donor QR code
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6,
              color: "#fff", fontFamily: BL.sans, fontSize: 13, padding: "6px 14px", cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>

        {/* Camera feed — html5-qrcode renders into this div */}
        <div
          id="hs-qr-reader"
          ref={containerRef}
          style={{ borderRadius: 10, overflow: "hidden", background: "#000" }}
        />

        {error ? (
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: "#fca5a5", marginTop: 14, textAlign: "center" }}>
            {error}
          </div>
        ) : (
          <div style={{ fontFamily: BL.mono, fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 14, textAlign: "center", letterSpacing: 0.6, textTransform: "uppercase" }}>
            Point camera at the donor's QR code
          </div>
        )}
      </div>
    </div>
  );
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function Tag({ children, color }) {
  return (
    <span style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: color || BL.muted }}>
      {children}
    </span>
  );
}

function W({ children, style, pad = 16 }) {
  return (
    <div style={{ background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: pad, ...style }}>
      {children}
    </div>
  );
}

function StepIndicator({ current }) {
  const steps = ["Admit", "Blood draw", "Confirm"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24 }}>
      {steps.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14,
                background: done ? BL.ink : active ? BL.ink : BL.fill,
                border: `2px solid ${done || active ? BL.ink : BL.hair}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: BL.mono, fontSize: 11, fontWeight: 600,
                color: done || active ? "#fff" : BL.muted,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontFamily: BL.mono, fontSize: 9, color: active ? BL.ink : BL.muted, letterSpacing: 0.4, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? BL.ink : BL.hair, margin: "0 8px", marginBottom: 20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CheckinPanel() {
  const [step,         setStep]         = useState(0);
  const [donorIdInput, setDonorIdInput] = useState("");
  const [looking,      setLooking]      = useState(false);
  const [lookupError,  setLookupError]  = useState("");
  const [donor,        setDonor]        = useState(null);
  const [bloodType,    setBloodType]    = useState("");
  const [volumeMl,     setVolumeMl]     = useState(450);
  const [facility,     setFacility]     = useState("Bloodbank@HSA");
  const [submitting,   setSubmitting]   = useState(false);
  const [result,       setResult]       = useState(null);
  const [submitError,  setSubmitError]  = useState("");
  const [scanning,     setScanning]     = useState(false);

  const inputStyle = {
    width: "100%", background: BL.card, border: `1px solid ${BL.rule}`, borderRadius: 6,
    padding: "10px 12px", color: BL.ink, fontSize: 14, fontFamily: BL.sans, outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = { display: "block", fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginBottom: 5, letterSpacing: 0.4, textTransform: "uppercase" };

  async function runLookup(id) {
    setLooking(true); setLookupError("");
    try {
      const d = await lookupDonor(id.trim());
      setDonor(d);
      setBloodType(d.bloodType || "");
      setStep(1);
    } catch (err) {
      setLookupError(err.message?.includes("not found") ? "Donor not found. Check the ID and try again." : err.message);
    } finally {
      setLooking(false);
    }
  }

  async function handleLookup(e) {
    e.preventDefault();
    if (!donorIdInput.trim()) return;
    await runLookup(donorIdInput);
  }

  async function handleScan(decodedText) {
    setScanning(false);
    setDonorIdInput(decodedText);
    await runLookup(decodedText);
  }

  async function handleConfirm() {
    setSubmitting(true); setSubmitError("");
    try {
      const res = await recordDonation({
        donorId: donor.donorId,
        bloodType,
        volumeMl,
        facility,
        donatedAt: new Date().toISOString(),
      });
      setResult(res);
      setStep(2);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep(0); setDonor(null); setDonorIdInput("");
    setResult(null); setLookupError(""); setSubmitError("");
    setBloodType(""); setVolumeMl(450);
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
          Donor check-in
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
          Admit a donor, record the blood draw, and confirm their donation. Updates their impact card instantly.
        </div>
      </div>

      <StepIndicator current={step} />

      {/* QR scanner overlay — rendered at body level via fixed positioning */}
      {scanning && (
        <QrScanner
          onScan={handleScan}
          onClose={() => setScanning(false)}
        />
      )}

      {/* ── Step 0: Admit ──────────────────────────────────────── */}
      {step === 0 && (
        <W pad={20}>
          <Tag>Step 1 · Find donor</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6, marginBottom: 16, lineHeight: 1.5 }}>
            Scan the donor's QR code, or enter their ID manually.
          </div>

          {/* Primary: scan QR */}
          <button
            type="button"
            onClick={() => setScanning(true)}
            style={{
              width: "100%", padding: "13px 0", marginBottom: 12,
              background: BL.ink, color: "#fff",
              border: "none", borderRadius: 8, fontFamily: BL.sans,
              fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 50,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>⬛</span> Scan QR code
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: BL.hair }} />
            <span style={{ fontFamily: BL.mono, fontSize: 9, color: BL.faint, letterSpacing: 0.6, textTransform: "uppercase" }}>or enter manually</span>
            <div style={{ flex: 1, height: 1, background: BL.hair }} />
          </div>

          {/* Fallback: manual entry */}
          <form onSubmit={handleLookup}>
            <label style={labelStyle} htmlFor="donor-id">Donor ID</label>
            <input
              id="donor-id"
              style={inputStyle}
              value={donorIdInput}
              onChange={e => setDonorIdInput(e.target.value)}
              placeholder="Paste the donor's ID"
              autoComplete="off"
            />
            {lookupError && (
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg, marginTop: 8 }}>
                {lookupError}
              </div>
            )}
            <button
              type="submit"
              disabled={looking || !donorIdInput.trim()}
              style={{
                marginTop: 10, width: "100%", padding: "11px 0",
                background: "none",
                color: !donorIdInput.trim() ? BL.faint : BL.ink,
                border: `1px solid ${!donorIdInput.trim() ? BL.hair : BL.ink}`,
                borderRadius: 8, fontFamily: BL.sans, fontSize: 14,
                fontWeight: 500, cursor: !donorIdInput.trim() ? "default" : "pointer",
                minHeight: 44,
              }}
            >
              {looking ? "Looking up…" : "Find donor"}
            </button>
          </form>
        </W>
      )}

      {/* ── Step 1: Blood draw ─────────────────────────────────── */}
      {step === 1 && donor && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Donor card */}
          <W pad={16}>
            <Tag>Donor admitted</Tag>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 24, background: BL.fill,
                border: `1px solid ${BL.hair}`, display: "flex", alignItems: "center",
                justifyContent: "center", fontFamily: BL.sans, fontSize: 18, fontWeight: 600,
                color: BL.ink, flexShrink: 0,
              }}>
                {(donor.name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink }}>{donor.name ?? "—"}</div>
                <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2, letterSpacing: 0.3 }}>
                  {donor.donorId?.slice(0, 16)}…
                </div>
              </div>
              <div style={{
                background: donor.eligible ? BL.need.ok.bg : BL.need.urgent.bg,
                border: `1.5px solid ${donor.eligible ? BL.need.ok.fg : BL.need.urgent.fg}`,
                borderRadius: 6, padding: "8px 12px", textAlign: "center",
              }}>
                <div style={{ fontFamily: BL.mono, fontSize: 15, fontWeight: 700, color: BL.ink }}>{donor.bloodType}</div>
                <div style={{ fontFamily: BL.mono, fontSize: 8, color: donor.eligible ? BL.need.ok.fg : BL.need.urgent.fg, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 }}>
                  {donor.eligible ? "eligible" : `${donor.daysUntilEligible}d wait`}
                </div>
              </div>
            </div>
            {!donor.eligible && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: BL.need.urgent.bg, borderRadius: 5 }}>
                <Tag color={BL.need.urgent.fg}>⚠ Donor not yet eligible — {donor.daysUntilEligible} days remaining since last donation</Tag>
              </div>
            )}
          </W>

          {/* Draw details */}
          <W pad={20}>
            <Tag>Step 2 · Blood draw details</Tag>
            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>Confirm blood type</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {BLOOD_TYPES.map(bt => {
                  const sel = bloodType === bt;
                  return (
                    <button key={bt} type="button" onClick={() => setBloodType(bt)} style={{
                      width: 48, height: 48, borderRadius: 6, cursor: "pointer",
                      border: sel ? `2px solid ${BL.ink}` : `1px solid ${BL.hair}`,
                      background: sel ? BL.fill : BL.card,
                      fontFamily: BL.mono, fontSize: 12, fontWeight: 600,
                      color: sel ? BL.ink : BL.muted,
                    }}>
                      {bt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle} htmlFor="volume">Volume drawn (ml)</label>
                <input
                  id="volume"
                  style={inputStyle}
                  type="number"
                  value={volumeMl}
                  onChange={e => setVolumeMl(Number(e.target.value))}
                  min={100}
                  max={600}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="facility">Facility</label>
                <input
                  id="facility"
                  style={inputStyle}
                  value={facility}
                  onChange={e => setFacility(e.target.value)}
                />
              </div>
            </div>

            {submitError && (
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg, marginTop: 10 }}>{submitError}</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setStep(0)} style={{
                padding: "11px 18px", background: "none", border: `1px solid ${BL.hair}`,
                borderRadius: 6, fontFamily: BL.sans, fontSize: 13, color: BL.muted, cursor: "pointer",
              }}>
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting || !bloodType}
                style={{
                  flex: 1, padding: "11px 0",
                  background: !bloodType ? BL.hair : BL.ink,
                  color: !bloodType ? BL.muted : "#fff",
                  border: "none", borderRadius: 6, fontFamily: BL.sans,
                  fontSize: 14, fontWeight: 600,
                  cursor: !bloodType || submitting ? "default" : "pointer",
                  minHeight: 48,
                }}
              >
                {submitting ? "Recording…" : "Confirm donation →"}
              </button>
            </div>
          </W>
        </div>
      )}

      {/* ── Step 2: Done ───────────────────────────────────────── */}
      {step === 2 && result && (
        <div>
          <W pad={20} style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 32, background: BL.need.ok.bg,
              border: `2px solid ${BL.need.ok.fg}`, margin: "0 auto 16px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, color: BL.need.ok.fg,
            }}>✓</div>
            <div style={{ fontFamily: BL.sans, fontSize: 20, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
              Donation recorded
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6 }}>
              {donor?.name}'s impact card has been updated.
            </div>
          </W>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { l: "Blood type", v: result.bloodType },
              { l: "Volume",     v: `${result.volumeMl} ml` },
              { l: "Patients",   v: `+${result.patientsReached}` },
            ].map(({ l, v }) => (
              <W key={l} pad={14} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: BL.mono, fontSize: 20, fontWeight: 600, color: BL.ink, letterSpacing: -0.4 }}>{v}</div>
                <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginTop: 4, letterSpacing: 0.4, textTransform: "uppercase" }}>{l}</div>
              </W>
            ))}
          </div>

          <W pad={14} style={{ background: BL.fill, marginBottom: 14 }}>
            <Tag>Donation ID</Tag>
            <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 4, wordBreak: "break-all" }}>
              {result.donationId}
            </div>
          </W>

          <button
            onClick={reset}
            style={{
              width: "100%", padding: "13px 0", background: BL.ink, color: "#fff",
              border: "none", borderRadius: 8, fontFamily: BL.sans, fontSize: 14,
              fontWeight: 600, cursor: "pointer", minHeight: 50,
            }}
          >
            Check in next donor
          </button>
        </div>
      )}
    </div>
  );
}
