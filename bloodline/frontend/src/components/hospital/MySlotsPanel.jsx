import { useState, useEffect } from "react";
import { getHospitalDrives } from "../../api";
import { BL } from "../../tokens";

const s = {
  pageTitle: { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:   { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 24 },
  card:      { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 18, marginBottom: 10 },
  cardTitle: { fontFamily: BL.sans, fontWeight: 600, fontSize: 15, color: BL.ink, marginBottom: 4 },
  meta:      { fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.4, marginBottom: 10 },
  empty:     { fontFamily: BL.sans, color: BL.faint, fontSize: 13 },
  barTrack:  { height: 4, background: BL.fill, borderRadius: 2, overflow: "hidden", marginTop: 6 },
};

function statusStyle(status) {
  if (status === "approved") return { background: BL.need.ok.bg, color: BL.need.ok.fg };
  if (status === "rejected") return { background: BL.need.critical.bg, color: BL.need.critical.fg };
  return { background: BL.fill, color: BL.muted };
}

function StatusTag({ status }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 3, marginBottom: 12,
      fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase",
      ...statusStyle(status),
    }}>
      {status ?? "pending"}
    </span>
  );
}

export default function MySlotsPanel() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHospitalDrives()
      .then(d => setDrives(d.drives ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const total = drives.length;
  const approved = drives.filter(d => d.status === "approved").length;
  const totalBooked = drives.reduce((n, d) => n + (d.booked ?? 0), 0);

  return (
    <div>
      <div style={s.pageTitle}>My slots</div>
      <div style={s.pageSub}>Donation drives submitted by your hospital — live booking stats.</div>

      {/* KPI strip */}
      {!loading && !error && total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Total drives", value: total },
            { label: "Approved", value: approved },
            { label: "Total bookings", value: totalBooked },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 14 }}>
              <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ fontFamily: BL.mono, fontSize: 24, fontWeight: 600, color: BL.ink }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <div style={s.empty}>Loading…</div>}
      {error && <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.critical.fg, marginBottom: 16 }}>{error}</div>}
      {!loading && !error && drives.length === 0 && (
        <div style={s.empty}>No slots yet — create your first drive using the form.</div>
      )}

      {drives.map(drive => {
        const pct = drive.capacity > 0 ? Math.round(((drive.booked ?? 0) / drive.capacity) * 100) : 0;
        const almostFull = pct > 80;
        return (
          <div key={drive.driveId} style={s.card}>
            <div style={s.cardTitle}>{drive.name ?? "Unnamed Drive"}</div>
            <div style={s.meta}>
              {drive.date}
              {drive.startTime && ` · ${drive.startTime}`}
              {drive.endTime && `–${drive.endTime}`}
              {" · "}{drive.location}
              {" · "}{drive.capacity} slots
            </div>

            <StatusTag status={drive.status} />

            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: BL.mono, fontSize: 11, color: almostFull ? BL.need.urgent.fg : BL.muted }}>
              <span>{drive.booked ?? 0} / {drive.capacity} booked</span>
              <span>{pct}%</span>
            </div>
            <div style={s.barTrack}>
              <div style={{
                height: "100%", width: `${Math.min(100, pct)}%`, borderRadius: 2,
                background: almostFull ? BL.need.urgent.fg : BL.ink,
              }} />
            </div>

            {drive.acceptedBloodTypes?.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {drive.acceptedBloodTypes.map(t => (
                  <span key={t} style={{
                    fontFamily: BL.mono, fontSize: 10, background: BL.fill,
                    borderRadius: 3, padding: "2px 6px", color: BL.ink2,
                  }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
