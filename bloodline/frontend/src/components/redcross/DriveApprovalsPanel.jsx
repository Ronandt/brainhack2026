import { useEffect, useState } from "react";
import { approveRedCrossDrive, getRedCrossPendingDrives, rejectRedCrossDrive } from "../../api";
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

function Card({ children }) {
  return (
    <div style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: 16 }}>
      {children}
    </div>
  );
}

export default function DriveApprovalsPanel() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState({});
  const [reasons, setReasons] = useState({});

  useEffect(() => {
    getRedCrossPendingDrives()
      .then(d => setDrives(d.drives ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(driveId) {
    setActionState(prev => ({ ...prev, [driveId]: { loading: true } }));
    try {
      await approveRedCrossDrive(driveId);
      setDrives(prev => prev.filter(d => d.driveId !== driveId));
      setActionState(prev => ({ ...prev, [driveId]: { done: "approved" } }));
    } catch (e) {
      setActionState(prev => ({ ...prev, [driveId]: { error: e.message } }));
    }
  }

  async function handleReject(driveId) {
    const reason = (reasons[driveId] ?? "").trim();
    if (!reason) {
      setActionState(prev => ({ ...prev, [driveId]: { error: "Add a rejection reason first." } }));
      return;
    }

    setActionState(prev => ({ ...prev, [driveId]: { loading: true } }));
    try {
      await rejectRedCrossDrive(driveId, reason);
      setDrives(prev => prev.filter(d => d.driveId !== driveId));
      setActionState(prev => ({ ...prev, [driveId]: { done: "sent back" } }));
    } catch (e) {
      setActionState(prev => ({ ...prev, [driveId]: { error: e.message } }));
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
            Drive final approvals
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
            {loading ? "Loading..." : `${drives.length} request${drives.length !== 1 ? "s" : ""} awaiting Red Cross review.`}
          </div>
        </div>
        <Tag color={BL.red} bg={BL.redSoft}>Red Cross review</Tag>
      </div>

      {!loading && drives.length === 0 && (
        <div style={{ fontFamily: BL.sans, color: BL.faint, fontSize: 13 }}>No drives awaiting final approval.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {drives.map(drive => {
          const as = actionState[drive.driveId] ?? {};
          return (
            <Card key={drive.driveId}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <Tag>HSA approved</Tag>
                  <div style={{ fontFamily: BL.sans, fontSize: 15, color: BL.ink, fontWeight: 600, marginTop: 4 }}>
                    {drive.name ?? "Unnamed Drive"}
                  </div>
                  <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 2 }}>
                    {drive.location}
                  </div>
                </div>
                <Tag color={BL.need.low.fg} bg={BL.need.low.bg}>Final check</Tag>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div>
                  <Tag>When</Tag>
                  <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.ink, marginTop: 3 }}>
                    {drive.date}{drive.startTime ? ` · ${drive.startTime}` : ""}
                  </div>
                </div>
                <div>
                  <Tag>Capacity</Tag>
                  <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.ink, marginTop: 3 }}>
                    {drive.capacity}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <Tag>Blood types</Tag>
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink, marginTop: 3 }}>
                  {drive.acceptedBloodTypes?.length > 0 ? drive.acceptedBloodTypes.join(", ") : "Any blood type"}
                </div>
              </div>

              {drive.notes && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: BL.fill, borderRadius: 10 }}>
                  <Tag>Admin context</Tag>
                  <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink, marginTop: 3, lineHeight: 1.4 }}>{drive.notes}</div>
                </div>
              )}

              <textarea
                value={reasons[drive.driveId] ?? ""}
                onChange={e => setReasons(prev => ({ ...prev, [drive.driveId]: e.target.value }))}
                placeholder="Reason required if rejecting"
                style={{ width: "100%", boxSizing: "border-box", minHeight: 68, marginTop: 12, padding: 10, border: `1px solid ${BL.hair}`, borderRadius: 10, fontFamily: BL.sans, fontSize: 12, color: BL.ink, resize: "vertical" }}
              />

              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button onClick={() => handleReject(drive.driveId)} disabled={as.loading} style={outlineBtn}>
                  Reject
                </button>
                <button onClick={() => handleApprove(drive.driveId)} disabled={as.loading} style={{ ...fillBtn, marginLeft: "auto" }}>
                  {as.loading ? "..." : "Final approve"}
                </button>
              </div>
              {as.done && <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.ok.fg, fontWeight: 500, marginTop: 8 }}>Drive {as.done}.</div>}
              {as.error && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginTop: 8 }}>{as.error}</div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const outlineBtn = {
  height: 30, padding: "0 12px", background: "transparent", border: `1px solid ${BL.muted}`,
  borderRadius: 8, fontFamily: BL.sans, fontSize: 12, color: BL.muted, cursor: "pointer",
};
const fillBtn = {
  height: 30, padding: "0 14px", background: BL.ink, border: `1px solid ${BL.ink}`,
  borderRadius: 8, fontFamily: BL.sans, fontSize: 12, color: "#fff", cursor: "pointer",
};
