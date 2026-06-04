import { useState } from "react";
import { createDrive } from "../../api";
import { BL } from "../../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const s = {
  pageTitle: { fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 4 },
  pageSub:   { fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 24 },
  label:     { fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6, display: "block" },
  input:     {
    width: "100%", padding: "9px 12px", border: `1px solid ${BL.hair}`, borderRadius: 6,
    fontFamily: BL.sans, fontSize: 14, color: BL.ink, background: BL.card,
    boxSizing: "border-box", outline: "none",
  },
  group:     { marginBottom: 18 },
  row:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 },
  submit:    {
    padding: "11px 0", width: "100%", background: BL.ink, color: "#fff",
    border: "none", borderRadius: 6, fontFamily: BL.sans, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  ok:  { fontFamily: BL.sans, color: BL.need.ok.fg, fontSize: 13, marginTop: 14 },
  err: { fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, marginTop: 14 },
};

const EMPTY = { name: "", location: "", date: "", startTime: "", endTime: "", capacity: "", notes: "" };

export default function CreateSlotPanel() {
  const [form, setForm] = useState(EMPTY);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  function field(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function toggleType(t) {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      await createDrive({
        name: form.name,
        location: form.location,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        capacity: parseInt(form.capacity, 10),
        acceptedBloodTypes: selectedTypes.length > 0 ? selectedTypes : BLOOD_TYPES,
        notes: form.notes,
      });
      setResult({ ok: true });
      setForm(EMPTY);
      setSelectedTypes([]);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={s.pageTitle}>Create a donation slot</div>
      <div style={s.pageSub}>Add a new drive. Donors can book it once submitted — approved slots appear in the schedule immediately.</div>

      <form onSubmit={submit}>
        <div style={s.group}>
          <label style={s.label}>Drive name</label>
          <input
            style={s.input}
            placeholder="e.g. SGH · Donation Drive Jun 2026"
            value={form.name}
            onChange={e => field("name", e.target.value)}
            required
          />
        </div>

        <div style={s.group}>
          <label style={s.label}>Location / venue</label>
          <input
            style={s.input}
            placeholder="e.g. SGH, Block 6, Level 1 Atrium"
            value={form.location}
            onChange={e => field("location", e.target.value)}
            required
          />
        </div>

        <div style={s.row}>
          <div>
            <label style={s.label}>Date</label>
            <input
              type="date"
              style={s.input}
              value={form.date}
              onChange={e => field("date", e.target.value)}
              required
            />
          </div>
          <div>
            <label style={s.label}>Capacity (slots)</label>
            <input
              type="number"
              style={s.input}
              placeholder="e.g. 80"
              value={form.capacity}
              onChange={e => field("capacity", e.target.value)}
              min="1"
              required
            />
          </div>
        </div>

        <div style={s.row}>
          <div>
            <label style={s.label}>Start time</label>
            <input
              type="time"
              style={s.input}
              value={form.startTime}
              onChange={e => field("startTime", e.target.value)}
              required
            />
          </div>
          <div>
            <label style={s.label}>End time</label>
            <input
              type="time"
              style={s.input}
              value={form.endTime}
              onChange={e => field("endTime", e.target.value)}
              required
            />
          </div>
        </div>

        <div style={s.group}>
          <label style={s.label}>Accepted blood types</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {BLOOD_TYPES.map(t => {
              const sel = selectedTypes.includes(t);
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => toggleType(t)}
                  style={{
                    padding: "5px 12px", borderRadius: 4, fontFamily: BL.mono, fontSize: 12,
                    cursor: "pointer",
                    background: sel ? BL.ink : BL.fill,
                    color: sel ? "#fff" : BL.ink2,
                    border: `1px solid ${sel ? BL.ink : BL.hair}`,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.faint }}>
            {selectedTypes.length === 0
              ? "No selection = all types accepted"
              : `${selectedTypes.length} type${selectedTypes.length > 1 ? "s" : ""} selected`}
          </div>
        </div>

        <div style={s.group}>
          <label style={s.label}>Notes (optional)</label>
          <textarea
            style={{ ...s.input, minHeight: 72, resize: "vertical" }}
            placeholder="Special instructions, equipment, parking info…"
            value={form.notes}
            onChange={e => field("notes", e.target.value)}
          />
        </div>

        <button type="submit" style={{ ...s.submit, opacity: submitting ? 0.6 : 1 }} disabled={submitting}>
          {submitting ? "Creating…" : "Create slot →"}
        </button>

        {result?.ok && <div style={s.ok}>✓ Slot created — donors can now see and book it.</div>}
        {result?.error && <div style={s.err}>{result.error}</div>}
      </form>
    </div>
  );
}
