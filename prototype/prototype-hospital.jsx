// BloodLine — interactive Hospital portal
// Live capacity + emergency draw request (which lands in HSA's inbox)

function HospDesktop() {
  return (
    <Desk tab="NUH · BloodLine portal" url="hospital.bloodline.gov.sg/nuh">
      <HospShellLive />
    </Desk>
  );
}

function HospShellLive() {
  const { s, set } = useApp();
  const nav = [
    { k: 'capacity', l: 'Live capacity' },
    { k: 'stock',    l: 'Stock levels' },
    { k: 'demand',   l: 'Demand input' },
    { k: 'orders',   l: 'Orders' },
    { k: 'audit',    l: 'Audit log' },
  ];
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: BL.sans, position: 'relative' }}>
      <div style={{ width: 220, background: '#1a1917', color: '#e9e6e0' }}>
        <div style={{ padding: '18px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 3, background: BL.red }} />
            <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600 }}>BloodLine</span>
            <Tag color="#8e8a82" style={{ marginLeft: 'auto' }}>HOSP</Tag>
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: '#8e8a82', marginTop: 4, letterSpacing: 0.8 }}>
            NUH · Blood transfusion services
          </div>
        </div>
        <div style={{ padding: 8 }}>
          {nav.map((n) => (
            <button key={n.k} onClick={() => set({ hospTab: n.k })} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 12px', borderRadius: 4, marginBottom: 2,
              background: s.hospTab === n.k ? '#2a2723' : 'transparent',
              fontFamily: BL.sans, fontSize: 13,
              color: s.hospTab === n.k ? '#fff' : '#bdb8b0',
              borderLeft: s.hospTab === n.k ? `2px solid ${BL.red}` : '2px solid transparent',
              paddingLeft: 12, cursor: 'pointer', border: 'none',
            }}>{n.l}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <div style={{ height: 48, borderBottom: `1px solid ${BL.hair}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Tag color={BL.muted}>NUH · {new Date().toLocaleString('en-SG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Tag>
            <span style={{ color: BL.faint }}>/</span>
            <span style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>
              {nav.find((n) => n.k === s.hospTab)?.l}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10,
              padding: '3px 8px', background: BL.surgeBg, borderRadius: 4, border: `1px solid ${BL.surge}33` }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: BL.surge, animation: 'bl-pulse 2s infinite' }} />
              <Tag color={BL.surge}>LIVE · 24S AGO</Tag>
            </div>
            {s.surgeActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 8px', background: BL.surgeBg, borderRadius: 4, border: `1px solid ${BL.surge}55` }}>
                <Tag color={BL.surge}>HSA · SURGE LIVE</Tag>
              </div>
            )}
          </div>
          <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink }}>Sr. K. Yong · NUH</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {s.hospTab === 'capacity' && <HospCapacity />}
          {s.hospTab === 'stock'    && <HospStock />}
          {s.hospTab === 'demand'   && <HospDemand />}
          {s.hospTab === 'orders'   && <HospOrders />}
          {s.hospTab === 'audit'    && <HospPlaceholder name="Audit log" />}
        </div>

        {s.hospToast && (
          <div style={{
            position: 'absolute', bottom: 24, right: 24,
            padding: '12px 18px', background: BL.ink, color: '#fff', borderRadius: 8,
            fontFamily: BL.sans, fontSize: 13, fontWeight: 500, zIndex: 30,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}>{s.hospToast}</div>
        )}
      </div>
    </div>
  );
}

function HospPlaceholder({ name }) {
  return (
    <div style={{ padding: 60, textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <Tag color={BL.muted}>{name.toUpperCase()}</Tag>
      <div style={{ fontFamily: BL.sans, fontSize: 18, color: BL.faint, marginTop: 6 }}>Module wireframed — not interactive in this prototype.</div>
    </div>
  );
}

// ─── Hospital live capacity ────────────────────────────────────
const HOSP_STOCK = [
  { t: 'O−', units: 14, days: 1.2, need: 'critical' },
  { t: 'O+', units: 86, days: 4.8, need: 'low' },
  { t: 'A−', units: 22, days: 2.4, need: 'urgent' },
  { t: 'A+', units: 124, days: 6.4, need: 'ok' },
  { t: 'B−', units: 18, days: 2.1, need: 'critical' },
  { t: 'B+', units: 78, days: 5.2, need: 'ok' },
  { t: 'AB−', units: 12, days: 3.6, need: 'low' },
  { t: 'AB+', units: 24, days: 7.0, need: 'ok' },
];

function HospCapacity() {
  const { s, set } = useApp();
  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
            Live blood capacity · NUH
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
            In-house stock + inbound donor flow from BloodLine network. Refreshes every 30s.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="soft" size="sm" color={BL.muted}>RBC · Plasma · Platelets ▾</Btn>
          <Btn variant="outline" size="sm" color={BL.surge} onClick={() => set({ hospRequestOpen: true })}>
            + Request emergency draw
          </Btn>
        </div>
      </div>

      <W pad={20} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <H size={14}>In-house RBC stock · units</H>
          <Tag color={BL.muted}>BAR ∝ DAYS OF DEMAND COVERAGE</Tag>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
          {HOSP_STOCK.map((sk) => (
            <div key={sk.t} style={{ textAlign: 'center' }}>
              <BloodChip type={sk.t} need={sk.need} size="lg" />
              <div style={{ fontFamily: BL.mono, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 6, letterSpacing: -0.4 }}>{sk.units}</div>
              <Tag color={BL.muted}>UNITS</Tag>
              <div style={{ marginTop: 6, height: 6, background: BL.hair, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (sk.days / 8) * 100)}%`, height: '100%', background: BL.need[sk.need].fg }} />
              </div>
              <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, marginTop: 4 }}>{sk.days}d</div>
            </div>
          ))}
        </div>
      </W>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <W pad={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <H size={14}>Inbound from BloodLine network — next 12h</H>
            <Tag color={BL.muted}>SCHEDULED · IN PROGRESS · BOOKED</Tag>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: BL.sans, fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BL.hair}`, color: BL.muted, textAlign: 'left' }}>
                {['TIME', 'TYPE', 'UNITS', 'FROM', 'STATUS'].map((h) => (
                  <th key={h} style={{ padding: '8px 6px', fontFamily: BL.mono, fontSize: 10, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['11:00', 'O−', 4, 'Bloodbank@HSA', 'In transit'],
                ['11:30', 'A−', 2, 'Bloodbank@HSA', 'Booked'],
                ['12:15', 'B−', 3, 'Bloodbank@Dhoby Ghaut', 'Booked'],
                ['13:40', 'O−', 5, 'Surge wave 1', 'Projected'],
                ['15:00', 'O+', 8, 'Bloodbank@Westgate', 'Projected'],
              ].map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BL.hair}` }}>
                  {r.map((cell, j) => (
                    <td key={j} style={{ padding: '10px 6px', color: j === 0 ? BL.ink : BL.ink2,
                      fontFamily: j === 0 || j === 2 ? BL.mono : BL.sans }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </W>

        <W pad={16}>
          <H size={14}>Today's procedures</H>
          <Tag color={BL.muted}>SCHEDULED CASES · BLOOD ORDER</Tag>
          <div style={{ marginTop: 10 }}>
            {[
              { c: 'Cardiac · CABG ×2', t: '4 O− · 6 plasma', sla: 'Live' },
              { c: 'Trauma · MCI standby', t: '8 O− · 4 platelets', sla: 'Standby' },
              { c: 'Oncology · BMT prep', t: '2 A+ · 2 plasma', sla: 'Tomorrow' },
              { c: 'OB · postpartum reserve', t: '2 O+', sla: 'On call' },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '8px 0', borderTop: i ? `1px solid ${BL.hair}` : 'none' }}>
                <div>
                  <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>{p.c}</div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>{p.t}</div>
                </div>
                <Tag color={p.sla === 'Live' ? BL.surge : BL.muted}>{p.sla.toUpperCase()}</Tag>
              </div>
            ))}
          </div>
        </W>
      </div>

      <EmergencyRequestModal />
    </div>
  );
}

// ─── Emergency draw request modal ──────────────────────────────
function EmergencyRequestModal() {
  const { s, set } = useApp();
  const [type, setType] = useState('O−');
  const [units, setUnits] = useState(8);
  const [reason, setReason] = useState('AYE MCI · 12+ casualties');

  if (!s.hospRequestOpen) return null;

  const submit = () => {
    const req = {
      hospital: 'NUH',
      type, units, reason,
      time: new Date().toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' }),
    };
    set((cur) => ({
      hospRequestOpen: false,
      hospOrders: [{ ...req, id: 'ER-' + (5400 + cur.hospOrders.length), status: 'pending' }, ...cur.hospOrders],
      hsaInbox: [req, ...cur.hsaInbox],
      hospToast: 'Emergency request sent to HSA',
    }));
  };

  return (
    <Modal open={true} onClose={() => set({ hospRequestOpen: false })} w={520}>
      <Tag color={BL.surge}>EMERGENCY DRAW REQUEST · BREAK GLASS</Tag>
      <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 6, letterSpacing: -0.3 }}>
        Request an emergency draw
      </div>
      <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6, lineHeight: 1.55 }}>
        This will alert HSA Operations and may trigger Surge Mode if the request exceeds the response threshold.
      </div>

      <div style={{ marginTop: 16 }}>
        <Tag color={BL.muted}>BLOOD TYPE</Tag>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {BLOOD_TYPES.map(({ t, n }) => (
            <button key={t} onClick={() => setType(t)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <BloodChip type={t} need={n} size="md" selected={type === t} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Tag color={BL.muted}>UNITS REQUIRED</Tag>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <input type="range" min="1" max="40" value={units} onChange={(e) => setUnits(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: BL.surge }} />
          <span style={{ fontFamily: BL.mono, fontSize: 22, fontWeight: 600, color: BL.ink, minWidth: 50, textAlign: 'right' }}>{units}</span>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Tag color={BL.muted}>REASON · CLINICAL CONTEXT</Tag>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          style={{
            width: '100%', marginTop: 6, padding: 10, fontFamily: BL.sans, fontSize: 13,
            border: `1px solid ${BL.hair}`, borderRadius: 6, resize: 'none', color: BL.ink,
            background: BL.paper, boxSizing: 'border-box',
          }} />
      </div>

      <div style={{ marginTop: 16, padding: 12, background: BL.surgeBg, border: `1px solid ${BL.surge}33`, borderRadius: 6 }}>
        <Tag color={BL.surge}>WHAT HAPPENS NEXT</Tag>
        <ul style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink2, marginTop: 6, paddingLeft: 18, lineHeight: 1.65 }}>
          <li>HSA Operations is paged within 30 seconds</li>
          <li>{units} units of {type} dispatched from nearest reserve (~14 min)</li>
          <li>If shortfall &gt; 4 units, Surge Mode is pre-staged for sign-off</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <Btn variant="soft" color={BL.muted} onClick={() => set({ hospRequestOpen: false })}>Cancel</Btn>
        <Btn full size="lg" style={{ background: BL.surge, color: '#fff', border: 'none' }} onClick={submit}>
          Send to HSA →
        </Btn>
      </div>
    </Modal>
  );
}

// ─── Stock levels view ────────────────────────────────────────
function HospStock() {
  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>Stock levels — 7-day trend</div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
          Daily in-house counts and burn rate by product.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {HOSP_STOCK.map((sk) => (
          <W key={sk.t} pad={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Tag color={BL.muted}>{sk.t} · RBC</Tag>
                <div style={{ fontFamily: BL.mono, fontSize: 26, fontWeight: 600, color: BL.ink, marginTop: 4, letterSpacing: -0.6 }}>{sk.units}</div>
              </div>
              <Tag color={BL.need[sk.need].fg} bg={BL.need[sk.need].bg}>{BL.need[sk.need].label}</Tag>
            </div>
            <div style={{ marginTop: 10 }}>
              <Spark w={220} h={40}
                points={[sk.units * 1.4, sk.units * 1.3, sk.units * 1.2, sk.units * 1.1, sk.units * 1.05, sk.units, sk.units * 0.95]}
                color={BL.need[sk.need].fg} />
            </div>
            <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 6 }}>{sk.days} days coverage</div>
          </W>
        ))}
      </div>
    </div>
  );
}

// ─── Demand input ─────────────────────────────────────────────
function HospDemand() {
  const { set } = useApp();
  const [proc, setProc] = useState({
    cardiac: 4, oncology: 2, trauma: 1, ob: 1, elective: 6,
  });

  const total = Object.values(proc).reduce((a, b) => a + b, 0);
  const units = total * 2.1;

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>Procedure demand input</div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
          Forecast next-week blood demand by procedure category. HSA uses this to plan donor sends.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }}>
        <W pad={20}>
          <Tag color={BL.muted}>SCHEDULED PROCEDURES · NEXT 7 DAYS</Tag>
          <div style={{ marginTop: 14 }}>
            {[
              ['cardiac',  'Cardiac surgery',    '~3.4 units / case', 'red'],
              ['oncology', 'Oncology / BMT',     '~2.8 units / case', 'red'],
              ['trauma',   'Trauma standby',     '~6 units / activation', 'surge'],
              ['ob',       'OB postpartum',      '~1.2 units / case', 'red'],
              ['elective', 'Elective ortho',     '~1.5 units / case', 'muted'],
            ].map(([k, l, hint, color]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0',
                borderTop: k === 'cardiac' ? 'none' : `1px solid ${BL.hair}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>{l}</div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>{hint}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setProc((p) => ({ ...p, [k]: Math.max(0, p[k] - 1) }))}
                    style={{ width: 28, height: 28, borderRadius: 4, background: BL.fill,
                      border: `1px solid ${BL.hair}`, fontFamily: BL.sans, fontSize: 16, color: BL.ink, cursor: 'pointer' }}>−</button>
                  <span style={{ fontFamily: BL.mono, fontSize: 18, color: BL.ink, fontWeight: 600, minWidth: 28, textAlign: 'center' }}>
                    {proc[k]}
                  </span>
                  <button onClick={() => setProc((p) => ({ ...p, [k]: p[k] + 1 }))}
                    style={{ width: 28, height: 28, borderRadius: 4, background: BL.fill,
                      border: `1px solid ${BL.hair}`, fontFamily: BL.sans, fontSize: 16, color: BL.ink, cursor: 'pointer' }}>+</button>
                </div>
              </div>
            ))}
          </div>
        </W>

        <div>
          <W pad={20} style={{ marginBottom: 14 }}>
            <Tag color={BL.muted}>FORECASTED BLOOD ORDER · 7D</Tag>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: BL.mono, fontSize: 38, color: BL.ink, fontWeight: 600, letterSpacing: -0.6 }}>{units.toFixed(0)}</span>
                <Tag color={BL.muted}>UNITS · ALL TYPES</Tag>
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 8, lineHeight: 1.5 }}>
                Based on {total} scheduled procedures × avg consumption ratio.
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Tag color={BL.muted}>BY TYPE · ESTIMATED MIX</Tag>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                {[['O−', 0.18], ['O+', 0.32], ['A+', 0.24], ['B+', 0.14]].map(([t, p]) => (
                  <W pad={8} key={t} style={{ textAlign: 'center' }}>
                    <Tag color={BL.muted}>{t}</Tag>
                    <div style={{ fontFamily: BL.mono, fontSize: 16, color: BL.ink, fontWeight: 600, marginTop: 2 }}>
                      {Math.round(units * p)}
                    </div>
                  </W>
                ))}
              </div>
            </div>
          </W>

          <Btn full size="lg" color={BL.ink}
            onClick={() => set({ hospToast: 'Demand forecast submitted to HSA' })}>
            Submit to HSA →
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Orders log ────────────────────────────────────────────────
function HospOrders() {
  const { s } = useApp();
  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>Orders</div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
          Standing and emergency draws from HSA reserves and the BloodLine donor network.
        </div>
      </div>

      <W pad={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: BL.sans, fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BL.hair}`, color: BL.muted, textAlign: 'left', background: BL.fill }}>
              {['ORDER ID', 'TYPE', 'KIND', 'UNITS', 'REASON', 'STATUS'].map((h) => (
                <th key={h} style={{ padding: '12px 14px', fontFamily: BL.mono, fontSize: 10, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.hospOrders.map((o, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BL.hair}`, background: i === 0 ? BL.surgeBg : 'transparent' }}>
                <td style={{ padding: '12px 14px', fontFamily: BL.mono, color: BL.ink, fontWeight: 600 }}>#{o.id}</td>
                <td style={{ padding: '12px 14px' }}><BloodChip type={o.type} need="critical" size="sm" /></td>
                <td style={{ padding: '12px 14px', color: BL.surge, fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.6 }}>EMERGENCY DRAW</td>
                <td style={{ padding: '12px 14px', fontFamily: BL.mono, color: BL.ink, fontWeight: 600 }}>{o.units}</td>
                <td style={{ padding: '12px 14px', color: BL.ink2 }}>{o.reason}</td>
                <td style={{ padding: '12px 14px' }}>
                  <Tag color={BL.surge} bg={BL.surgeBg}>PENDING HSA</Tag>
                </td>
              </tr>
            ))}
            {/* Static orders */}
            {[
              { id: '5340', t: 'O+', units: 12, kind: 'Standing weekly', reason: 'Routine top-up', status: 'Fulfilled' },
              { id: '5341', t: 'A−', units: 4,  kind: 'Scheduled',       reason: 'Cardiac · CABG ×2', status: 'In transit' },
              { id: '5342', t: 'B−', units: 3,  kind: 'Scheduled',       reason: 'Oncology · BMT prep', status: 'Booked' },
              { id: '5343', t: 'AB−', units: 1, kind: 'Standing weekly', reason: 'Rare-type reserve', status: 'Fulfilled' },
            ].map((o) => (
              <tr key={o.id} style={{ borderBottom: `1px solid ${BL.hair}` }}>
                <td style={{ padding: '12px 14px', fontFamily: BL.mono, color: BL.ink2 }}>#{o.id}</td>
                <td style={{ padding: '12px 14px' }}>
                  <BloodChip type={o.t} need={BLOOD_TYPES.find((x) => x.t === o.t)?.n || 'ok'} size="sm" />
                </td>
                <td style={{ padding: '12px 14px', color: BL.muted, fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.6 }}>{o.kind.toUpperCase()}</td>
                <td style={{ padding: '12px 14px', fontFamily: BL.mono, color: BL.ink2 }}>{o.units}</td>
                <td style={{ padding: '12px 14px', color: BL.ink2 }}>{o.reason}</td>
                <td style={{ padding: '12px 14px' }}>
                  <Tag color={o.status === 'Fulfilled' ? BL.need.ok.fg : BL.muted}
                    bg={o.status === 'Fulfilled' ? BL.need.ok.bg : BL.fill}>{o.status.toUpperCase()}</Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </W>
    </div>
  );
}

Object.assign(window, { HospDesktop, HospCapacity, HospStock, HospDemand, HospOrders });
