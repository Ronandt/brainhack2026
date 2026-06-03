import { useState, useEffect } from "react";
import { getPendingDrives, approveDrive, rejectDrive } from "../../api";

const s = {
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: "#555", fontSize: 13, marginBottom: 24 },
  card: { background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 10, padding: 20, marginBottom: 12 },
  cardTitle: { fontWeight: 700, fontSize: 15, marginBottom: 4 },
  meta: { color: "#666", fontSize: 12, marginBottom: 14 },
  tag: { display: "inline-block", background: "#1e1e2e", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#888", marginRight: 6 },
  actions: { display: "flex", gap: 8 },
  btnApprove: { padding: "7px 18px", background: "#1a3a1a", border: "1px solid #2ecc71", color: "#2ecc71", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnReject: { padding: "7px 18px", background: "#1a0a0a", border: "1px solid #c0392b", color: "#c0392b", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  empty: { color: "#555", fontSize: 13 },
  ok: { color: "#2ecc71", fontSize: 12, marginTop: 8 },
  err: { color: "#e74c3c", fontSize: 12, marginTop: 8 },
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
      <div style={s.title}>Drive Approval Queue</div>
      <div style={s.sub}>Community blood drives awaiting HSA approval</div>

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
            <div style={{ marginBottom: 14 }}>
              {drive.acceptedBloodTypes?.map(t => <span key={t} style={s.tag}>{t}</span>)}
            </div>
            {as.done ? (
              <div style={s.ok}>✓ Drive {as.done}d</div>
            ) : (
              <div style={s.actions}>
                <button style={s.btnApprove} onClick={() => handleAction(drive.driveId, "approve")} disabled={as.loading}>
                  {as.loading ? "…" : "Approve"}
                </button>
                <button style={s.btnReject} onClick={() => handleAction(drive.driveId, "reject")} disabled={as.loading}>
                  Reject
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
