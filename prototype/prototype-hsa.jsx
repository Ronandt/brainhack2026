// BloodLine — interactive HSA console
// Two main interactive moments: Forecast → Surge activator; Activate Surge → switches donor app into surge mode.

function HSADesktop() {
  return (
    <Desk tab="BloodLine — HSA Operations" url="console.bloodline.gov.sg">
      <ConsoleShellLive />
    </Desk>
  );
}

function ConsoleShellLive() {
  const { s, set } = useApp();
  const nav = [
    { k: 'forecast',  l: 'Forecast' },
    { k: 'surge',     l: 'Surge Mode' },
    { k: 'donors',    l: 'Donor pool' },
    { k: 'drives',    l: 'Drive queue' },
    { k: 'hospitals', l: 'Hospital demand' },
    { k: 'reports',   l: 'Reports' },
  ];
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: BL.sans, position: 'relative' }}>
      <div style={{ width: 200, background: '#1a1917', color: '#e9e6e0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 3, background: BL.red }} />
            <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600 }}>BloodLine</span>
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: '#8e8a82', marginTop: 4, letterSpacing: 0.8 }}>HSA OPERATIONS · PROD</div>
        </div>
        <div style={{ padding: 8, flex: 1 }}>
          {nav.map((n) => (
            <button key={n.k} onClick={() => set({ hsaTab: n.k })} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 12px', borderRadius: 4, marginBottom: 2,
              background: s.hsaTab === n.k ? '#2a2723' : 'transparent',
              fontFamily: BL.sans, fontSize: 13,
              color: s.hsaTab === n.k ? '#fff' : '#bdb8b0',
              borderLeft: s.hsaTab === n.k ? `2px solid ${BL.red}` : '2px solid transparent',
              paddingLeft: 12, cursor: 'pointer', border: 'none', borderBottom: 'none',
              position: 'relative',
            }}>
              {n.l}
              {n.k === 'hospitals' && s.hsaInbox.length > 0 && (
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  fontFamily: BL.mono, fontSize: 9, color: '#fff', background: BL.surge,
                  borderRadius: 8, padding: '1px 6px', fontWeight: 600,
                }}>{s.hsaInbox.length}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid #2a2723', fontFamily: BL.mono, fontSize: 10, color: '#8e8a82' }}>
          MODE · <span style={{ color: s.surgeActive ? BL.surge : '#bdb8b0', fontWeight: 600 }}>
            {s.surgeActive ? 'SURGE' : 'PREDICT'}
          </span><br />
          OPS · GREEN · 3 ACTIVE
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: 48, borderBottom: `1px solid ${BL.hair}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.8 }}>HSA · NATIONAL OPERATIONS</span>
            <span style={{ color: BL.faint }}>/</span>
            <span style={{ fontFamily: BL.sans, color: BL.ink, fontWeight: 500, fontSize: 13 }}>
              {(nav.find((n) => n.k === s.hsaTab)?.l || '')}
            </span>
            {s.surgeActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10,
                padding: '3px 8px', background: BL.surgeBg, borderRadius: 4, border: `1px solid ${BL.surge}55` }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: BL.surge, animation: 'bl-pulse 2s infinite' }} />
                <Tag color={BL.surge}>SURGE LIVE</Tag>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tag color={BL.muted}>{new Date().toLocaleString('en-SG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Tag>
            <div style={{ width: 1, height: 16, background: BL.hair }} />
            <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink }}>Dr. R. Lim · HSA</span>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: BL.fill, border: `1px solid ${BL.hair}` }} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {s.hsaTab === 'forecast'  && <HSAForecast />}
          {s.hsaTab === 'surge'     && <HSASurgeActivator />}
          {s.hsaTab === 'donors'    && <HSADonorPool />}
          {s.hsaTab === 'drives'    && <HSADriveQueue />}
          {s.hsaTab === 'hospitals' && <HSAHospitalDemand />}
          {s.hsaTab === 'reports'   && <HSAPlaceholder name="Reports" />}
        </div>
      </div>
      {s.hsaToast && (
        <div style={{
          position: 'absolute', bottom: 24, right: 24,
          padding: '12px 18px', background: BL.ink, color: '#fff', borderRadius: 8,
          fontFamily: BL.sans, fontSize: 13, fontWeight: 500, zIndex: 30,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}>{s.hsaToast}</div>
      )}
    </div>
  );
}

function HSAPlaceholder({ name }) {
  return (
    <div style={{ padding: 60, textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <Tag color={BL.muted}>{name.toUpperCase()}</Tag>
      <div style={{ fontFamily: BL.sans, fontSize: 18, color: BL.faint, marginTop: 6 }}>Module wireframed — not interactive in this prototype.</div>
    </div>
  );
}

// ─── Forecast ───────────────────────────────────────────────────
function HSAForecast() {
  const { s, set } = useApp();
  const regions = [
    { x: 96, y: 110, need: 'low', r: 18, label: 'NW' },
    { x: 160, y: 102, need: 'urgent', r: 22, label: 'N' },
    { x: 220, y: 108, need: 'critical', r: 26, label: 'NE' },
    { x: 130, y: 138, need: 'low', r: 16, label: 'W' },
    { x: 200, y: 132, need: 'urgent', r: 20, label: 'C' },
    { x: 270, y: 130, need: 'critical', r: 24, label: 'E' },
    { x: 320, y: 132, need: 'urgent', r: 18, label: 'SE' },
  ];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
              14-day shortage forecast
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
              Predicted probability of dropping below 3-day buffer · Bayesian model v4.2
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn size="sm" variant={s.hsaForecastView === 'map' ? 'fill' : 'soft'}
              color={s.hsaForecastView === 'map' ? BL.ink : BL.muted}
              onClick={() => set({ hsaForecastView: 'map' })}>Map view</Btn>
            <Btn size="sm" variant={s.hsaForecastView === 'heatmap' ? 'fill' : 'soft'}
              color={s.hsaForecastView === 'heatmap' ? BL.ink : BL.muted}
              onClick={() => set({ hsaForecastView: 'heatmap' })}>Heatmap</Btn>
            <Btn variant="outline" size="sm" color={BL.ink}
              onClick={() => set({ hsaToast: 'Export ready · forecast-2026-05-18.csv' })}>Export</Btn>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { l: 'TYPES AT RISK', v: '3 of 8', sub: 'O−, B−, A−', tone: 'critical' },
            { l: 'PROB. SHORTAGE 7D', v: '38%', sub: '↑ 12 pts vs last wk', tone: 'urgent' },
            { l: 'DONORS NEEDED 14D', v: '4,820', sub: 'baseline 3,100' },
            { l: 'INCOMING THIS WK', v: '1,840', sub: '↓ 8% vs target' },
          ].map((k, i) => (
            <W key={i} pad={14}>
              <Tag color={BL.muted}>{k.l}</Tag>
              <div style={{ fontFamily: BL.mono, fontSize: 26, fontWeight: 600, color: BL.ink, marginTop: 4, letterSpacing: -0.6 }}>{k.v}</div>
              <div style={{ fontFamily: BL.sans, fontSize: 11,
                color: k.tone === 'critical' ? BL.redInk : k.tone === 'urgent' ? BL.need.urgent.fg : BL.muted,
                marginTop: 2 }}>{k.sub}</div>
            </W>
          ))}
        </div>

        {s.hsaForecastView === 'map' ? (
          <W pad={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BL.hair}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <H size={14}>Regional shortage risk — O−</H>
                <Tag color={BL.muted}>radius ∝ DONOR DEFICIT · TINT ∝ 7-DAY PROBABILITY</Tag>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {BLOOD_TYPES.map(({ t, n }) => (
                  <BloodChip key={t} type={t} need={n} size="sm" selected={t === 'O−'} />
                ))}
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <SGMap w={760} h={300} dots={regions} />
            </div>
          </W>
        ) : (
          <HSAHeatmap />
        )}

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

      <div style={{ width: 320, borderLeft: `1px solid ${BL.hair}`, background: '#fdfcf8', padding: 20, overflowY: 'auto' }}>
        <Tag color={BL.muted}>RECOMMENDED ACTIONS</Tag>
        <div style={{ marginTop: 8 }}>
          {[
            { tone: 'critical', t: 'Activate Surge Mode for O−', sub: 'Projected 71% shortage probability by Friday.',
              go: () => set({ hsaTab: 'surge' }) },
            { tone: 'urgent',   t: 'Approve 3 pending NE drives', sub: 'Tampines, Pasir Ris, Bedok — covers regional gap.',
              go: () => set({ hsaTab: 'drives' }) },
            { tone: 'low',      t: 'Pre-warn Bloodbank@Westgate', sub: 'Stock will dip below 5d on Wed.',
              go: () => set({ hsaToast: 'Pre-warned Westgate · ack sent' }) },
          ].map((a, i) => (
            <div key={i} style={{ padding: 12, borderRadius: 6, marginBottom: 8,
              background: BL.need[a.tone].bg, border: `1px solid ${BL.need[a.tone].fg}33` }}>
              <Tag color={BL.need[a.tone].fg}>{BL.need[a.tone].label}</Tag>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500, marginTop: 4 }}>{a.t}</div>
              <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.muted, marginTop: 4, lineHeight: 1.4 }}>{a.sub}</div>
              <Btn variant="ghost" size="sm" color={BL.ink} style={{ padding: 0, marginTop: 6 }}
                onClick={a.go}>Take action →</Btn>
            </div>
          ))}
        </div>
        <Tag color={BL.muted} style={{ marginTop: 8, display: 'block' }}>MODEL CONFIDENCE</Tag>
        <W pad={12} style={{ marginTop: 6 }}>
          {[['7-day AUC', '0.91'], ['14-day AUC', '0.84'], ['Last retrain', '16 May 2026'], ['Features', '46 active']].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0',
              borderTop: i ? `1px solid ${BL.hair}` : 'none' }}>
              <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>{r[0]}</span>
              <span style={{ fontFamily: BL.mono, fontSize: 12, color: BL.ink, fontWeight: 600 }}>{r[1]}</span>
            </div>
          ))}
        </W>
      </div>
    </div>
  );
}

function HSAHeatmap() {
  const types = ['O−', 'O+', 'A−', 'A+', 'B−', 'B+', 'AB−', 'AB+'];
  const days = 14;
  const matrix = [
    [3, 3, 3, 3, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1],
    [2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1],
    [2, 2, 3, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1],
    [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];
  const riskKey = ['ok', 'low', 'urgent', 'critical'];
  return (
    <W pad={20} style={{ marginBottom: 16 }}>
      <H size={14}>14-day shortage heatmap</H>
      <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${days}, 1fr)`, gap: 4, alignItems: 'center', marginTop: 10 }}>
        <div />
        {Array.from({ length: days }).map((_, i) => (
          <div key={i} style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, textAlign: 'center' }}>
            {i === 0 ? 'TODAY' : `+${i}d`}
          </div>
        ))}
        {types.map((t, ti) => (
          <React.Fragment key={t}>
            <BloodChip type={t} need={BLOOD_TYPES[ti].n} size="sm" />
            {matrix[ti].map((r, di) => {
              const c = BL.need[riskKey[r]];
              return (
                <div key={di} style={{
                  height: 28, background: c.bg, border: `1px solid ${c.fg}22`,
                  borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: BL.mono, fontSize: 9, color: c.fg, fontWeight: 600,
                }}>{r === 3 ? '>60' : r === 2 ? '40' : r === 1 ? '20' : '<10'}</div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </W>
  );
}

// ─── Surge Activator ────────────────────────────────────────────
function HSASurgeActivator() {
  const { s, set } = useApp();
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleType = (t) => set((cur) => ({
    surgeConfig: { ...cur.surgeConfig, types: cur.surgeConfig.types.includes(t)
      ? cur.surgeConfig.types.filter((x) => x !== t) : [...cur.surgeConfig.types, t] },
  }));
  const toggleTier = (i) => set((cur) => {
    const tiers = [...cur.surgeConfig.tiers]; tiers[i] = !tiers[i];
    return { surgeConfig: { ...cur.surgeConfig, tiers } };
  });
  const toggleChan = (k) => set((cur) => ({
    surgeConfig: { ...cur.surgeConfig, channels: { ...cur.surgeConfig.channels, [k]: !cur.surgeConfig.channels[k] } },
  }));

  const totalDonors = s.surgeConfig.tiers.reduce((sum, on, i) => sum + (on ? [1820, 4200 - 1820, 11420 - 4200][i] : 0), 0);
  const projected = Math.round(totalDonors * 0.148);

  if (s.surgeActive) return <HSASurgeLive />;

  return (
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
        <W pad={20}>
          <Tag color={BL.muted}>STEP 1 · CONFIGURE</Tag>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>Blood type(s)</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {BLOOD_TYPES.map(({ t, n }) => (
                <button key={t} onClick={() => toggleType(t)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  <BloodChip type={t} need={n} size="md" selected={s.surgeConfig.types.includes(t)} />
                </button>
              ))}
            </div>
            <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 6 }}>
              {s.surgeConfig.types.join(', ') || 'NONE'} SELECTED · {totalDonors.toLocaleString()} ELIGIBLE DONORS
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>Reach tiers</label>
            <div style={{ marginTop: 6 }}>
              {[
                { l: 'Tier 1 · within 5 km of a blood bank', est: '1,820 donors · est 22% response' },
                { l: 'Tier 2 · within 15 km', est: '2,380 incremental · est 14% response' },
                { l: 'Tier 3 · island-wide', est: '7,220 incremental · est 7% response' },
              ].map((tier, i) => {
                const sel = s.surgeConfig.tiers[i];
                return (
                  <button key={i} onClick={() => toggleTier(i)} style={{
                    width: '100%', textAlign: 'left',
                    padding: 12, border: `${sel ? 2 : 1}px solid ${sel ? BL.ink : BL.hair}`,
                    borderRadius: 6, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12,
                    background: '#fff', cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 3,
                      border: `1.5px solid ${sel ? BL.ink : BL.faint}`,
                      background: sel ? BL.ink : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11,
                    }}>{sel ? '✓' : ''}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>{tier.l}</div>
                      <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>{tier.est}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>Channel + cap</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <W pad={10} style={{ flex: 1 }}>
                <Tag color={BL.muted}>CHANNELS</Tag>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {[['push', 'Push'], ['sms', 'SMS'], ['whatsapp', 'WhatsApp'], ['email', 'Email']].map(([k, l]) => {
                    const on = s.surgeConfig.channels[k];
                    return (
                      <button key={k} onClick={() => toggleChan(k)} style={{
                        background: on ? BL.fill : 'transparent', color: on ? BL.ink : BL.muted,
                        border: `1px solid ${on ? BL.ink : BL.hair}`, padding: '2px 8px', borderRadius: 3,
                        fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', cursor: 'pointer',
                      }}>{l} {on ? '✓' : ''}</button>
                    );
                  })}
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
              <Tag color={BL.surge}>SURGE · {s.surgeConfig.types.join(', ')}</Tag>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500, marginTop: 4 }}>
                {s.surgeConfig.types.join(', ')} is needed today. Bloodbank@HSA · 2.4 km · slots in next 24h.
              </div>
            </W>
          </div>
        </W>

        <div>
          <W pad={20} style={{ marginBottom: 14 }}>
            <Tag color={BL.muted}>STEP 2 · PROJECTED REACH</Tag>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: BL.mono, fontSize: 32, color: BL.ink, fontWeight: 600, letterSpacing: -0.6 }}>
                  {totalDonors.toLocaleString()}
                </span>
                <Tag color={BL.muted}>DONORS NOTIFIED</Tag>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                <span style={{ fontFamily: BL.mono, fontSize: 32, color: BL.red, fontWeight: 600, letterSpacing: -0.6 }}>
                  ~{projected.toLocaleString()}
                </span>
                <Tag color={BL.muted}>PROJECTED RESPONSES · 24H</Tag>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Tag color={BL.muted}>RESPONSE CURVE · MODELLED</Tag>
              <Spark w={280} h={56} points={[20, 60, 140, 280, 480, 680, 800, 870, projected].slice(0, 9)} color={BL.red} />
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
                ['Bloodbank@Westgate', 38, 70],
              ].map(([b, used, cap], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <span style={{ flex: '0 0 180px', fontFamily: BL.sans, fontSize: 12, color: BL.ink2 }}>{b}</span>
                  <div style={{ flex: 1, height: 8, background: BL.hair, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(used / cap) * 100}%`, height: '100%', background: BL.ink }} />
                  </div>
                  <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, width: 60, textAlign: 'right' }}>{used}/{cap}</span>
                </div>
              ))}
            </div>
            <Tag color={BL.need.urgent.fg} style={{ marginTop: 8, display: 'block' }}>⚠ +120 slots will be opened automatically</Tag>
          </W>

          <div style={{
            padding: 20, borderRadius: 8, background: BL.surgeBg,
            border: `2px solid ${BL.surge}`,
          }}>
            <Tag color={BL.surge}>BREAK GLASS · REQUIRES DUAL SIGN-OFF</Tag>
            <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500, marginTop: 8, lineHeight: 1.4 }}>
              Activating will notify {totalDonors.toLocaleString()} donors and shift the donor app into surge mode. Cannot be undone for 6h.
            </div>
            <Btn full size="lg" style={{ marginTop: 12, background: BL.surge, border: 'none', color: '#fff' }}
              onClick={() => setShowConfirm(true)}>
              Activate Surge Mode →
            </Btn>
            <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 6, textAlign: 'center' }}>
              REQUIRES · DIRECTOR LIM · DIRECTOR TAN
            </div>
          </div>
        </div>
      </div>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} w={460}>
        <Tag color={BL.surge}>FINAL CONFIRMATION · BREAK GLASS</Tag>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 8, letterSpacing: -0.3 }}>
          Activate Surge Mode for {s.surgeConfig.types.join(', ')}?
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 8, lineHeight: 1.55 }}>
          This will:
        </div>
        <ul style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink2, marginTop: 6, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Push surge alerts to {totalDonors.toLocaleString()} eligible donors</li>
          <li>Open +120 emergency slots across 4 blood banks</li>
          <li>Switch the donor app into surge mode</li>
          <li>Trigger HSA comms + on-call roster</li>
        </ul>
        <div style={{ marginTop: 14, padding: 12, background: BL.fill, borderRadius: 6 }}>
          <Tag color={BL.muted}>DUAL SIGN-OFF</Tag>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 3, background: BL.ink, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✓</div>
            <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink2 }}>Director Lim · signed 09:24</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 3, background: BL.ink, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✓</div>
            <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink2 }}>Director Tan · signed 09:25</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Btn variant="soft" color={BL.muted} onClick={() => setShowConfirm(false)}>Cancel</Btn>
          <Btn full size="lg" style={{ background: BL.surge, color: '#fff', border: 'none' }}
            onClick={() => {
              setShowConfirm(false);
              set({
                surgeActive: true,
                surgeActivatedAt: new Date().toISOString(),
                hsaToast: `Surge Mode activated · ${totalDonors.toLocaleString()} donors notified`,
              });
            }}>
            Confirm activation
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Surge live (shown after activation) ────────────────────────
function HSASurgeLive() {
  const { s, set } = useApp();
  // Animate response counter
  const [resp, setResp] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setResp((r) => r >= 142 ? r : r + Math.floor(Math.random() * 4) + 1), 700);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ padding: '20px 24px', height: '100%', overflowY: 'auto' }}>
      <div style={{
        padding: 18, background: BL.surgeBg, border: `2px solid ${BL.surge}`,
        borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <Tag color={BL.surge}>SURGE LIVE · O−</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 4, letterSpacing: -0.3 }}>
            6,020 donors notified · {resp} responses
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 4 }}>
            ACTIVATED {s.surgeActivatedAt ? new Date(s.surgeActivatedAt).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' }) : ''} · LOCK 6H
          </div>
        </div>
        <Btn variant="outline" color={BL.ink}
          onClick={() => set({ surgeActive: false, surgeActivatedAt: null, hsaToast: 'Surge Mode deactivated' })}>
          Deactivate (override)
        </Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { l: 'DONORS NOTIFIED', v: '6,020', s: 'push + SMS · 09:27' },
          { l: 'RESPONSES', v: resp.toLocaleString(), s: 'real-time', tone: 'critical' },
          { l: 'BOOKED', v: Math.floor(resp * 0.62).toString(), s: '~62% conversion' },
          { l: 'PROJ. 24H YIELD', v: '~890', s: 'on track' },
        ].map((k, i) => (
          <W key={i} pad={14}>
            <Tag color={BL.muted}>{k.l}</Tag>
            <div style={{ fontFamily: BL.mono, fontSize: 28, fontWeight: 600,
              color: k.tone === 'critical' ? BL.surge : BL.ink, marginTop: 4, letterSpacing: -0.6 }}>{k.v}</div>
            <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.muted, marginTop: 2 }}>{k.s}</div>
          </W>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <W pad={16}>
          <H size={14}>Response curve · live vs model</H>
          <div style={{ marginTop: 10 }}>
            <Spark w={420} h={140} points={[20, 60, 140, 280, 480, 680, 800, 870, 890]} color={BL.faint} />
            <div style={{ marginTop: -140 }}>
              <Spark w={420} h={140}
                points={Array.from({ length: 9 }).map((_, i) => Math.min(resp * (1 + i * 0.15), [20, 60, 140, 280, 480, 680, 800, 870, 890][i]))}
                color={BL.surge} />
            </div>
          </div>
        </W>
        <W pad={16}>
          <H size={14}>By bloodbank · live bookings</H>
          <div style={{ marginTop: 10 }}>
            {[
              ['Bloodbank@HSA', Math.floor(resp * 0.34), 120],
              ['Bloodbank@Dhoby Ghaut', Math.floor(resp * 0.22), 90],
              ['Bloodbank@Woodlands', Math.floor(resp * 0.16), 80],
              ['Bloodbank@Westgate', Math.floor(resp * 0.12), 70],
            ].map(([b, used, cap], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <span style={{ flex: '0 0 180px', fontFamily: BL.sans, fontSize: 12, color: BL.ink2 }}>{b}</span>
                <div style={{ flex: 1, height: 8, background: BL.hair, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (used / cap) * 100)}%`, height: '100%', background: BL.surge, transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, width: 60, textAlign: 'right' }}>{used}/{cap}</span>
              </div>
            ))}
          </div>
        </W>
      </div>
    </div>
  );
}

// ─── Donor pool (lightly interactive) ───────────────────────────
function HSADonorPool() {
  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>Donor pool · 184,210 total</div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
          Active retention curve vs at-risk segment. Filter to plan retention sends.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { l: 'ACTIVE · ≤12mo', v: '72,440', s: '39% of pool', tone: 'ok' },
          { l: 'DORMANT · 12–24mo', v: '54,180', s: '29% — reactivate', tone: 'low' },
          { l: 'AT-RISK · 24mo+', v: '38,920', s: '21% — churn imminent', tone: 'urgent' },
          { l: 'LAPSED · 36mo+', v: '18,670', s: '10% — archive', tone: 'critical' },
        ].map((k, i) => (
          <W key={i} pad={14}>
            <Tag color={BL.need[k.tone].fg} bg={BL.need[k.tone].bg}>{k.l}</Tag>
            <div style={{ fontFamily: BL.mono, fontSize: 24, fontWeight: 600, color: BL.ink, marginTop: 6, letterSpacing: -0.6 }}>{k.v}</div>
            <div style={{ fontFamily: BL.sans, fontSize: 11, color: BL.muted, marginTop: 2 }}>{k.s}</div>
          </W>
        ))}
      </div>
      <W pad={16}>
        <H size={14}>Mix by blood type</H>
        <div style={{ marginTop: 10 }}>
          {BLOOD_TYPES.map(({ t, n }, i) => {
            const w = [9, 38, 4, 25, 2, 14, 1, 7][i];
            return (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <BloodChip type={t} need={n} size="sm" />
                <div style={{ flex: 1, height: 6, background: BL.hair, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${w * 1.8}%`, height: '100%', background: BL.ink }} />
                </div>
                <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, width: 36, textAlign: 'right' }}>{w}%</span>
              </div>
            );
          })}
        </div>
        <Tag color={BL.muted} style={{ marginTop: 12, display: 'block' }}>VS NATIONAL POP. · O− IS 4.2% LOW</Tag>
      </W>
    </div>
  );
}

// ─── Drive queue (approve / decline) ────────────────────────────
function HSADriveQueue() {
  const { set } = useApp();
  const [reqs, setReqs] = useState([
    { id: 8120, org: 'DBS · Group Tech', loc: 'MBFC T3 · Marina Bay', date: 'Wed 20 May · 11:30–14:00', mem: '128 members · 14 O−', tone: 'critical', why: 'Surge-eligible · O− region high need', status: null },
    { id: 8121, org: 'NUS · UCC', loc: 'Kent Ridge', date: 'Thu 21 May · 11:00–18:00', mem: '412 members · 38 O−', tone: 'urgent', why: 'Repeat host · 96% delivery rate', status: null },
    { id: 8122, org: 'Tampines East RC', loc: 'Tampines St 21', date: 'Sat 23 May · 09:00–15:00', mem: '96 members · 9 O−', tone: 'urgent', why: 'Fills NE gap (red on map)', status: null },
    { id: 8123, org: 'Grab · Hubble', loc: 'Sin Ming', date: 'Mon 26 May · 13:00–19:00', mem: '380 members · 22 O−', tone: 'low', why: 'New host · needs onsite manager', status: null },
  ]);
  const act = (id, status) => {
    setReqs((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    set({ hsaToast: status === 'approved' ? 'Drive approved · captain notified' : 'Drive declined' });
  };

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>Community drive queue</div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
          {reqs.filter((r) => !r.status).length} pending · approve, decline, or merge with mobile-unit schedule.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {reqs.map((d) => (
          <W key={d.id} pad={16} style={{ opacity: d.status ? 0.7 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Tag color={BL.muted}>REQUEST · #{d.id}</Tag>
                <div style={{ fontFamily: BL.sans, fontSize: 15, color: BL.ink, fontWeight: 600, marginTop: 4 }}>{d.org}</div>
                <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 2 }}>{d.loc}</div>
              </div>
              {d.status ? (
                <Tag color={d.status === 'approved' ? BL.need.ok.fg : BL.muted}
                  bg={d.status === 'approved' ? BL.need.ok.bg : BL.fill}>{d.status.toUpperCase()}</Tag>
              ) : (
                <Tag color={BL.need[d.tone].fg} bg={BL.need[d.tone].bg}>{BL.need[d.tone].label} REGION</Tag>
              )}
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
              <Btn variant="outline" size="sm" color={BL.muted}
                disabled={!!d.status} onClick={() => act(d.id, 'declined')}>Decline</Btn>
              <Btn variant="outline" size="sm" color={BL.muted} disabled={!!d.status}>Ask edits</Btn>
              <Btn size="sm" color={BL.ink} style={{ marginLeft: 'auto', opacity: d.status ? 0.5 : 1 }}
                disabled={!!d.status} onClick={() => act(d.id, 'approved')}>Approve</Btn>
            </div>
          </W>
        ))}
      </div>
    </div>
  );
}

// ─── Hospital demand inbox (receives emergency requests from hospital portal) ──
function HSAHospitalDemand() {
  const { s, set } = useApp();
  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>Hospital demand</div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
          Live demand signals from hospital portals. Emergency draws trigger surge consideration.
        </div>
      </div>

      {s.hsaInbox.length > 0 && (
        <W pad={16} style={{ marginBottom: 14, background: BL.surgeBg, border: `1px solid ${BL.surge}55` }}>
          <Tag color={BL.surge}>NEW · EMERGENCY DRAW REQUEST</Tag>
          {s.hsaInbox.map((r, i) => (
            <div key={i} style={{ marginTop: 10, paddingTop: 10, borderTop: i ? `1px solid ${BL.surge}33` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 600 }}>{r.hospital} · {r.type} {r.units} units</div>
                  <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 4 }}>{r.reason} · {r.time}</div>
                </div>
                <BloodChip type={r.type} need="critical" size="md" />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <Btn size="sm" color={BL.surge} style={{ background: BL.surge, border: 'none', color: '#fff' }}
                  onClick={() => set({ hsaTab: 'surge', hsaToast: 'Pre-filled Surge for ' + r.type })}>Open Surge activator</Btn>
                <Btn size="sm" variant="outline" color={BL.ink}
                  onClick={() => set({ hsaToast: 'Dispatched 12 units from Bloodbank@HSA' })}>Dispatch from reserve</Btn>
                <Btn size="sm" variant="ghost" color={BL.muted}
                  onClick={() => set((cur) => ({ hsaInbox: cur.hsaInbox.filter((_, j) => j !== i) }))}>Dismiss</Btn>
              </div>
            </div>
          ))}
        </W>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { h: 'NUH', stock: '4.2d', tone: 'critical', sub: 'O− critical · 14 units' },
          { h: 'SGH', stock: '6.1d', tone: 'urgent', sub: 'B− low · scheduled cardiac' },
          { h: 'TTSH', stock: '8.4d', tone: 'low', sub: 'stable · routine demand' },
          { h: 'CGH', stock: '11.2d', tone: 'ok', sub: 'no concerns' },
          { h: 'KKH', stock: '9.8d', tone: 'ok', sub: 'plasma steady' },
          { h: 'NTFGH', stock: '7.1d', tone: 'low', sub: 'A+ dipping' },
        ].map((h, i) => (
          <W key={i} pad={14}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Tag color={BL.muted}>{h.h}</Tag>
                <div style={{ fontFamily: BL.mono, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 4, letterSpacing: -0.4 }}>{h.stock}</div>
                <Tag color={BL.muted}>OF DEMAND COVERAGE</Tag>
              </div>
              <Tag color={BL.need[h.tone].fg} bg={BL.need[h.tone].bg}>{BL.need[h.tone].label}</Tag>
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink2, marginTop: 10, lineHeight: 1.5 }}>{h.sub}</div>
          </W>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  HSADesktop, HSAForecast, HSASurgeActivator, HSADonorPool, HSADriveQueue, HSAHospitalDemand,
});
