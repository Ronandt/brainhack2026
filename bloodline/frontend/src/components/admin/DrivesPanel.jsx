import { useState, useEffect } from "react";
import { getPendingDrives, approveDrive, rejectDrive } from "../../api";
import { BL } from "../../tokens";

const s = {
  pageTitle:   { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:     { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 24 },
  card:        { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 18, marginBottom: 10 },
  cardTitle:   { fontFamily: BL.sans, fontWeight: 600, fontSize: 15, color: BL.ink, marginBottom: 4 },
  meta:        { fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginBottom: 12, letterSpacing: 0.4 },
  typeTag:     {
    display: "inline-block", background: BL.fill, borderRadius: 3,
    padding: "2px 7px", fontFamily: BL.mono, fontSize: 10, color: BL.ink2, marginRight: 5, marginBottom: 10,
  },
  actions:     { display: "flex", gap: 8 },
  btnApprove:  {
    padding: "7px 18px", background: BL.need.ok.bg,
    border: `1px solid ${BL.need.ok.fg}`, color: BL.need.ok.fg,
    borderRadius: 6, fontSize: 13, fontFamily: BL.sans, fontWeight: 600, cursor: "pointer",
  },
  btnReject:   {
    padding: "7px 18px", background: BL.need.critical.bg,
    border: `1px solid ${BL.need.critical.fg}`, color: BL.need.critical.fg,
    borderRadius: 6, fontSize: 13, fontFamily: BL.sans, fontWeight: 600, cursor: "pointer",
  },
  empty:       { fontFamily: BL.sans, color: BL.faint, fontSize: 13 },
  ok:          { fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 12, marginTop: 8 },
  err:         { fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 12, marginTop: 8 },
};

export default function DrivesPanel() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
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
      <div style={s.pageTitle}>Community drive queue</div>
      <div style={s.pageSub}>Blood drives pending HSA approval — approve, decline, or request edits.</div>

      {loading && <div style={s.empty}>Loading…</div>}
      {!loading && drives.length === 0 && <div style={s.empty}>No drives pending approval.</div>}

      {drives.map(drive => {
        const as = actionState[drive.driveId] ?? {};
        return (
          <div key={drive.driveId} style={s.card}>
            <div style={s.cardTitle}>{drive.name ?? "Unnamed Drive"}</div>
            <div style={s.meta}>
              {drive.location} · {drive.date} · Capacity: {drive.capacity}
            </div>
            <div>
              {drive.acceptedBloodTypes?.map(t => <span key={t} style={s.typeTag}>{t}</span>)}
            </div>
            {as.done ? (
              <div style={s.ok}>✓ Drive {as.done}d</div>
            ) : (
              <div style={s.actions}>
                <button style={s.btnApprove} onClick={() => handleAction(drive.driveId, "approve")} disabled={as.loading}>
                  {as.loading ? "…" : "Approve"}
                </button>
                <button style={s.btnReject} onClick={() => handleAction(drive.driveId, "reject")} disabled={as.loading}>
                  Decline
                </button>
              </div>
            )}
            {as.error && <div style={s.err}>{as.error}</div>}
          </div>
        );
      })}
    </div>
  );
}
