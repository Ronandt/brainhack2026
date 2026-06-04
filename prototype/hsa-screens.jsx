// BloodLine — HSA admin console (desktop, data-dense)
// Light browser chrome wireframe at ~1200×740

function Desk({ children, w = 1200, h = 740, url = 'console.bloodline.gov.sg', tab = 'Forecast — BloodLine HSA' }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 8, overflow: 'hidden',
      background: '#ecead8', boxShadow: '0 16px 60px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', fontFamily: BL.sans
    }}>
      {/* light tab bar */}
      <div style={{ height: 36, background: '#e0ddc7', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: '#fc625d' }} />
          <div style={{ width: 10, height: 10, borderRadius: 5, background: '#fcbb40' }} />
          <div style={{ width: 10, height: 10, borderRadius: 5, background: '#34c648' }} />
        </div>
        <div style={{
          background: BL.paper, padding: '4px 12px', borderRadius: '6px 6px 0 0',
          fontFamily: BL.sans, fontSize: 11, color: BL.ink, alignSelf: 'flex-end',
          marginBottom: -4, marginLeft: 8
        }}>{tab}</div>
      </div>
      <div style={{ height: 32, background: BL.paper, borderBottom: `1px solid ${BL.hair}`,
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
        <span style={{ color: BL.faint }}>← →</span>
        <div style={{ flex: 1, height: 22, borderRadius: 11, background: BL.fill,
          fontFamily: BL.mono, fontSize: 10, color: BL.muted, padding: '0 12px',
          display: 'flex', alignItems: 'center' }}>
          🔒 {url}
        </div>
      </div>
      <div style={{ flex: 1, background: BL.paper, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
    </div>);

}

// Console chrome — left rail + top header
function ConsoleShell({ children, active = 'forecast', user = 'Dr. R. Lim · HSA', mode = 'predict' }) {
  const nav = [
  { k: 'forecast', l: 'Forecast' },
  { k: 'surge', l: 'Surge Mode' },
  { k: 'donors', l: 'Donor pool' },
  { k: 'drives', l: 'Drive queue' },
  { k: 'hospitals', l: 'Hospital demand' },
  { k: 'reports', l: 'Reports' }];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left rail */}
      <div style={{ width: 200, background: '#1a1917', color: '#e9e6e0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 3, background: BL.red }} />
            <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600 }}>BloodLine</span>
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: '#8e8a82', marginTop: 4, letterSpacing: 0.8 }}>HSA OPERATIONS · PROD</div>
        </div>
        <div style={{ padding: '8px 8px', flex: 1 }}>
          {nav.map((n) =>
          <div key={n.k} style={{
            padding: '8px 12px', borderRadius: 4, marginBottom: 2,
            background: active === n.k ? '#2a2723' : 'transparent',
            fontFamily: BL.sans, fontSize: 13,
            color: active === n.k ? '#fff' : '#bdb8b0',
            borderLeft: active === n.k ? `2px solid ${BL.red}` : '2px solid transparent',
            paddingLeft: 12
          }}>{n.l}</div>
          )}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid #2a2723', fontFamily: BL.mono, fontSize: 10, color: '#8e8a82' }}>
          MODE · <span style={{ color: mode === 'surge' ? BL.surge : '#bdb8b0' }}>{mode.toUpperCase()}</span><br />
          OPS · GREEN · 3 ACTIVE
        </div>
      </div>
      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: 48, borderBottom: `1px solid ${BL.hair}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.8 }}>HSA · NATIONAL OPERATIONS</span>
            <span style={{ color: BL.faint }}>/</span>
            <span style={{ ...{ fontFamily: BL.sans, color: BL.ink, fontWeight: 500, fontSize: "11px" }, fontFamily: "\"IBM Plex Mono\"", fontWeight: "400", fontSize: "10px", letterSpacing: "0px" }}>
              {(nav.find((n) => n.k === active)?.l || '').toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tag color={BL.muted}>{new Date().toLocaleString('en-SG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Tag>
            <div style={{ width: 1, height: 16, background: BL.hair }} />
            <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink }}>{user}</span>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: BL.fill, border: `1px solid ${BL.hair}` }} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {children}
        </div>
      </div>
    </div>);

}

// ─── FORECAST A — Map-overlaid regional risk (HERO) ──────────────
function ForecastA() {
  // Singapore regions with risk
  const regions = [
  { x: 96, y: 110, need: 'low', r: 18, label: 'NW' },
  { x: 160, y: 102, need: 'urgent', r: 22, label: 'N' },
  { x: 220, y: 108, need: 'critical', r: 26, label: 'NE' },
  { x: 130, y: 138, need: 'low', r: 16, label: 'W' },
  { x: 200, y: 132, need: 'urgent', r: 20, label: 'C' },
  { x: 270, y: 130, need: 'critical', r: 24, label: 'E' },
  { x: 320, y: 132, need: 'urgent', r: 18, label: 'SE' }];

  return (
    <Desk tab="Forecast — BloodLine HSA">
      <ConsoleShell active="forecast">
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Main panel */}
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
                  14-day shortage forecast
                </div>
                <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
                  Predicted probability of dropping below 3-day buffer · Bayesian model v4.2
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="soft" size="sm" color={BL.muted}>All types ▾</Btn>
                <Btn variant="soft" size="sm" color={BL.muted}>14 days ▾</Btn>
                <Btn variant="outline" size="sm" color={BL.ink}>Export</Btn>
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
              { l: 'TYPES AT RISK', v: '3 of 8', sub: 'O−, B−, A−', tone: 'critical' },
              { l: 'PROB. SHORTAGE 7D', v: '38%', sub: '↑ 12 pts vs last wk', tone: 'urgent' },
              { l: 'DONORS NEEDED 14D', v: '4,820', sub: 'baseline 3,100' },
              { l: 'INCOMING THIS WK', v: '1,840', sub: '↓ 8% vs target' }].
              map((k, i) =>
              <W key={i} pad={14}>
                  <Tag color={BL.muted}>{k.l}</Tag>
                  <div style={{ fontFamily: BL.mono, fontSize: 26, fontWeight: 600, color: BL.ink, marginTop: 4, letterSpacing: -0.6 }}>
                    {k.v}
                  </div>
                  <div style={{ fontFamily: BL.sans, fontSize: 11,
                  color: k.tone === 'critical' ? BL.redInk : k.tone === 'urgent' ? BL.need.urgent.fg : BL.muted,
                  marginTop: 2 }}>{k.sub}</div>
                </W>
              )}
            </div>

            {/* Map */}
            <W pad={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BL.hair}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <H size={14}>Regional shortage risk — O−</H>
                  <Tag color={BL.muted}>radius ∝ DONOR DEFICIT · TINT ∝ 7-DAY PROBABILITY</Tag>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {['O−', 'O+', 'A−', 'A+', 'B−', 'B+', 'AB−', 'AB+'].map((t, i) =>
                  <BloodChip key={t} type={t} need={BLOOD_TYPES[i].n} size="sm" selected={t === 'O−'} />
                  )}
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <SGMap w={760} h={300} dots={regions} />
                {/* Legend */}
                <div style={{ position: 'absolute', bottom: 12, right: 12, padding: 10,
                  background: '#fffe', border: `1px solid ${BL.hair}`, borderRadius: 4, fontFamily: BL.mono, fontSize: 10 }}>
                  <div style={{ color: BL.muted, marginBottom: 4 }}>7-DAY SHORTAGE PROBABILITY</div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {['ok', 'low', 'urgent', 'critical'].map((k) =>
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 5, background: BL.need[k].bg, border: `1px solid ${BL.need[k].fg}` }} />
                        <span style={{ color: BL.ink, marginRight: 8 }}>{k === 'ok' ? '<10%' : k === 'low' ? '10–30%' : k === 'urgent' ? '30–60%' : '>60%'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </W>

            {/* Probability fan chart */}
            <W pad={16}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <H size={14}>Projected stock — O− · next 14 days</H>
                  <Tag color={BL.muted}>BAND = 90% CONFIDENCE · DASHED LINE = 3-DAY BUFFER</Tag>
                </div>
                <div style={{ display: 'flex', gap: 12, fontFamily: BL.mono, fontSize: 10, color: BL.muted }}>
                  <span>● actual</span><span>● P50</span><span>▒ P5–P95</span>
                </div>
              </div>
              <FanChart />
            </W>
          </div>

          {/* Right rail — readout */}
          <div style={{ width: 320, borderLeft: `1px solid ${BL.hair}`, background: '#fdfcf8', padding: 20, overflowY: 'auto' }}>
            <Tag color={BL.muted}>RECOMMENDED ACTIONS</Tag>
            <div style={{ marginTop: 8 }}>
              {[
              { tone: 'critical', t: 'Activate Surge Mode for O−', sub: 'Projected 71% shortage probability by Friday.' },
              { tone: 'urgent', t: 'Approve 3 pending NE drives', sub: 'Tampines, Pasir Ris, Bedok — covers regional gap.' },
              { tone: 'low', t: 'Pre-warn Bloodbank@Westgate', sub: 'Stock will dip below 5d on Wed.' }].
              map((a, i) =>
              <div key={i} style={{ padding: 12, borderRadius: 6, marginBottom: 8,
                background: BL.need[a.tone].bg, border: `1px solid ${BL.need[a.tone].fg}33` }}>
                  <Tag color={BL.need[a.tone].fg}>{BL.need[a.tone].label}</Tag>
                  <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500, marginTop: 4 }}>{a.t}</div>
                  <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.muted, marginTop: 4, lineHeight: 1.4 }}>{a.sub}</div>
                  <Btn variant="ghost" size="sm" color={BL.ink} style={{ padding: 0, marginTop: 6 }}>Take action →</Btn>
                </div>
              )}
            </div>

            <Tag color={BL.muted} style={{ marginTop: 8, display: 'block' }}>MODEL CONFIDENCE</Tag>
            <W pad={12} style={{ marginTop: 6 }}>
              {[['7-day AUC', '0.91'], ['14-day AUC', '0.84'], ['Last retrain', '16 May 2026'], ['Features', '46 active']].map((r, i) =>
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                borderTop: i ? `1px solid ${BL.hair}` : 'none' }}>
                  <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>{r[0]}</span>
                  <span style={{ fontFamily: BL.mono, fontSize: 12, color: BL.ink, fontWeight: 600 }}>{r[1]}</span>
                </div>
              )}
            </W>
          </div>
        </div>
      </ConsoleShell>
    </Desk>);

}

// Fan chart SVG
function FanChart() {
  const W = 760,H = 200,pad = 32;
  const days = 14;
  const px = (i) => pad + i / (days - 1) * (W - pad * 2);
  const py = (v) => H - pad - v / 12 * (H - pad * 1.5);
  // actual past 4 days
  const actual = [9.2, 8.8, 7.6, 6.4];
  // forecast P50, P5, P95 starting from day 3 → day 13
  const p50 = [6.4, 5.6, 5.0, 4.6, 4.2, 3.9, 3.7, 3.5, 3.4, 3.5, 3.7];
  const p05 = [6.4, 5.0, 4.2, 3.6, 3.0, 2.4, 1.9, 1.6, 1.4, 1.3, 1.4];
  const p95 = [6.4, 6.2, 5.9, 5.7, 5.5, 5.4, 5.4, 5.5, 5.6, 5.8, 6.0];
  const fanD = p95.map((v, i) => `${i ? 'L' : 'M'} ${px(i + 3)} ${py(v)}`).join(' ') +
  ' ' + p05.slice().reverse().map((v, j) => `L ${px(days - 1 - j)} ${py(v)}`).join(' ') + ' Z';
  const p50D = p50.map((v, i) => `${i ? 'L' : 'M'} ${px(i + 3)} ${py(v)}`).join(' ');
  const actD = actual.map((v, i) => `${i ? 'L' : 'M'} ${px(i)} ${py(v)}`).join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      {/* y grid */}
      {[0, 3, 6, 9, 12].map((v) =>
      <g key={v}>
          <line x1={pad} x2={W - pad} y1={py(v)} y2={py(v)} stroke={BL.hair} strokeDasharray={v === 3 ? '4 4' : ''} />
          <text x={pad - 8} y={py(v) + 3} textAnchor="end" fontFamily={BL.mono} fontSize="9" fill={BL.muted}>{v}d</text>
        </g>
      )}
      {/* x labels */}
      {Array.from({ length: days }).map((_, i) =>
      <text key={i} x={px(i)} y={H - 12} textAnchor="middle" fontFamily={BL.mono} fontSize="9" fill={BL.muted}>
          {i < 4 ? `D-${3 - i}` : `D+${i - 3}`}
        </text>
      )}
      {/* 3d buffer label */}
      <text x={W - pad - 4} y={py(3) - 4} textAnchor="end" fontFamily={BL.mono} fontSize="9" fill={BL.redInk}>3-DAY BUFFER</text>
      {/* fan */}
      <path d={fanD} fill={BL.redSoft} opacity="0.55" />
      <path d={p50D} stroke={BL.red} strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
      <path d={actD} stroke={BL.ink} strokeWidth="2" fill="none" />
      {/* now line */}
      <line x1={px(3)} y1={pad / 2} x2={px(3)} y2={H - pad} stroke={BL.ink} strokeDasharray="2 3" opacity="0.5" />
      <text x={px(3)} y={pad / 2 - 2} textAnchor="middle" fontFamily={BL.mono} fontSize="9" fill={BL.ink}>NOW</text>
    </svg>);

}

// ─── FORECAST B — Classic heatmap grid (alt IA) ──────────────────
function ForecastB() {
  const types = ['O−', 'O+', 'A−', 'A+', 'B−', 'B+', 'AB−', 'AB+'];
  const days = 14;
  // Pre-built risk matrix
  const matrix = [
  [3, 3, 3, 3, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1], // O−
  [2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1], // O+
  [2, 2, 3, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 1], // A−
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0], // A+
  [3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1], // B−
  [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0], // B+
  [2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 0, 0, 0, 0], // AB−
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // AB+
  ];
  const riskKey = ['ok', 'low', 'urgent', 'critical'];
  return (
    <Desk tab="Forecast — BloodLine HSA">
      <ConsoleShell active="forecast">
        <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
                14-day shortage heatmap
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
                Probability of dropping below 3-day buffer · per blood type
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="soft" size="sm" color={BL.muted}>National ▾</Btn>
              <Btn variant="soft" size="sm" color={BL.muted}>14 days ▾</Btn>
              <Btn variant="outline" size="sm" color={BL.ink}>Export</Btn>
            </div>
          </div>

          {/* Heatmap */}
          <W pad={20} style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${days}, 1fr)`, gap: 4, alignItems: 'center' }}>
              <div />
              {Array.from({ length: days }).map((_, i) =>
              <div key={i} style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, textAlign: 'center' }}>
                  {i === 0 ? 'TODAY' : `+${i}d`}
                </div>
              )}
              {types.map((t, ti) =>
              <React.Fragment key={t}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BloodChip type={t} need={BLOOD_TYPES[ti].n} size="sm" />
                  </div>
                  {matrix[ti].map((r, di) => {
                  const c = BL.need[riskKey[r]];
                  return (
                    <div key={di} style={{
                      height: 32, background: c.bg, border: `1px solid ${c.fg}22`,
                      borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: BL.mono, fontSize: 9, color: c.fg, fontWeight: 600
                    }}>
                        {r === 3 ? '>60' : r === 2 ? '40' : r === 1 ? '20' : '<10'}
                      </div>);

                })}
                </React.Fragment>
              )}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BL.hair}`, alignItems: 'center' }}>
              <Tag color={BL.muted}>RISK LEGEND · % PROB BELOW BUFFER</Tag>
              {['ok', 'low', 'urgent', 'critical'].map((k) =>
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 14, height: 14, background: BL.need[k].bg, border: `1px solid ${BL.need[k].fg}` }} />
                  <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.ink }}>
                    {k === 'ok' ? '<10%' : k === 'low' ? '10–30%' : k === 'urgent' ? '30–60%' : '>60%'}
                  </span>
                </div>
              )}
            </div>
          </W>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
            <W pad={16}>
              <H size={14}>Projected vs actual donations · 28d</H>
              <Tag color={BL.muted}>BLACK = ACTUAL · RED DASHED = MODEL</Tag>
              <div style={{ marginTop: 10 }}>
                <FanChart />
              </div>
            </W>
            <W pad={16}>
              <H size={14}>Top model drivers</H>
              <Tag color={BL.muted}>SHAP CONTRIBUTION · LAST 7D</Tag>
              <div style={{ marginTop: 10 }}>
                {[
                ['NUH scheduled cardiac (+18%)', 0.92, BL.redInk],
                ['SGH oncology demand (+11%)', 0.74, BL.redInk],
                ['NSF intake cycle (−)', 0.58, BL.need.urgent.fg],
                ['School-holiday churn', 0.42, BL.need.low.fg],
                ['Weather (haze forecast)', 0.28, BL.muted],
                ['Lunar New Year aftermath', 0.18, BL.muted]].
                map(([l, w, c], i) =>
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <span style={{ flex: '0 0 200px', fontFamily: BL.sans, fontSize: 12, color: BL.ink2 }}>{l}</span>
                    <div style={{ flex: 1, height: 6, background: BL.hair, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${w * 100}%`, height: '100%', background: c }} />
                    </div>
                    <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, width: 30, textAlign: 'right' }}>{w.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </W>
          </div>
        </div>
      </ConsoleShell>
    </Desk>);

}

// ─── SURGE ACTIVATOR · break-glass + confirm + live status ───────
function SurgeActivator() {
  return (
    <Desk tab="Surge Mode — BloodLine HSA">
      <ConsoleShell active="surge" mode="predict">
        <div style={{ padding: '20px 24px', height: '100%', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
                Surge Mode activation
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
                Mobilise the donor pool when forecasted shortage exceeds the response threshold. Requires Director sign-off.
              </div>
            </div>
            <Tag color={BL.muted}>STATUS · STAND-BY · 0 ACTIVE SURGES</Tag>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            {/* Configure */}
            <W pad={20}>
              <Tag color={BL.muted}>STEP 1 · CONFIGURE</Tag>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>Blood type(s)</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {BLOOD_TYPES.map(({ t, n }, i) =>
                  <BloodChip key={t} type={t} need={n} size="md" selected={t === 'O−'} />
                  )}
                </div>
                <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 6 }}>
                  O− SELECTED · 11,420 ELIGIBLE DONORS NATIONALLY
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <label style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>Reach tiers</label>
                <div style={{ marginTop: 6 }}>
                  {[
                  { l: 'Tier 1 · within 5 km of a blood bank', est: '1,820 donors · est 22% response', sel: true },
                  { l: 'Tier 2 · within 15 km', est: '4,200 donors · est 14% response', sel: true },
                  { l: 'Tier 3 · island-wide', est: '11,420 donors · est 7% response' }].
                  map((tier, i) =>
                  <div key={i} style={{
                    padding: 12, border: `${tier.sel ? 2 : 1}px solid ${tier.sel ? BL.ink : BL.hair}`,
                    borderRadius: 6, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12
                  }}>
                      <div style={{
                      width: 16, height: 16, borderRadius: 3,
                      border: `1.5px solid ${tier.sel ? BL.ink : BL.faint}`,
                      background: tier.sel ? BL.ink : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11
                    }}>{tier.sel ? '✓' : ''}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>{tier.l}</div>
                        <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>{tier.est}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <label style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>Channel + cap</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <W pad={10} style={{ flex: 1 }}>
                    <Tag color={BL.muted}>CHANNELS</Tag>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <Tag color={BL.ink} bg={BL.fill}>Push ✓</Tag>
                      <Tag color={BL.ink} bg={BL.fill}>SMS ✓</Tag>
                      <Tag color={BL.muted}>WhatsApp</Tag>
                      <Tag color={BL.muted}>Email</Tag>
                    </div>
                  </W>
                  <W pad={10} style={{ flex: 1 }}>
                    <Tag color={BL.muted}>SEND CAP / DONOR</Tag>
                    <div style={{ fontFamily: BL.mono, fontSize: 14, color: BL.ink, fontWeight: 600, marginTop: 6 }}>1 push · then SMS at 6h</div>
                  </W>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <label style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>Surge message preview</label>
                <W pad={12} style={{ marginTop: 6, background: BL.surgeBg, border: `1px solid ${BL.surge}44` }}>
                  <Tag color={BL.surge}>SURGE · O−</Tag>
                  <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500, marginTop: 4 }}>
                    O− is needed today. Bloodbank@HSA · 2.4 km · slots in next 24h.
                  </div>
                  <Btn variant="ghost" size="sm" color={BL.muted} style={{ padding: 0, marginTop: 6 }}>Edit copy ▸</Btn>
                </W>
              </div>
            </W>

            {/* Projected reach */}
            <div>
              <W pad={20} style={{ marginBottom: 14 }}>
                <Tag color={BL.muted}>STEP 2 · PROJECTED REACH</Tag>
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: BL.mono, fontSize: 32, color: BL.ink, fontWeight: 600, letterSpacing: -0.6 }}>6,020</span>
                    <Tag color={BL.muted}>DONORS NOTIFIED</Tag>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                    <span style={{ fontFamily: BL.mono, fontSize: 32, color: BL.red, fontWeight: 600, letterSpacing: -0.6 }}>~890</span>
                    <Tag color={BL.muted}>PROJECTED RESPONSES · 24H</Tag>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Tag color={BL.muted}>RESPONSE CURVE · MODELLED</Tag>
                  <Spark w={280} h={56} points={[20, 60, 140, 280, 480, 680, 800, 870, 890]} color={BL.red} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BL.mono, fontSize: 9, color: BL.faint, marginTop: 4 }}>
                    <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
                  </div>
                </div>
              </W>

              <W pad={20} style={{ marginBottom: 14 }}>
                <Tag color={BL.muted}>STEP 3 · CAPACITY CHECK</Tag>
                <div style={{ marginTop: 10 }}>
                  {[
                  ['Bloodbank@HSA', 86, 120],
                  ['Bloodbank@Dhoby Ghaut', 54, 90],
                  ['Bloodbank@Woodlands', 42, 80],
                  ['Bloodbank@Westgate', 38, 70]].
                  map(([b, used, cap], i) =>
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                      <span style={{ flex: '0 0 180px', fontFamily: BL.sans, fontSize: 12, color: BL.ink2 }}>{b}</span>
                      <div style={{ flex: 1, height: 8, background: BL.hair, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ width: `${used / cap * 100}%`, height: '100%', background: BL.ink }} />
                      </div>
                      <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, width: 60, textAlign: 'right' }}>{used}/{cap}</span>
                    </div>
                  )}
                </div>
                <Tag color={BL.need.urgent.fg} style={{ marginTop: 8, display: 'block' }}>⚠ +120 slots will be opened automatically</Tag>
              </W>

              {/* Big break-glass */}
              <div style={{
                padding: 20, borderRadius: 8, background: BL.surgeBg,
                border: `2px solid ${BL.surge}`
              }}>
                <Tag color={BL.surge}>BREAK GLASS · REQUIRES DUAL SIGN-OFF</Tag>
                <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500, marginTop: 8, lineHeight: 1.4 }}>
                  Activating will notify 6,020 donors and shift the donor app into surge mode. Cannot be undone for 6h.
                </div>
                <Btn full size="lg" style={{ marginTop: 12, background: BL.surge, border: 'none', color: '#fff' }}>
                  Activate Surge Mode →
                </Btn>
                <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 6, textAlign: 'center' }}>
                  REQUIRES · DIRECTOR LIM · DIRECTOR TAN
                </div>
              </div>
            </div>
          </div>
        </div>
      </ConsoleShell>
    </Desk>);

}

// ─── DONOR POOL ANALYTICS ────────────────────────────────────────
function DonorPool() {
  const cohorts = [
  { c: '2026 Q1', size: 1820, m1: 95, m3: 76, m6: 58, m12: 42 },
  { c: '2025 Q4', size: 2140, m1: 92, m3: 71, m6: 54, m12: 38 },
  { c: '2025 Q3', size: 1980, m1: 89, m3: 68, m6: 49, m12: 33 },
  { c: '2025 Q2', size: 2200, m1: 91, m3: 70, m6: 52, m12: 36 },
  { c: '2025 Q1', size: 1740, m1: 87, m3: 64, m6: 46, m12: 31 }];

  return (
    <Desk tab="Donor pool — BloodLine HSA">
      <ConsoleShell active="donors">
        <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
                Donor pool · 184,210 total
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
                Active retention curve vs at-risk segment. Filter to plan retention sends.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="soft" size="sm" color={BL.muted}>All types ▾</Btn>
              <Btn variant="soft" size="sm" color={BL.muted}>All regions ▾</Btn>
              <Btn variant="soft" size="sm" color={BL.muted}>Age: 18–65 ▾</Btn>
              <Btn variant="outline" size="sm" color={BL.ink}>+ Save segment</Btn>
            </div>
          </div>

          {/* Pool funnel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            {[
            { l: 'ACTIVE · donated ≤ 12mo', v: '72,440', s: '39% of pool', tone: 'ok' },
            { l: 'DORMANT · 12–24mo', v: '54,180', s: '29% — target reactivate', tone: 'low' },
            { l: 'AT-RISK · 24mo+', v: '38,920', s: '21% — churn imminent', tone: 'urgent' },
            { l: 'LAPSED · 36mo+', v: '18,670', s: '10% — archive', tone: 'critical' }].
            map((k, i) =>
            <W key={i} pad={14}>
                <Tag color={BL.need[k.tone].fg} bg={BL.need[k.tone].bg}>{k.l}</Tag>
                <div style={{ fontFamily: BL.mono, fontSize: 24, fontWeight: 600, color: BL.ink, marginTop: 6, letterSpacing: -0.6 }}>{k.v}</div>
                <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.muted, marginTop: 2 }}>{k.s}</div>
              </W>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, marginBottom: 14 }}>
            <W pad={16}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <H size={14}>Cohort retention · % returning</H>
                <Tag color={BL.muted}>M1 · M3 · M6 · M12</Tag>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(4, 1fr) 60px', rowGap: 4, columnGap: 8, alignItems: 'center' }}>
                <Tag color={BL.muted}>COHORT</Tag>
                {['M1', 'M3', 'M6', 'M12'].map((m) =>
                <Tag key={m} color={BL.muted} style={{ textAlign: 'center' }}>{m}</Tag>
                )}
                <Tag color={BL.muted} style={{ textAlign: 'right' }}>SIZE</Tag>
                {cohorts.map((co) =>
                <React.Fragment key={co.c}>
                    <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink }}>{co.c}</span>
                    {[co.m1, co.m3, co.m6, co.m12].map((v, i) => {
                    const level = v >= 80 ? 'ok' : v >= 60 ? 'low' : v >= 40 ? 'urgent' : 'critical';
                    const c = BL.need[level];
                    return (
                      <div key={i} style={{
                        height: 26, background: c.bg, color: c.fg,
                        border: `1px solid ${c.fg}22`, borderRadius: 3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: BL.mono, fontSize: 11, fontWeight: 600
                      }}>{v}%</div>);

                  })}
                    <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, textAlign: 'right' }}>{co.size.toLocaleString()}</span>
                  </React.Fragment>
                )}
              </div>
            </W>

            <W pad={16}>
              <H size={14}>Mix by blood type</H>
              <div style={{ marginTop: 10 }}>
                {BLOOD_TYPES.map(({ t, n }, i) => {
                  const w = [9, 38, 4, 25, 2, 14, 1, 7][i];
                  return (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                      <BloodChip type={t} need={n} size="sm" />
                      <div style={{ flex: 1, height: 6, background: BL.hair, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${w * 1.8}%`, height: '100%', background: BL.ink }} />
                      </div>
                      <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, width: 36, textAlign: 'right' }}>{w}%</span>
                    </div>);

                })}
              </div>
              <Tag color={BL.muted} style={{ marginTop: 12, display: 'block' }}>VS NATIONAL POP. · O− IS 4.2% LOW</Tag>
            </W>
          </div>

          {/* Retention sends queue */}
          <W pad={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <H size={14}>Retention campaigns · scheduled</H>
              <Btn variant="outline" size="sm" color={BL.ink}>+ New campaign</Btn>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: BL.sans, fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BL.hair}`, color: BL.muted, textAlign: 'left' }}>
                  {['CAMPAIGN', 'SEGMENT', 'SIZE', 'CHANNEL', 'SEND', 'STATUS', 'EXPECTED LIFT'].map((h) =>
                  <th key={h} style={{ padding: '8px 6px', fontFamily: BL.mono, fontSize: 10, fontWeight: 500 }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {[
                ['Q2 reactivation · O−/B−', 'At-risk · O− or B−', '8,420', 'Push + SMS', 'Mon 19 May 10:00', 'Scheduled', '+2.1pp M3'],
                ['Birthday bridge', 'Dormant · birthday +/-7d', '1,240', 'Email', 'Daily', 'Live', '+1.4pp M3'],
                ['NSF re-enrolment', 'Lapsed · age 21–24', '6,180', 'Push', 'Thu 22 May 14:00', 'Draft', '+3.8pp M6'],
                ['Workplace re-light', 'Drive captains', '180', 'WhatsApp', 'Fri 23 May 09:00', 'Pending approval', '+18 drives']].
                map((r, i) =>
                <tr key={i} style={{ borderBottom: `1px solid ${BL.hair}` }}>
                    {r.map((cell, j) =>
                  <td key={j} style={{ padding: '10px 6px', color: j === 0 ? BL.ink : BL.ink2, fontFamily: j === 2 || j === 6 ? BL.mono : BL.sans }}>
                        {cell}
                      </td>
                  )}
                  </tr>
                )}
              </tbody>
            </table>
          </W>
        </div>
      </ConsoleShell>
    </Desk>);

}

// ─── DRIVE APPROVAL QUEUE ────────────────────────────────────────
function DriveQueue() {
  return (
    <Desk tab="Drive queue — BloodLine HSA">
      <ConsoleShell active="drives">
        <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
                Community drive queue
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
                18 pending requests · approve, decline, or merge with mobile-unit schedule.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="soft" size="sm" color={BL.muted}>Pending (18) ▾</Btn>
              <Btn variant="soft" size="sm" color={BL.muted}>All regions ▾</Btn>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
            { org: 'DBS · Group Tech', loc: 'MBFC T3 · Marina Bay', date: 'Wed 20 May · 11:30–14:00', mem: '128 members · 14 O−', tone: 'critical', why: 'Surge-eligible · O− region high need' },
            { org: 'NUS · UCC', loc: 'Kent Ridge', date: 'Thu 21 May · 11:00–18:00', mem: '412 members · 38 O−', tone: 'urgent', why: 'Repeat host · 96% delivery rate' },
            { org: 'Tampines East RC', loc: 'Tampines St 21', date: 'Sat 23 May · 09:00–15:00', mem: '96 members · 9 O−', tone: 'urgent', why: 'Fills NE gap (red on map)' },
            { org: 'Grab · Hubble', loc: 'Sin Ming', date: 'Mon 26 May · 13:00–19:00', mem: '380 members · 22 O−', tone: 'low', why: 'New host · needs onsite manager' },
            { org: 'St. Joseph Inst.', loc: 'Bukit Timah', date: 'Fri 30 May · 09:00–13:00', mem: 'School · 64 eligible', tone: 'ok', why: 'Volunteer scheme · age 17+' },
            { org: 'Toh Yi RC', loc: 'Bukit Timah', date: 'Sat 31 May · 10:00–16:00', mem: '72 members · 5 O−', tone: 'low', why: 'Co-host with St. Joseph?' }].
            map((d, i) =>
            <W key={i} pad={16}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Tag color={BL.muted}>REQUEST · #{8120 + i}</Tag>
                    <div style={{ fontFamily: BL.sans, fontSize: 15, color: BL.ink, fontWeight: 600, marginTop: 4 }}>{d.org}</div>
                    <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 2 }}>{d.loc}</div>
                  </div>
                  <Tag color={BL.need[d.tone].fg} bg={BL.need[d.tone].bg}>{BL.need[d.tone].label} REGION</Tag>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Tag color={BL.muted}>WHEN</Tag>
                    <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.ink, marginTop: 2 }}>{d.date}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Tag color={BL.muted}>POOL</Tag>
                    <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.ink, marginTop: 2 }}>{d.mem}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, padding: 8, background: BL.fill, borderRadius: 4 }}>
                  <Tag color={BL.muted}>FORECAST FIT</Tag>
                  <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink2, marginTop: 2 }}>{d.why}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <Btn variant="outline" size="sm" color={BL.muted}>Decline</Btn>
                  <Btn variant="outline" size="sm" color={BL.muted}>Ask edits</Btn>
                  <Btn size="sm" color={BL.ink} style={{ marginLeft: 'auto' }}>Approve</Btn>
                </div>
              </W>
            )}
          </div>
        </div>
      </ConsoleShell>
    </Desk>);

}

Object.assign(window, { Desk, ConsoleShell, ForecastA, ForecastB, SurgeActivator, DonorPool, DriveQueue, FanChart });