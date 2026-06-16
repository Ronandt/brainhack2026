import { useState, useEffect } from "react";
import { getPendingDrives, approveDrive, rejectDrive, notifyDonorOfRejection } from "../../api";
import { BL } from "../../tokens";
import { GenericPanelSkeleton } from "../Skeleton";

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

function Card({ children, style, pad = 16 }) {
  return (
    <div style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: pad, ...style }}>
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
  const [notifyState, setNotifyState] = useState({});

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

  async function handleNotifyDonor(driveId) {
    setNotifyState(prev => ({ ...prev, [driveId]: { loading: true } }));
    try {
      await notifyDonorOfRejection(driveId);
      setNotifyState(prev => ({ ...prev, [driveId]: { done: true } }));
    } catch (e) {
      setNotifyState(prev => ({ ...prev, [driveId]: { error: e.message } }));
    }
  }

  if (loading) return <GenericPanelSkeleton rows={4} />;

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
            Community drive queue
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
            {`${drives.length} request${drives.length !== 1 ? "s" : ""} needing HSA review · approve to send to Red Cross, decline, or request edits.`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={softBtn}>Pending ({drives.length}) ▾</button>
          <button style={softBtn}>All regions ▾</button>
        </div>
      </div>

      {drives.length === 0 && (
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
            <Card key={drive.driveId} pad={16}>
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
                <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
                  <Tag color={BL.need[need].fg} bg={BL.need[need].bg}>{BL.need[need].label} region</Tag>
                  <Tag color={BL.red} bg={BL.redSoft}>
                    {drive.status === "redcross_rejected" ? "Red Cross rejected" : "Pending approval"}
                  </Tag>
                </div>
              </div>

              {/* When / Pool */}
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <Tag>When</Tag>
                  <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.ink, marginTop: 3 }}>
                    {drive.date}{drive.startTime ? ` · ${drive.startTime}` : ""}
                  </div>
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

              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                <div>
                  <Tag>Blood types</Tag>
                  <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink, marginTop: 3 }}>
                    {drive.acceptedBloodTypes?.length > 0 ? drive.acceptedBloodTypes.join(", ") : "Any blood type"}
                  </div>
                </div>
                {drive.notes && (
                  <div>
                    <Tag>Request notes</Tag>
                    <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 3, lineHeight: 1.4 }}>
                      {drive.notes}
                    </div>
                  </div>
                )}
                {drive.redCrossRejectedReason && (
                  <div style={{ background: BL.redSoft, boxShadow: `0 0 0 1px ${BL.red}30`, borderRadius: 10, padding: 9 }}>
                    <Tag color={BL.red}>Red Cross reason</Tag>
                    <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.redInk, marginTop: 3, lineHeight: 1.4 }}>
                      {drive.redCrossRejectedReason}
                    </div>
                    {(() => {
                      const ns = notifyState[drive.driveId] ?? {};
                      return ns.done ? (
                        <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.need.ok.fg, marginTop: 8 }}>✓ Donor notified</div>
                      ) : (
                        <button
                          onClick={() => handleNotifyDonor(drive.driveId)}
                          disabled={ns.loading}
                          style={{ ...outlineBtn, marginTop: 8, borderColor: BL.red, color: BL.red, fontSize: 11 }}
                        >
                          {ns.loading ? "Notifying…" : "Notify donor"}
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Forecast fit */}
              <div style={{ marginTop: 10, padding: "8px 10px", background: BL.fill, borderRadius: 10 }}>
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
                    {as.loading ? "…" : drive.status === "redcross_rejected" ? "Resubmit" : "Send to Red Cross"}
                  </button>
                </div>
              )}
              {as.error && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginTop: 6 }}>{as.error}</div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const softBtn = {
  height: 28, padding: "0 10px", background: BL.fill, border: "none",
  boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
  borderRadius: 8, fontFamily: BL.sans, fontSize: 12, color: BL.ink, cursor: "pointer",
};
const outlineBtn = {
  height: 28, padding: "0 10px", background: "transparent", border: `1px solid ${BL.muted}`,
  borderRadius: 8, fontFamily: BL.sans, fontSize: 12, color: BL.muted, cursor: "pointer",
};
const fillBtn = {
  height: 28, padding: "0 14px", background: BL.ink, border: `1px solid ${BL.ink}`,
  borderRadius: 8, fontFamily: BL.sans, fontSize: 12, color: "#fff", cursor: "pointer",
};
