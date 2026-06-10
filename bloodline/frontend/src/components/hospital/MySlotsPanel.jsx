import { useState, useEffect } from "react";
import { getHospitalSlots } from "../../api";
import { BL } from "../../tokens";
import { MySlotsSkeletonPanel } from "../Skeleton";

const s = {
  pageTitle: { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:   { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 24 },
  card:      { background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 18, marginBottom: 10 },
  cardTitle: { fontFamily: BL.sans, fontWeight: 600, fontSize: 15, color: BL.ink, marginBottom: 4 },
  meta:      { fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.4, marginBottom: 10 },
  empty:     { fontFamily: BL.sans, color: BL.faint, fontSize: 13 },
  barTrack:  { height: 4, background: BL.fill, borderRadius: 2, overflow: "hidden", marginTop: 6 },
};

function StatusTag({ status }) {
  const styles = {
    available: { background: BL.need.ok.bg,       color: BL.need.ok.fg },
    full:      { background: BL.need.urgent.bg,    color: BL.need.urgent.fg },
    cancelled: { background: BL.need.critical.bg,  color: BL.need.critical.fg },
  };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 3, marginBottom: 12,
      fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase",
      ...(styles[status] ?? { background: BL.fill, color: BL.muted }),
    }}>
      {status ?? "available"}
    </span>
  );
}

export default function MySlotsPanel() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHospitalSlots()
      .then(d => setSlots(d.slots ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const total = slots.length;
  const available = slots.filter(s => s.status === "available").length;
  const totalBooked = slots.reduce((n, s) => n + (s.booked ?? 0), 0);

  return (
    <div>
      <div style={s.pageTitle}>My slots</div>
      <div style={s.pageSub}>Donation slots posted by your hospital — live booking stats.</div>

      {!loading && !error && total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Total slots", value: total },
            { label: "Available",   value: available },
            { label: "Bookings",    value: totalBooked },
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

      {loading && <MySlotsSkeletonPanel />}
      {error && <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.critical.fg, marginBottom: 16 }}>{error}</div>}
      {!loading && !error && slots.length === 0 && (
        <div style={s.empty}>No slots yet — create your first slot using the form.</div>
      )}

      {slots.map(slot => {
        const pct = slot.capacity > 0 ? Math.round(((slot.booked ?? 0) / slot.capacity) * 100) : 0;
        const almostFull = pct > 80;
        return (
          <div key={slot.slotId} style={s.card}>
            <div style={s.cardTitle}>{slot.location}</div>
            <div style={s.meta}>
              {slot.date}
              {slot.startTime && ` · ${slot.startTime}`}
              {slot.endTime && `–${slot.endTime}`}
              {" · "}{slot.capacity} capacity
            </div>

            <StatusTag status={slot.status} />

            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: BL.mono, fontSize: 11, color: almostFull ? BL.need.urgent.fg : BL.muted }}>
              <span>{slot.booked ?? 0} / {slot.capacity} booked</span>
              <span>{pct}%</span>
            </div>
            <div style={s.barTrack}>
              <div style={{
                height: "100%", width: `${Math.min(100, pct)}%`, borderRadius: 2,
                background: almostFull ? BL.need.urgent.fg : BL.ink,
              }} />
            </div>

            {slot.acceptedBloodTypes?.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {slot.acceptedBloodTypes.map(t => (
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
