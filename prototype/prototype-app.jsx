// BloodLine — interactive prototype shell
// Global state, surface switcher, tweaks panel.

const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

// ─── Global app state ────────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

const initialState = {
  // Global mode
  surface: 'donor',                 // 'donor' | 'hsa' | 'hospital'
  surgeActive: false,
  surgeActivatedAt: null,
  surgeSnoozed: false,

  // Donor
  donorTab: 'home',                 // 'home' | 'drives' | 'impact' | 'profile'
  donorScreen: null,                // null = use tab; else 'booking' | 'booking-success' | 'mobilise' | 'mobilise-tracker' | 'drive-detail' | 'type-detail'
  homeVariant: 'A',                 // 'A' = hero card, 'B' = timeline
  selectedSlot: null,               // {venue, time, dist}
  bookedSlot: null,                 // confirmed booking
  toast: null,
  driveRsvps: {},                   // { driveId: 'going' | 'maybe' | 'declined' }
  notif: { surgeOwn: 'Always', surgeCompat: 'Within 5 km', drives: 'On', weekly: 'Sundays', cap: 'On' },
  selectedType: null,

  // Mobilise sub-flow
  mobStep: 1,                       // 1..4
  mobOrg: 'DBS · Group Tech',
  mobTime: { d: 'Tomorrow', t: 'Lunch · 11:30–14:00', cap: 'Mobile unit on-site' },

  // HSA
  hsaTab: 'forecast',               // 'forecast' | 'surge' | 'donors' | 'drives' | 'hospitals' | 'reports'
  hsaForecastView: 'map',           // 'map' | 'heatmap'
  surgeConfig: { types: ['O−'], tiers: [true, true, false], channels: { push: true, sms: true, whatsapp: false, email: false } },
  surgeConfirmOpen: false,
  hsaInbox: [],                     // hospital emergency requests
  hsaToast: null,

  // Hospital
  hospTab: 'capacity',              // 'capacity' | 'stock' | 'demand' | 'orders'
  hospCapacityView: 'stock',        // 'stock' | 'arrival'
  hospRequestOpen: false,
  hospOrders: [],                   // emergency requests created
  hospToast: null,
};

function AppProvider({ children }) {
  const [s, setS] = useState(initialState);
  const set = (patch) => setS((cur) => ({ ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) }));

  // Auto-clear toasts
  useEffect(() => {
    if (!s.toast) return;
    const id = setTimeout(() => set({ toast: null }), 2400);
    return () => clearTimeout(id);
  }, [s.toast]);
  useEffect(() => {
    if (!s.hsaToast) return;
    const id = setTimeout(() => set({ hsaToast: null }), 2400);
    return () => clearTimeout(id);
  }, [s.hsaToast]);
  useEffect(() => {
    if (!s.hospToast) return;
    const id = setTimeout(() => set({ hospToast: null }), 2400);
    return () => clearTimeout(id);
  }, [s.hospToast]);

  // When surge activates, force donor to home so user sees the surge alert
  // (and clear any modal screen state)
  useEffect(() => {
    if (s.surgeActive) {
      set({ donorTab: 'home', donorScreen: null, surgeSnoozed: false });
    }
  }, [s.surgeActive]);

  return <AppCtx.Provider value={{ s, set }}>{children}</AppCtx.Provider>;
}

// ─── Surface switcher (top of viewport) ──────────────────────────
function SurfaceSwitch() {
  const { s, set } = useApp();
  const items = [
    { k: 'donor',    l: 'Donor app',    sub: 'mobile' },
    { k: 'hsa',      l: 'HSA console',  sub: 'desktop' },
    { k: 'hospital', l: 'Hospital portal', sub: 'desktop' },
  ];
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 4, background: '#fff',
      border: `1px solid ${BL.hair}`, borderRadius: 999, padding: 4,
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)', zIndex: 50,
    }}>
      {items.map((i) => {
        const active = s.surface === i.k;
        return (
          <button key={i.k}
            onClick={() => set({ surface: i.k })}
            style={{
              border: 'none', background: active ? BL.ink : 'transparent', color: active ? '#fff' : BL.ink,
              padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
              fontFamily: BL.sans, fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
            <span>{i.l}</span>
            <span style={{ fontFamily: BL.mono, fontSize: 9, opacity: 0.6, letterSpacing: 0.6 }}>{i.sub.toUpperCase()}</span>
          </button>
        );
      })}
      {/* Surge indicator pill */}
      {s.surgeActive && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', marginLeft: 4, borderLeft: `1px solid ${BL.hair}`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: BL.surge, animation: 'bl-pulse 2s infinite' }} />
          <Tag color={BL.surge}>SURGE LIVE</Tag>
        </div>
      )}
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────
function Toast({ msg, surface }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 76, left: '50%', transform: 'translateX(-50%)',
      padding: '10px 16px', background: BL.ink, color: '#fff', borderRadius: 8,
      fontFamily: BL.sans, fontSize: 12, fontWeight: 500, zIndex: 30,
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
      maxWidth: 320, textAlign: 'center',
    }}>{msg}</div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────
function Modal({ open, onClose, children, w = 480 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(20,18,15,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      animation: 'bl-fade 0.18s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: w, maxHeight: '80%', overflow: 'auto', background: '#fff',
        borderRadius: 10, padding: 20, fontFamily: BL.sans,
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
      }}>{children}</div>
    </div>
  );
}

// ─── Sheet (mobile bottom sheet) ─────────────────────────────────
function Sheet({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(20,18,15,0.4)',
      zIndex: 50, display: 'flex', alignItems: 'flex-end',
      animation: 'bl-fade 0.18s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', background: '#fff', borderRadius: '14px 14px 0 0',
        padding: 16, maxHeight: '85%', overflowY: 'auto',
        animation: 'bl-slideup 0.22s cubic-bezier(0.2, 0.7, 0.2, 1)',
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 2, background: BL.hair,
          margin: '0 auto 14px',
        }} />
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { AppCtx, AppProvider, useApp, SurfaceSwitch, Toast, Modal, Sheet });
