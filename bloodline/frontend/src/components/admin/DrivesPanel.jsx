import { useState, useEffect } from "react";
import { getPendingDrives, approveDrive, rejectDrive } from "../../api";
import { BL } from "../../tokens";

function Tag({ children, color, bg }) {
  return (
    <span style={{
      fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase",
      color: color || BL.muted,
      ...(bg ? { background: bg, padding: "2px 6px", borderRadius: 3, display: "inline-block" } : {}),
    }}>
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

// Map drive priority/region to a need level for colouring
function driveNeed(drive, index) {
  const patterns = ["critical", "urgent", "urgent", "low", "ok", "low"];
  return patterns[index % patterns.length];
}

function driveForecastFit(drive) {
  return drive.forecastFit ?? "Covers regional collection gap based on current stock levels.";
}

export default function DrivesPanel() {
  const [drives,      setDrives]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [actionState, setActionState] = useState({});

  useEffect(() => {
    getPendingDrives()
      .then(d => setDrives(d.drives ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(driveId, action) {
    setActionState(prev => ({ ...prev, [driveId]: { loading: true } }));
    try {
      await (action === "approve" ? approveDrive(driveId) : rejectDrive(driveId));
      setDrives(prev => prev.filter(d => d.driveId !== driveId));
      setActionState(prev => ({ ...prev, [driveId]: { done: action } }));
    } catch (e) {
      setActionState(prev => ({ ...prev, [driveId]: { error: e.message } }));
    }
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
            Community drive queue
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
            {loading ? "Loading…" : `${drives.length} pending request${drives.length !== 1 ? "s" : ""} · approve, decline, or request edits.`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={softBtn}>Pending ({drives.length}) ▾</button>
          <button style={softBtn}>All regions ▾</button>
        </div>
      </div>

      {!loading && drives.length === 0 && (
        <div style={{ fontFamily: BL.sans, color: BL.faint, fontSize: 13 }}>No drives pending approval.</div>
      )}

      {/* 2-column card grid — matches prototype DriveQueue */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {drives.map((drive, i) => {
          const as   = actionState[drive.driveId] ?? {};
          const need = driveNeed(drive, i);
          const fit  = driveForecastFit(drive);
          const reqNum = 8120 + i;

          return (
            <W key={drive.driveId} pad={16}>
              {/* Card header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Tag>Request · #{reqNum}</Tag>
                  <div style={{ fontFamily: BL.sans, fontSize: 15, color: BL.ink, fontWeight: 600, marginTop: 4 }}>
                    {drive.name ?? "Unnamed Drive"}
                  </div>
                  <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 2 }}>
                    {drive.location}
                  </div>
                </div>
                <Tag color={BL.need[need].fg} bg={BL.need[need].bg}>{BL.need[need].label} region</Tag>
              </div>

              {/* When / Pool */}
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <Tag>When</Tag>
                  <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.ink, marginTop: 3 }}>{drive.date}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <Tag>Pool</Tag>
                  <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.ink, marginTop: 3 }}>
                    Capacity: {drive.capacity}
                    {drive.acceptedBloodTypes?.length > 0 && (
                      <span style={{ color: BL.muted }}> · {drive.acceptedBloodTypes.slice(0, 3).join(", ")}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Forecast fit */}
              <div style={{ marginTop: 10, padding: "8px 10px", background: BL.fill, borderRadius: 4 }}>
                <Tag>Forecast fit</Tag>
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink, marginTop: 3, lineHeight: 1.4 }}>{fit}</div>
              </div>

              {/* Actions */}
              {as.done ? (
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.ok.fg, fontWeight: 500, marginTop: 12 }}>
                  ✓ Drive {as.done}d
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <button
                    onClick={() => handleAction(drive.driveId, "reject")}
                    disabled={as.loading}
                    style={outlineBtn}
                  >
                    Decline
                  </button>
                  <button
                    disabled={as.loading}
                    style={outlineBtn}
                  >
                    Ask edits
                  </button>
                  <button
                    onClick={() => handleAction(drive.driveId, "approve")}
                    disabled={as.loading}
                    style={{ ...fillBtn, marginLeft: "auto" }}
                  >
                    {as.loading ? "…" : "Approve"}
                  </button>
                </div>
              )}
              {as.error && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginTop: 6 }}>{as.error}</div>}
            </W>
          );
        })}
      </div>
    </div>
  );
}

const softBtn = {
  height: 28, padding: "0 10px", background: BL.fill, border: `1px solid ${BL.hair}`,
  borderRadius: 6, fontFamily: BL.sans, fontSize: 12, color: BL.ink, cursor: "pointer",
};
const outlineBtn = {
  height: 28, padding: "0 10px", background: "transparent", border: `1px solid ${BL.muted}`,
  borderRadius: 6, fontFamily: BL.sans, fontSize: 12, color: BL.muted, cursor: "pointer",
};
const fillBtn = {
  height: 28, padding: "0 14px", background: BL.ink, border: `1px solid ${BL.ink}`,
  borderRadius: 6, fontFamily: BL.sans, fontSize: 12, color: "#fff", cursor: "pointer",
};
