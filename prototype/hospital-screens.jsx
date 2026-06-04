// BloodLine — Hospital portal (desktop, tactical)

function HospShell({ children, active = 'capacity', hosp = 'NUH · Blood transfusion services', user = 'Sr. K. Yong · NUH' }) {
  const nav = [
    { k: 'capacity',  l: 'Live capacity' },
    { k: 'stock',     l: 'Stock levels' },
    { k: 'demand',    l: 'Demand input' },
    { k: 'orders',    l: 'Orders' },
    { k: 'audit',     l: 'Audit log' },
  ];
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: BL.sans }}>
      <div style={{ width: 220, background: '#1a1917', color: '#e9e6e0' }}>
        <div style={{ padding: '18px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 3, background: BL.red }} />
            <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600 }}>BloodLine</span>
            <Tag color="#8e8a82" style={{ marginLeft: 'auto' }}>HOSP</Tag>
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: '#8e8a82', marginTop: 4, letterSpacing: 0.8 }}>{hosp}</div>
        </div>
        <div style={{ padding: 8 }}>
          {nav.map(n => (
            <div key={n.k} style={{
              padding: '8px 12px', borderRadius: 4, marginBottom: 2,
              background: active === n.k ? '#2a2723' : 'transparent',
              fontFamily: BL.sans, fontSize: 13,
              color: active === n.k ? '#fff' : '#bdb8b0',
              borderLeft: active === n.k ? `2px solid ${BL.red}` : '2px solid transparent',
              paddingLeft: 12,
            }}>{n.l}</div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: 48, borderBottom: `1px solid ${BL.hair}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Tag color={BL.muted}>NUH · {new Date().toLocaleString('en-SG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Tag>
            <span style={{ color: BL.faint }}>/</span>
            <span style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>
              {nav.find(n => n.k === active)?.l}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10,
              padding: '3px 8px', background: BL.surgeBg, borderRadius: 4, border: `1px solid ${BL.surge}33` }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: BL.surge, animation: 'bl-pulse 2s infinite' }} />
              <Tag color={BL.surge}>LIVE · 24S AGO</Tag>
            </div>
          </div>
          <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink }}>{user}</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── LIVE CAPACITY A · stock-led ────────────────────────────────
function HospCapacityA() {
  return (
    <Desk tab="NUH · BloodLine portal" url="hospital.bloodline.gov.sg/nuh">
      <HospShell active="capacity">
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
              <Btn variant="outline" size="sm" color={BL.red}>+ Request emergency draw</Btn>
            </div>
          </div>

          {/* Stock matrix */}
          <W pad={20} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <H size={14}>In-house RBC stock · units</H>
              <Tag color={BL.muted}>BAR ∝ DAYS OF DEMAND COVERAGE</Tag>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
              {[
                { t: 'O−', units: 14, days: 1.2, need: 'critical' },
                { t: 'O+', units: 86, days: 4.8, need: 'low' },
                { t: 'A−', units: 22, days: 2.4, need: 'urgent' },
                { t: 'A+', units: 124, days: 6.4, need: 'ok' },
                { t: 'B−', units: 18, days: 2.1, need: 'critical' },
                { t: 'B+', units: 78, days: 5.2, need: 'ok' },
                { t: 'AB−', units: 12, days: 3.6, need: 'low' },
                { t: 'AB+', units: 24, days: 7.0, need: 'ok' },
              ].map((s, i) => (
                <div key={s.t} style={{ textAlign: 'center' }}>
                  <BloodChip type={s.t} need={s.need} size="lg" />
                  <div style={{ fontFamily: BL.mono, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 6, letterSpacing: -0.4 }}>{s.units}</div>
                  <Tag color={BL.muted}>UNITS</Tag>
                  <div style={{ marginTop: 6, height: 6, background: BL.hair, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (s.days / 7) * 100)}%`, height: '100%', background: BL.need[s.need].fg }} />
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 4 }}>{s.days.toFixed(1)}d</div>
                </div>
              ))}
            </div>
          </W>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }}>
            {/* Inbound donors */}
            <W pad={16}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <H size={14}>Inbound donors · next 24h</H>
                <Tag color={BL.muted}>FROM BLOODLINE NETWORK · ALL NUH-FED BANKS</Tag>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: BL.mono, fontSize: 32, fontWeight: 600, color: BL.ink, letterSpacing: -0.6 }}>148</div>
                  <Tag color={BL.muted}>BOOKED · ALL TYPES</Tag>
                </div>
                <div>
                  <div style={{ fontFamily: BL.mono, fontSize: 32, fontWeight: 600, color: BL.red, letterSpacing: -0.6 }}>18</div>
                  <Tag color={BL.muted}>O− BOOKED</Tag>
                </div>
                <div>
                  <div style={{ fontFamily: BL.mono, fontSize: 32, fontWeight: 600, color: BL.need.ok.fg, letterSpacing: -0.6 }}>+22%</div>
                  <Tag color={BL.muted}>VS YESTERDAY</Tag>
                </div>
              </div>
              <Tag color={BL.muted}>HOURLY ARRIVALS · 24H</Tag>
              <Bars data={[2,3,5,8,12,15,11,9,6,4,3,2,1,2,4,7,11,13,10,8,6,5,4,3]} w={520} h={70} color={BL.ink} />
            </W>

            {/* Demand 24h */}
            <W pad={16}>
              <H size={14}>Scheduled demand · next 24h</H>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: BL.sans, fontSize: 12, marginTop: 8 }}>
                <thead>
                  <tr style={{ color: BL.muted }}>
                    {['PROCEDURE','TYPE','UNITS','WHEN'].map(h => (
                      <th key={h} style={{ padding: '6px 4px', textAlign: 'left', fontFamily: BL.mono, fontSize: 10, fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Cardiac CABG · OR 4', 'O−', 6, 'today 14:00'],
                    ['Liver transplant · OR 2', 'A+', 12, 'today 17:30'],
                    ['Trauma — AYE pile-up', 'O− / O+', 18, 'standing'],
                    ['Oncology · Ward 52', 'mixed', 22, 'rolling'],
                    ['Paeds NICU', 'O−', 3, 'tomorrow 06:00'],
                    ['Renal transplant · OR 6', 'B+', 6, 'tomorrow 09:00'],
                  ].map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${BL.hair}` }}>
                      {r.map((c, j) => (
                        <td key={j} style={{ padding: '8px 4px',
                          color: j === 0 ? BL.ink : BL.ink2,
                          fontFamily: j === 2 ? BL.mono : BL.sans,
                          fontWeight: j === 0 ? 500 : 400 }}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </W>
          </div>

          {/* Risk strip */}
          <div style={{ marginTop: 14, padding: 14, borderRadius: 6, background: BL.surgeBg, border: `1px solid ${BL.surge}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: BL.surge }} />
              <div>
                <Tag color={BL.surge}>HSA · NATIONAL SURGE ACTIVE</Tag>
                <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, marginTop: 2 }}>
                  O− surge active — projected +18 inbound to your feeder banks by tonight.
                </div>
              </div>
            </div>
            <Btn variant="outline" size="sm" color={BL.surge}>Open surge dashboard</Btn>
          </div>
        </div>
      </HospShell>
    </Desk>
  );
}

// ─── LIVE CAPACITY B · arrival-floor view ────────────────────────
function HospCapacityB() {
  return (
    <Desk tab="NUH · BloodLine portal" url="hospital.bloodline.gov.sg/nuh">
      <HospShell active="capacity">
        <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
                Arrival floor · live
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
                Donors checked-in or en route to NUH-fed blood banks. Streaming from BloodLine app.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            {[
              { l: 'EN ROUTE', v: 32, sub: 'ETA < 30 min', tone: BL.ink },
              { l: 'ARRIVED · IN CHAIR', v: 14, sub: '4 are O−', tone: BL.red },
              { l: 'NO-SHOW · 60-MIN WINDOW', v: 6, sub: 'auto-rebooked', tone: BL.need.urgent.fg },
            ].map((k, i) => (
              <W key={i} pad={16}>
                <Tag color={BL.muted}>{k.l}</Tag>
                <div style={{ fontFamily: BL.mono, fontSize: 32, fontWeight: 600, color: k.tone, marginTop: 6, letterSpacing: -0.8 }}>{k.v}</div>
                <Tag color={BL.muted}>{k.sub}</Tag>
              </W>
            ))}
          </div>

          {/* Live donor list */}
          <W pad={0}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BL.hair}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <H size={14} mb={0}>Donor stream · Bloodbank@HSA · last 60 min</H>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="soft" size="sm" color={BL.muted}>All status ▾</Btn>
                <Btn variant="soft" size="sm" color={BL.muted}>All types ▾</Btn>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: BL.sans, fontSize: 12 }}>
              <thead>
                <tr style={{ color: BL.muted, background: BL.fill, textAlign: 'left' }}>
                  {['DONOR ID','TYPE','STATUS','SLOT','SOURCE','ETA / STARTED','UNITS','ACTION'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', fontFamily: BL.mono, fontSize: 10, fontWeight: 500, borderBottom: `1px solid ${BL.hair}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['SG-44182', 'O−', 'in chair', '11:20', 'surge alert',  '11:24 (4 min)', '1 / 1', 'donating'],
                  ['SG-12907', 'O−', 'arrived',  '11:30', 'surge alert',  '11:32',         '—',     'screen'],
                  ['SG-88012', 'B−', 'arrived',  '11:30', 'drive · DBS',  '11:35',         '—',     'screen'],
                  ['SG-66428', 'O+', 'en route', '11:40', 'home banner',  'ETA 7 min',     '—',     'flag'],
                  ['SG-31022', 'A−', 'en route', '11:45', 'surge alert',  'ETA 9 min',     '—',     '—'],
                  ['SG-77104', 'O−', 'no show',  '10:30', 'surge alert',  '+60 min',       '—',     'rebook'],
                  ['SG-50918', 'A+', 'en route', '11:50', 'drive · NUS',  'ETA 14 min',    '—',     '—'],
                  ['SG-22315', 'AB−','en route', '12:00', 'home banner',  'ETA 22 min',    '—',     '—'],
                ].map((r, i) => {
                  const statusColor = {
                    'in chair': BL.need.ok.fg,
                    'arrived':  BL.ink,
                    'en route': BL.muted,
                    'no show':  BL.redInk,
                  }[r[2]];
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${BL.hair}` }}>
                      <td style={{ padding: '10px 12px', fontFamily: BL.mono, color: BL.ink }}>{r[0]}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <BloodChip type={r[1]} need={BLOOD_TYPES.find(b => b.t === r[1])?.n || 'ok'} size="sm" />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontFamily: BL.mono, fontSize: 10, color: statusColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                          {r[2]}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: BL.mono, color: BL.ink2 }}>{r[3]}</td>
                      <td style={{ padding: '10px 12px', color: BL.muted }}>{r[4]}</td>
                      <td style={{ padding: '10px 12px', fontFamily: BL.mono, color: BL.ink2 }}>{r[5]}</td>
                      <td style={{ padding: '10px 12px', fontFamily: BL.mono, color: BL.ink }}>{r[6]}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {r[7] === '—' ? <span style={{ color: BL.faint }}>—</span> :
                          <Btn variant="ghost" size="sm" color={BL.ink} style={{ padding: '0 6px', height: 22, fontSize: 11 }}>{r[7]} →</Btn>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </W>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <W pad={16}>
              <H size={14}>By blood type · in chair + en route</H>
              <div style={{ marginTop: 10 }}>
                {[
                  { t: 'O−', v: 11, max: 18, need: 'critical' },
                  { t: 'O+', v: 8,  max: 18, need: 'low' },
                  { t: 'A−', v: 4,  max: 18, need: 'urgent' },
                  { t: 'A+', v: 9,  max: 18, need: 'ok' },
                  { t: 'B−', v: 6,  max: 18, need: 'critical' },
                  { t: 'B+', v: 5,  max: 18, need: 'ok' },
                ].map(r => (
                  <div key={r.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                    <BloodChip type={r.t} need={r.need} size="sm" />
                    <div style={{ flex: 1, height: 8, background: BL.hair, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(r.v / r.max) * 100}%`, height: '100%', background: BL.need[r.need].fg }} />
                    </div>
                    <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, width: 36, textAlign: 'right' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </W>

            <W pad={16}>
              <H size={14}>Source · last 24h</H>
              <div style={{ marginTop: 12 }}>
                {[
                  ['Surge alert', 64, BL.surge],
                  ['Home banner', 38, BL.ink],
                  ['Workplace drives', 22, BL.muted],
                  ['Walk-in', 14, BL.faint],
                  ['HSA SMS (legacy)', 10, BL.faint],
                ].map(([l, v, c], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <span style={{ flex: '0 0 140px', fontFamily: BL.sans, fontSize: 12, color: BL.ink2 }}>{l}</span>
                    <div style={{ flex: 1, height: 8, background: BL.hair, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(v / 64) * 100}%`, height: '100%', background: c }} />
                    </div>
                    <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, width: 30, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </W>
          </div>
        </div>
      </HospShell>
    </Desk>
  );
}

// ─── PROCEDURE DEMAND INPUT ──────────────────────────────────────
function HospDemand() {
  return (
    <Desk tab="NUH · BloodLine portal" url="hospital.bloodline.gov.sg/nuh/demand">
      <HospShell active="demand">
        <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
                Upcoming procedure demand
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
                Log scheduled major procedures that draw on national supply. Feeds the HSA 14-day forecast.
              </div>
            </div>
            <Btn variant="outline" size="sm" color={BL.ink}>Import from OR scheduler</Btn>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 14 }}>
            {/* Form */}
            <W pad={20}>
              <Tag color={BL.muted}>NEW PROCEDURE</Tag>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                {[
                  { l: 'Procedure', v: 'Liver transplant', mono: false },
                  { l: 'Department', v: 'HPB Surgery · OR 2', mono: false },
                  { l: 'Date', v: '23 May 2026', mono: true },
                  { l: 'Time', v: '17:30', mono: true },
                  { l: 'Patient blood type', v: 'A+', mono: true },
                  { l: 'Crossmatch ready', v: 'Yes', mono: true },
                ].map((f, i) => (
                  <div key={i}>
                    <Tag color={BL.muted}>{f.l.toUpperCase()}</Tag>
                    <div style={{
                      marginTop: 4, padding: '8px 10px', background: BL.paper,
                      border: `1px solid ${BL.hair}`, borderRadius: 4,
                      fontFamily: f.mono ? BL.mono : BL.sans, fontSize: 13, color: BL.ink,
                    }}>{f.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18 }}>
                <Tag color={BL.muted}>EXPECTED UNITS BY COMPONENT</Tag>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 6 }}>
                  {[
                    { l: 'RBC', v: 12, max: 20 },
                    { l: 'FFP', v: 8, max: 16 },
                    { l: 'Platelets', v: 4, max: 8 },
                  ].map(c => (
                    <div key={c.l} style={{ padding: 12, border: `1px solid ${BL.hair}`, borderRadius: 4 }}>
                      <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink2 }}>{c.l}</div>
                      <div style={{ fontFamily: BL.mono, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 4 }}>{c.v} <span style={{ fontSize: 12, color: BL.muted }}>/ {c.max}</span></div>
                      <div style={{ marginTop: 6, height: 4, background: BL.hair, borderRadius: 2 }}>
                        <div style={{ width: `${(c.v / c.max) * 100}%`, height: '100%', background: BL.ink, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <Tag color={BL.muted}>ELECTIVE / EMERGENCY</Tag>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <Btn variant="soft" size="sm" color={BL.ink}>Elective</Btn>
                  <Btn variant="outline" size="sm" color={BL.red}>Emergency</Btn>
                  <Btn variant="ghost" size="sm" color={BL.muted}>Standing reservation</Btn>
                </div>
              </div>

              <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
                <Btn variant="outline" color={BL.muted}>Save draft</Btn>
                <Btn full size="lg" color={BL.ink}>Submit to HSA</Btn>
              </div>
            </W>

            {/* Impact preview */}
            <div>
              <W pad={20} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Tag color={BL.muted}>FORECAST IMPACT · IF SUBMITTED</Tag>
                  <Tag color={BL.need.urgent.fg} bg={BL.need.urgent.bg}>BUFFER RISK +9%</Tag>
                </div>
                <div style={{ fontFamily: BL.sans, fontSize: 15, color: BL.ink, marginTop: 8, lineHeight: 1.5 }}>
                  Will draw <b>12 units A+</b> from national pool on Fri 23 May. National A+ buffer drops from 5.6d → 4.8d.
                </div>
                <div style={{ marginTop: 14 }}>
                  <Tag color={BL.muted}>A+ NATIONAL STOCK · BEFORE / AFTER</Tag>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <Tag color={BL.muted}>BEFORE</Tag>
                      <Spark w={220} h={40} points={[6.0, 6.1, 5.9, 5.8, 5.7, 5.7, 5.8, 5.6]} color={BL.ink2} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Tag color={BL.muted}>AFTER</Tag>
                      <Spark w={220} h={40} points={[6.0, 6.1, 5.9, 5.8, 5.0, 4.8, 4.6, 4.5]} color={BL.red} />
                    </div>
                  </div>
                </div>
              </W>

              <W pad={16}>
                <H size={14}>Scheduled this week · 18 procedures</H>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: BL.sans, fontSize: 12, marginTop: 8 }}>
                  <thead>
                    <tr style={{ color: BL.muted }}>
                      {['WHEN','PROCEDURE','TYPE','UNITS','STATUS'].map(h => (
                        <th key={h} style={{ padding: '6px 4px', textAlign: 'left', fontFamily: BL.mono, fontSize: 10, fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Wed 14:00','Cardiac CABG','O−',6,'submitted'],
                      ['Wed 17:30','Liver transplant','A+',12,'draft'],
                      ['Thu 09:00','Renal transplant','B+',6,'submitted'],
                      ['Thu 13:00','Oncology · w52','mixed',22,'rolling'],
                      ['Fri 06:00','Paeds NICU','O−',3,'standing'],
                      ['Fri 11:00','Trauma backlog','O− / O+',8,'submitted'],
                    ].map((r, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${BL.hair}` }}>
                        <td style={{ padding: '8px 4px', fontFamily: BL.mono, color: BL.muted }}>{r[0]}</td>
                        <td style={{ padding: '8px 4px', color: BL.ink, fontWeight: 500 }}>{r[1]}</td>
                        <td style={{ padding: '8px 4px', fontFamily: BL.mono, color: BL.ink2 }}>{r[2]}</td>
                        <td style={{ padding: '8px 4px', fontFamily: BL.mono, color: BL.ink }}>{r[3]}</td>
                        <td style={{ padding: '8px 4px' }}>
                          <Tag color={r[4] === 'draft' ? BL.need.low.fg : r[4] === 'standing' ? BL.muted : BL.need.ok.fg}
                               bg={r[4] === 'draft' ? BL.need.low.bg : r[4] === 'standing' ? BL.fill : BL.need.ok.bg}>
                            {r[4]}
                          </Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </W>
            </div>
          </div>
        </div>
      </HospShell>
    </Desk>
  );
}

Object.assign(window, { HospShell, HospCapacityA, HospCapacityB, HospDemand });
