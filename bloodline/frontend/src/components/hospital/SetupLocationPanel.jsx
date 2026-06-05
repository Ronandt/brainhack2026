import { useState, useRef } from "react";
import { updateHospitalProfile } from "../../api";
import { BL } from "../../tokens";

const ACCENT = "#2563a8";

async function searchOneMap(query) {
  const url =
    `https://www.onemap.gov.sg/api/common/elastic/search` +
    `?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OneMap search failed");
  const data = await res.json();
  return (data.results || [])
    .filter(r => r.LATITUDE && r.LONGITUDE)
    .map(r => ({
      name: r.BUILDING && r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS,
      address: r.ADDRESS,
      lat: Number.parseFloat(r.LATITUDE),
      lng: Number.parseFloat(r.LONGITUDE),
    }))
    .slice(0, 8);
}

export default function SetupLocationPanel({ onComplete }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const timer = useRef(null);

  function handleQuery(val) {
    setQuery(val);
    setSelected(null);
    if (timer.current) clearTimeout(timer.current);
    if (!val.trim()) { setResults([]); return; }
    timer.current = setTimeout(() => {
      setLoading(true);
      searchOneMap(val)
        .then(hits => setResults(hits))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
  }

  async function submit(e) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await updateHospitalProfile({ location: selected.name, lat: selected.lat, lng: selected.lng });
      onComplete(selected.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const showList = query.trim().length > 0;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: 40 }}>
      <div style={{
        background: BL.card, border: `1px solid ${BL.hair}`,
        borderRadius: 8, padding: 36, maxWidth: 480, width: "100%",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <div style={{ width: 18, height: 18, borderRadius: 3, background: ACCENT, flexShrink: 0 }} />
          <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink }}>BloodLine</span>
        </div>

        <div style={{ fontFamily: BL.sans, fontSize: 20, fontWeight: 600, color: BL.ink, letterSpacing: -0.3, marginBottom: 6 }}>
          Select your hospital
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginBottom: 24, lineHeight: 1.5 }}>
          Your location is fixed to your account and stamped on every donation drive you create.
        </div>

        <form onSubmit={submit}>
          {/* Search box */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              style={{
                width: "100%", padding: "9px 12px", border: `1px solid ${BL.hair}`,
                borderRadius: 6, fontFamily: BL.sans, fontSize: 14, color: BL.ink,
                background: BL.paper, boxSizing: "border-box", outline: "none",
              }}
              placeholder="Search by hospital name or address…"
              value={query}
              onChange={e => handleQuery(e.target.value)}
              autoFocus
            />
            {loading && (
              <span style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                fontFamily: BL.mono, fontSize: 10, color: BL.muted,
              }}>
                searching…
              </span>
            )}
          </div>

          {/* Results list */}
          {showList && (
            <div style={{
              maxHeight: 240, overflowY: "auto",
              border: `1px solid ${BL.hair}`, borderRadius: 6, marginBottom: 20,
            }}>
              {!loading && results.length === 0 && (
                <div style={{ padding: "12px 14px", fontFamily: BL.sans, fontSize: 13, color: BL.faint }}>
                  No results — try a different name or postcode.
                </div>
              )}
              {results.map((h, i) => {
                const sel = selected?.name === h.name && selected?.lat === h.lat;
                return (
                  <button
                    key={`${h.name}-${i}`}
                    type="button"
                    onClick={() => setSelected(h)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "10px 14px", border: "none", cursor: "pointer",
                      borderLeft: `3px solid ${sel ? ACCENT : "transparent"}`,
                      borderBottom: i < results.length - 1 ? `1px solid ${BL.hair}` : "none",
                      background: sel ? `${ACCENT}12` : "transparent",
                    }}
                  >
                    <div style={{
                      fontFamily: BL.sans, fontSize: 13,
                      fontWeight: sel ? 600 : 400,
                      color: sel ? ACCENT : BL.ink,
                    }}>
                      {h.name}
                    </div>
                    <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.faint, marginTop: 2 }}>
                      {h.lat.toFixed(4)}° N · {h.lng.toFixed(4)}° E
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected confirmation badge */}
          {selected && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: `${ACCENT}10`, border: `1px solid ${ACCENT}40`,
              borderRadius: 6, padding: "10px 14px", marginBottom: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: BL.sans, fontSize: 13, fontWeight: 600, color: ACCENT }}>
                  {selected.name}
                </div>
                <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>
                  {selected.lat.toFixed(4)}° N · {selected.lng.toFixed(4)}° E
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelected(null); setQuery(""); setResults([]); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: BL.muted, fontSize: 16 }}
              >
                ×
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={!selected || saving}
            style={{
              width: "100%", padding: "11px 0",
              background: selected ? ACCENT : BL.fill,
              color: selected ? "#fff" : BL.muted,
              border: "none", borderRadius: 6,
              fontFamily: BL.sans, fontSize: 14, fontWeight: 600,
              cursor: selected ? "pointer" : "default",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {(() => {
              if (saving) return "Saving…";
              return selected ? "Confirm location →" : "Search and select your hospital";
            })()}
          </button>

          {error && (
            <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
