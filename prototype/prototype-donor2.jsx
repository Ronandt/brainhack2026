// BloodLine — interactive donor screens (part 2): Drives, Impact, Profile, Mobilise

// ─── Drives tab ─────────────────────────────────────────────────
function DonorDrives() {
  const { s, set } = useApp();
  const [filter, setFilter] = useState('all');
  const dots = [
    { x: 79, y: 85, need: 'low', r: 8 },
    { x: 130, y: 91, need: 'critical', r: 10 },
    { x: 164, y: 89, need: 'urgent', r: 8 },
    { x: 213, y: 94, need: 'ok', r: 7 },
    { x: 249, y: 92, need: 'low', r: 9 },
  ];
  return (
    <React.Fragment>
      <AppHeader title="Drives near you" sub="32 ACTIVE · 4 WITHIN 5 KM" />
      <div style={{ padding: '0 0 70px', overflowY: 'auto', height: 'calc(100% - 56px - 56px)' }}>
        <div style={{ position: 'relative', margin: '0 16px 12px' }}>
          <SGMap w={328} h={170} dots={dots} />
          <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 6 }}>
            <Btn variant={filter === 'all' ? 'fill' : 'soft'} size="sm" color={filter === 'all' ? BL.ink : BL.muted}
              onClick={() => setFilter('all')}>All types</Btn>
            <Btn variant={filter === 'near' ? 'fill' : 'soft'} size="sm" color={filter === 'near' ? BL.ink : BL.muted}
              onClick={() => setFilter('near')}>Within 5 km</Btn>
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>
          <Tag color={BL.muted}>THIS WEEK · {filter === 'near' ? '4' : '12'} DRIVES</Tag>
          {DRIVES.filter((d) => filter === 'all' || ['d1', 'd4'].includes(d.id)).map((d) => {
            const rsvp = s.driveRsvps[d.id];
            return (
              <W key={d.id} pad={12} style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>{d.org}</div>
                    <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 4, letterSpacing: 0.4 }}>{d.when}</div>
                  </div>
                  <Tag color={BL.muted} bg={BL.fill}>{d.tag}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>{d.slots} slots</span>
                  {rsvp === 'going' ? (
                    <Tag color={BL.need.ok.fg} bg={BL.need.ok.bg}>✓ GOING</Tag>
                  ) : (
                    <Btn variant="outline" size="sm" color={BL.ink}
                      onClick={() => set((cur) => ({
                        driveRsvps: { ...cur.driveRsvps, [d.id]: 'going' },
                        toast: `RSVP'd to ${d.org}`,
                      }))}>RSVP</Btn>
                  )}
                </div>
              </W>
            );
          })}
        </div>

        <div style={{ padding: '20px 16px 0' }}>
          <W pad={14} style={{ background: BL.fill, borderStyle: 'dashed' }}>
            <Tag color={BL.muted}>HOST A DRIVE</Tag>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500, marginTop: 4 }}>
              Mobilise your workplace, school, or RC
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 4, lineHeight: 1.5 }}>
              We'll coordinate a mobile unit with HSA on your behalf.
            </div>
            <Btn variant="outline" size="sm" color={BL.ink} style={{ marginTop: 10 }}
              onClick={() => set({ donorScreen: 'mobilise' })}>Start a drive →</Btn>
          </W>
        </div>
      </div>
    </React.Fragment>
  );
}

// ─── Impact tab ─────────────────────────────────────────────────
function DonorImpact() {
  const { s, set } = useApp();
  const upcomingBooking = s.bookedSlot;
  return (
    <React.Fragment>
      <AppHeader title="Your impact" sub="LIFETIME · 12 DONATIONS" />
      <div style={{ padding: '0 16px 70px', overflowY: 'auto', height: 'calc(100% - 56px - 56px)' }}>

        {upcomingBooking && (
          <W pad={14} style={{ marginBottom: 12, background: BL.fill, borderColor: BL.ink }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Tag color={BL.muted}>UPCOMING · TODAY</Tag>
                <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 600, marginTop: 4 }}>
                  {upcomingBooking.time} · {upcomingBooking.venue.replace('Bloodbank@', '')}
                </div>
              </div>
              <Btn variant="outline" size="sm" color={BL.ink} onClick={() => set({ donorTab: 'home' })}>View</Btn>
            </div>
          </W>
        )}

        <W pad={16} style={{ marginBottom: 12 }}>
          <Tag color={BL.muted}>LAST DONATION · 14 MAR 2026</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 18, fontWeight: 600, color: BL.ink, lineHeight: 1.3, marginTop: 6, letterSpacing: -0.2 }}>
            Your unit supported <span style={{ color: BL.red }}>3 patients</span> at <span style={{ color: BL.red }}>NUH</span>.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Slot height={56} style={{ flex: 1 }} dashed={false}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: BL.mono, fontSize: 18, color: BL.ink, fontWeight: 600 }}>1</div>
                <Tag>RBC unit</Tag>
              </div>
            </Slot>
            <Slot height={56} style={{ flex: 1 }} dashed={false}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: BL.mono, fontSize: 18, color: BL.ink, fontWeight: 600 }}>2</div>
                <Tag>plasma</Tag>
              </div>
            </Slot>
            <Slot height={56} style={{ flex: 1 }} dashed={false}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: BL.mono, fontSize: 18, color: BL.ink, fontWeight: 600 }}>1</div>
                <Tag>platelets</Tag>
              </div>
            </Slot>
          </div>
        </W>

        <W pad={16} style={{ marginBottom: 12 }}>
          <Tag color={BL.muted}>LIFETIME</Tag>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'baseline' }}>
            <div>
              <div style={{ fontFamily: BL.mono, fontSize: 32, fontWeight: 600, color: BL.ink, letterSpacing: -0.8 }}>12</div>
              <Tag>donations</Tag>
            </div>
            <div>
              <div style={{ fontFamily: BL.mono, fontSize: 32, fontWeight: 600, color: BL.ink, letterSpacing: -0.8 }}>36</div>
              <Tag>lives reached</Tag>
            </div>
            <div>
              <div style={{ fontFamily: BL.mono, fontSize: 32, fontWeight: 600, color: BL.ink, letterSpacing: -0.8 }}>5.4L</div>
              <Tag>given</Tag>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Tag color={BL.muted}>DONATIONS PER YEAR · 2021–2026</Tag>
            <div style={{ marginTop: 6 }}>
              <Bars data={[1, 2, 3, 2, 2, 2]} w={296} h={48} />
            </div>
          </div>
        </W>

        <W pad={12}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Tag color={BL.muted}>HSA MILESTONES</Tag>
            <Tag color={BL.faint}>next: 25 (silver)</Tag>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
            {[
              { n: '10', l: 'Bronze', got: true },
              { n: '25', l: 'Silver', got: false, current: true },
              { n: '50', l: 'Gold', got: false },
              { n: '100', l: 'Hon.', got: false },
            ].map((m, i) => (
              <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: 48, height: 48, margin: '0 auto', borderRadius: 24,
                  border: `1.5px ${m.got ? 'solid' : m.current ? 'dashed' : 'solid'} ${m.got ? BL.ink : m.current ? BL.red : BL.hair}`,
                  background: m.got ? BL.ink : 'transparent',
                  color: m.got ? '#fff' : BL.faint,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: BL.mono, fontSize: 14, fontWeight: 600,
                }}>{m.n}</div>
                <div style={{ fontFamily: BL.sans, fontSize: 10, color: m.current ? BL.red : BL.muted, marginTop: 4, fontWeight: 500 }}>{m.l}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, height: 6, background: BL.hair, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: '48%', height: '100%', background: BL.ink }} />
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 6, textAlign: 'right' }}>
            12 / 25 · 13 to silver
          </div>
        </W>
      </div>
    </React.Fragment>
  );
}

// ─── Profile tab ────────────────────────────────────────────────
function DonorProfile() {
  const { s, set } = useApp();
  const cycleVal = (cur, opts) => {
    const i = opts.indexOf(cur);
    return opts[(i + 1) % opts.length];
  };
  const NOTIF_OPTIONS = {
    surgeOwn: ['Always', 'Within 15 km', 'Off'],
    surgeCompat: ['Within 5 km', 'Within 15 km', 'Off'],
    drives: ['On', 'Weekly digest', 'Off'],
    weekly: ['Sundays', 'Mondays', 'Off'],
    cap: ['On', 'Off'],
  };
  return (
    <React.Fragment>
      <AppHeader title="You" />
      <div style={{ padding: '0 16px 70px', overflowY: 'auto', height: 'calc(100% - 56px - 56px)' }}>
        <W pad={16} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: BL.fill, border: `1px solid ${BL.hair}`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 600, color: BL.ink }}>Tan Wei Ming</div>
              <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>#SG-44182 · since 2021</div>
            </div>
            <BloodChip type="O−" need="critical" size="md" />
          </div>
          <div style={{ marginTop: 14, padding: 10, background: BL.fill, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Tag color={BL.muted}>NEXT ELIGIBLE</Tag>
            <span style={{ fontFamily: BL.mono, fontSize: 12, color: BL.ink, fontWeight: 600 }}>Eligible now</span>
          </div>
        </W>

        <W pad={12} style={{ marginBottom: 12 }}>
          <Tag color={BL.muted}>SQUADS</Tag>
          {[
            { l: 'DBS · Group Tech', rank: '#3', total: '42 donations' },
            { l: 'NUS Alumni · CompSci', rank: '#14', total: '180 donations' },
            { l: 'Tampines East RC', rank: '#7', total: '64 donations' },
          ].map((sq, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderTop: i ? `1px solid ${BL.hair}` : 'none' }}>
              <div>
                <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>{sq.l}</div>
                <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>{sq.total}</div>
              </div>
              <span style={{ fontFamily: BL.mono, fontSize: 14, color: BL.ink, fontWeight: 600 }}>{sq.rank}</span>
            </div>
          ))}
        </W>

        <W pad={12} style={{ marginBottom: 12 }}>
          <Tag color={BL.muted}>STREAK</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 4, letterSpacing: -0.4 }}>
            5 donations in a row
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} style={{ flex: 1, height: 28, borderRadius: 3, background: i <= 5 ? BL.ink : BL.fill }} />
            ))}
          </div>
        </W>

        <W pad={12}>
          <Tag color={BL.muted}>NOTIFICATIONS · TAP TO CYCLE</Tag>
          {[
            ['Surge alerts (your type)', 'surgeOwn'],
            ['Surge alerts (compatible)', 'surgeCompat'],
            ['Drive reminders', 'drives'],
            ['Weekly recap', 'weekly'],
            ['Cap: max 3 / week', 'cap'],
          ].map(([l, k], i) => (
            <button key={k} onClick={() => set((cur) => ({
              notif: { ...cur.notif, [k]: cycleVal(cur.notif[k], NOTIF_OPTIONS[k]) },
            }))} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '10px 0', borderTop: i ? `1px solid ${BL.hair}` : 'none',
              border: i ? `1px solid ${BL.hair}` : 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
              background: 'none', textAlign: 'left', cursor: 'pointer',
            }}>
              <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink }}>{l}</span>
              <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>{s.notif[k]} ▸</span>
            </button>
          ))}
        </W>
      </div>
    </React.Fragment>
  );
}

// ─── Mobilise flow ──────────────────────────────────────────────
function DonorMobilise() {
  const { s, set } = useApp();

  if (s.mobStep === 1) return <MobiliseStep1 />;
  if (s.mobStep === 2) return <MobiliseStep2 />;
  if (s.mobStep === 3) return <MobiliseStep3 />;
  return <MobiliseTracker />;
}

function MobiliseBack({ to }) {
  const { set } = useApp();
  return (
    <Btn variant="ghost" size="sm" color={BL.ink}
      onClick={() => to === 'exit' ? set({ donorScreen: null, mobStep: 1 }) : set({ mobStep: to })}>← Back</Btn>
  );
}

function MobiliseStep1() {
  const { s, set } = useApp();
  const orgs = [
    { l: 'DBS · Group Tech', sub: '128 members · 14 O− eligible' },
    { l: 'NUS Alumni · CompSci', sub: '412 members · 38 O− eligible' },
    { l: 'Tampines East RC', sub: '96 members · 9 O− eligible' },
  ];
  return (
    <React.Fragment>
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <MobiliseBack to="exit" /><Tag>STEP 1 / 4</Tag>
      </div>
      <div style={{ padding: '12px 16px 110px', overflowY: 'auto', height: 'calc(100% - 60px - 56px)' }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>
          Who do you want to mobilise?
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6, lineHeight: 1.5 }}>
          You'll send a one-tap invite to your squad. We'll handle scheduling with HSA.
        </div>
        <div style={{ marginTop: 18 }}>
          {orgs.map((o, i) => {
            const sel = s.mobOrg === o.l;
            return (
              <button key={o.l} onClick={() => set({ mobOrg: o.l })}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: 14, marginBottom: 8, borderRadius: 8,
                  border: `${sel ? 2 : 1}px solid ${sel ? BL.ink : BL.hair}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#fff', cursor: 'pointer',
                }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9,
                  border: `2px solid ${sel ? BL.ink : BL.faint}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {sel && <div style={{ width: 8, height: 8, borderRadius: 4, background: BL.ink }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>{o.l}</div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>{o.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
        <Btn full size="lg" color={BL.ink} onClick={() => set({ mobStep: 2 })}>Continue → Set time</Btn>
      </div>
    </React.Fragment>
  );
}

function MobiliseStep2() {
  const { s, set } = useApp();
  const times = [
    { d: 'Tomorrow', t: 'Lunch · 11:30–14:00', cap: 'Mobile unit on-site' },
    { d: 'Thu 21 May', t: 'Lunch · 11:30–14:00', cap: 'Mobile unit on-site' },
    { d: 'Fri 22 May', t: 'After work · 17:00–19:30', cap: 'Bloodbank@HSA (2.4 km)' },
  ];
  return (
    <React.Fragment>
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <MobiliseBack to={1} /><Tag>STEP 2 / 4</Tag>
      </div>
      <div style={{ padding: '12px 16px 110px', overflowY: 'auto', height: 'calc(100% - 60px - 56px)' }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>
          When works for your team?
        </div>
        <div style={{ marginTop: 16 }}>
          <Tag color={BL.muted}>SUGGESTED · BASED ON HSA CAPACITY</Tag>
          {times.map((tm) => {
            const sel = s.mobTime.d === tm.d;
            return (
              <button key={tm.d} onClick={() => set({ mobTime: tm })} style={{
                width: '100%', textAlign: 'left',
                padding: 12, marginTop: 8, borderRadius: 8,
                border: `${sel ? 2 : 1}px solid ${sel ? BL.ink : BL.hair}`,
                background: '#fff', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>{tm.d}</div>
                  <Tag>{tm.cap}</Tag>
                </div>
                <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 4 }}>{tm.t}</div>
              </button>
            );
          })}
          <div style={{ marginTop: 16 }}>
            <Tag color={BL.muted}>LOCATION</Tag>
            <W pad={12} style={{ marginTop: 6 }}>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>DBS Asia Central · MBFC Tower 3 lobby</div>
              <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 4 }}>12 MARINA BLVD · LEVEL 1</div>
            </W>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
        <Btn full size="lg" color={BL.ink} onClick={() => set({ mobStep: 3 })}>Continue → Draft invite</Btn>
      </div>
    </React.Fragment>
  );
}

function MobiliseStep3() {
  const { s, set } = useApp();
  return (
    <React.Fragment>
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <MobiliseBack to={2} /><Tag>STEP 3 / 4</Tag>
      </div>
      <div style={{ padding: '12px 16px 110px', overflowY: 'auto', height: 'calc(100% - 60px - 56px)' }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>
          Review the invite
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6, lineHeight: 1.5 }}>
          We'll send this via WhatsApp + email to 128 members of <b style={{ color: BL.ink }}>{s.mobOrg}</b>. Reply RSVP in one tap.
        </div>
        <W pad={14} style={{ marginTop: 16, background: BL.fill }}>
          <Tag color={BL.muted}>PREVIEW</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 600, marginTop: 4 }}>
            {s.mobOrg.split(' · ')[1] || 'Team'} · let's give blood {s.mobTime.d.toLowerCase()}
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink2, lineHeight: 1.55, marginTop: 6 }}>
            Wei Ming is organising a drive at MBFC T3 lobby, {s.mobTime.t.replace('Lunch · ', '').replace('After work · ', '')}. O− is currently at <b>critical</b> nationally. Tap to RSVP — it's about 15 minutes.
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <Tag color={BL.ink} bg="#fff">I'm in</Tag>
            <Tag color={BL.muted} bg="#fff">Maybe</Tag>
            <Tag color={BL.muted} bg="#fff">Can't</Tag>
          </div>
        </W>
        <div style={{ marginTop: 14 }}>
          <Tag color={BL.muted}>TARGET</Tag>
          <W pad={12} style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink2 }}>14 O− eligible · 128 total members</span>
              <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>WE NEED 18 RSVPs</span>
            </div>
            <div style={{ height: 6, background: BL.hair, borderRadius: 3 }} />
          </W>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 16, right: 16, display: 'flex', gap: 8 }}>
        <Btn variant="outline" color={BL.ink}>Edit copy</Btn>
        <Btn full size="lg" color={BL.ink} onClick={() => set({ mobStep: 4, toast: 'Invite sent to 128 members' })}>Send invite</Btn>
      </div>
    </React.Fragment>
  );
}

function MobiliseTracker() {
  const { s, set } = useApp();
  // Animate RSVPs trickling in
  const [counts, setCounts] = useState({ going: 4, maybe: 2, decline: 1, noreply: 121 });
  useEffect(() => {
    const id = setInterval(() => {
      setCounts((c) => {
        if (c.noreply <= 93) return c;
        const r = Math.random();
        if (r < 0.5)      return { ...c, going: c.going + 1,   noreply: c.noreply - 1 };
        else if (r < 0.8) return { ...c, maybe: c.maybe + 1,   noreply: c.noreply - 1 };
        else              return { ...c, decline: c.decline + 1,noreply: c.noreply - 1 };
      });
    }, 700);
    return () => clearInterval(id);
  }, []);
  const target = 18;
  const ahead = Math.max(0, counts.going - target);
  return (
    <React.Fragment>
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn variant="ghost" size="sm" color={BL.ink}
          onClick={() => set({ donorScreen: null, donorTab: 'drives', mobStep: 1 })}>← Drives</Btn>
        <Tag>LIVE · STEP 4 / 4</Tag>
      </div>
      <div style={{ padding: '12px 16px 70px', overflowY: 'auto', height: 'calc(100% - 60px - 56px)' }}>
        <Tag color={BL.muted}>YOUR DRIVE · {s.mobTime.d.toUpperCase()} · MBFC T3</Tag>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2, marginTop: 4 }}>
          {counts.going} going · {counts.maybe} maybe
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          {counts.going >= target ? (
            <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.need.ok.fg, fontWeight: 600 }}>↑ {ahead} ahead of target</span>
          ) : (
            <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.need.urgent.fg, fontWeight: 600 }}>↓ {target - counts.going} below target</span>
          )}
          <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>· live</span>
        </div>

        <W pad={12} style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Tag color={BL.muted}>RSVPS · {counts.going + counts.maybe + counts.decline} / {target} NEEDED</Tag>
            <span style={{ fontFamily: BL.mono, fontSize: 10, color: counts.going >= target ? BL.need.ok.fg : BL.muted, fontWeight: 600 }}>
              {Math.round((counts.going / target) * 100)}%
            </span>
          </div>
          <div style={{ height: 8, background: BL.hair, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (counts.going / target) * 100)}%`, height: '100%',
              background: counts.going >= target ? BL.need.ok.fg : BL.ink,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>
            <span>{counts.going} going</span><span>{counts.maybe} maybe</span><span>{counts.decline} declined</span><span>{counts.noreply} no reply</span>
          </div>
        </W>

        <W pad={12} style={{ marginTop: 10 }}>
          <Tag color={BL.muted}>RSVPS BY TYPE</Tag>
          <div style={{ marginTop: 10 }}>
            {[
              { t: 'O−', going: Math.min(6, counts.going), eligible: 14, need: 'critical' },
              { t: 'O+', going: Math.min(5, counts.going), eligible: 28, need: 'low' },
              { t: 'A+', going: Math.min(4, counts.going), eligible: 32, need: 'ok' },
              { t: 'B+', going: Math.min(3, counts.going), eligible: 24, need: 'ok' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <BloodChip type={r.t} need={r.need} size="sm" />
                <div style={{ flex: 1, height: 6, background: BL.hair, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(r.going / r.eligible) * 100}%`, height: '100%', background: BL.ink, transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, minWidth: 50, textAlign: 'right' }}>{r.going}/{r.eligible}</span>
              </div>
            ))}
          </div>
        </W>

        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <Btn full variant="outline" color={BL.ink} onClick={() => set({ toast: 'Nudged 93 no-replies' })}>Nudge no-replies</Btn>
          <Btn full variant="outline" color={BL.ink} onClick={() => set({ toast: 'Shared to channels' })}>Share</Btn>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, {
  DonorDrives, DonorImpact, DonorProfile, DonorMobilise,
});
