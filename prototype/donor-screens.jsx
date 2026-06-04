// BloodLine — donor app screens (mobile)
// Mid-fi wireframes. Phone bezel ~360×720 inside artboards of ~380×760.

// Minimal phone bezel for wireframes (lighter than IOSDevice liquid-glass)
function Phone({ children, w = 360, h = 720, title, time = '9:41' }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 36, background: '#111',
      padding: 8, boxShadow: '0 1px 0 rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.08)',
      position: 'relative', boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 28,
        background: BL.paper, overflow: 'hidden', position: 'relative',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* status bar */}
        <div style={{
          height: 32, padding: '8px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', fontFamily: BL.mono, fontSize: 10,
          color: BL.ink, fontWeight: 600
        }}>
          <span>{time}</span>
          <span style={{ color: BL.muted }}>●●● ⌃ ▮</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {children}
        </div>
        {/* home indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
          <div style={{ width: 110, height: 4, borderRadius: 2, background: BL.ink, opacity: 0.5 }} />
        </div>
      </div>
    </div>);

}

// App header with subtle BloodLine wordmark
function AppHeader({ title, sub, right }) {
  return (
    <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        {sub && <Tag>{sub}</Tag>}
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, marginTop: sub ? 2 : 0 }}>
          {title}
        </div>
      </div>
      {right}
    </div>);

}

function TabBar({ active = 'home' }) {
  const items = [
  { k: 'home', l: 'Home' },
  { k: 'drives', l: 'Drives' },
  { k: 'impact', l: 'Impact' },
  { k: 'profile', l: 'You' }];

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 56, background: BL.card, borderTop: `1px solid ${BL.hair}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      paddingBottom: 8
    }}>
      {items.map((i) =>
      <div key={i.k} style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
          width: 22, height: 22, margin: '0 auto 2px',
          border: `1.5px solid ${active === i.k ? BL.ink : BL.faint}`,
          borderRadius: 4
        }} />
          <div style={{ fontFamily: BL.sans, fontSize: 10, fontWeight: 500,
          color: active === i.k ? BL.ink : BL.faint }}>{i.l}</div>
        </div>
      )}
    </div>);

}

// ─── ONBOARDING ──────────────────────────────────────────────────
function Onboarding() {
  return (
    <Phone>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
        <Tag>BloodLine · 02 / 03</Tag>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Slot height={220} label="ILLUSTRATION · three-mode diagram" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: BL.mono, fontSize: 10 }}>
              <span style={{ color: BL.muted }}>PREDICT</span>
              <span style={{ color: BL.faint }}>→</span>
              <span style={{ color: BL.red, fontWeight: 600 }}>SURGE</span>
              <span style={{ color: BL.faint }}>→</span>
              <span style={{ color: BL.muted }}>RETAIN</span>
            </div>
          </Slot>
          <div style={{ fontFamily: BL.sans, fontSize: 24, fontWeight: 600, color: BL.ink, lineHeight: 1.2, letterSpacing: -0.4 }}>
            We call when the supply runs low.
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.muted, marginTop: 10, lineHeight: 1.5 }}>
            BloodLine works alongside HSA DonateBlood to predict shortages, mobilise donors during crises, and bring you back when it matters.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: BL.faint }} />
          <div style={{ width: 18, height: 6, borderRadius: 3, background: BL.ink }} />
          <div style={{ width: 6, height: 6, borderRadius: 3, background: BL.faint }} />
        </div>
        <Btn full size="lg" variant="fill" color={BL.ink}>Continue with Singpass</Btn>
        <Btn full size="md" variant="ghost" color={BL.muted} style={{ marginTop: 8 }}>I have an existing donor card</Btn>
      </div>
    </Phone>);

}

// ─── HOME A — single 'your type' hero + small national rail ──────
function HomeA() {
  return (
    <Phone>
      <AppHeader sub="BLOODLINE" title="Tan Wei Ming" right={
      <div style={{ width: 32, height: 32, borderRadius: 16, background: BL.fill, border: `1px solid ${BL.hair}` }} />
      } />
      <div style={{ padding: '0 16px 80px', overflowY: 'auto', height: 'calc(100% - 56px - 64px)' }}>
        {/* Eligibility card */}
        <W pad={16} style={{ marginBottom: 12 }}>
          <Tag color={BL.muted}>ELIGIBILITY</Tag>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: "center" }}>
            <span style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.3 }}>
              You can donate
            </span>
            <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.need.ok.fg,
              background: BL.need.ok.bg, padding: '2px 6px', borderRadius: 3 }}>NOW</span>
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 4 }}>
            Last donation 14 Mar 2026 · whole blood
          </div>
        </W>

        {/* National need hero */}
        <W pad={16} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <Tag color={BL.muted}>YOUR TYPE · NATIONAL NEED</Tag>
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, marginTop: 2 }}>
                Updated 9:38 AM · HSA
              </div>
            </div>
            <Tag color={BL.need.critical.fg} bg={BL.need.critical.bg}>Critical</Tag>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '14px 0 6px' }}>
            <BloodChip type="O−" need="critical" size="xl" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>
                4.2 days of supply
              </div>
              <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, lineHeight: 1.45, marginTop: 4 }}>
                O− is universal. NUH + SGH demand outpaces donations through Friday.
              </div>
            </div>
          </div>
          <Btn full size="lg" color={BL.ink} style={{ marginTop: 10 }}>Book a slot</Btn>
        </W>

        {/* National rail */}
        <W pad={12} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Tag color={BL.muted}>ALL TYPES</Tag>
            <Tag color={BL.faint}>tap for forecast</Tag>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {BLOOD_TYPES.map(({ t, n }) =>
            <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <BloodChip type={t} need={n} size="sm" selected={t === 'O−'} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, fontFamily: BL.mono, fontSize: 9, color: BL.faint }}>
            <span>● ok</span><span>● low</span><span>● urgent</span><span>● critical</span>
          </div>
        </W>

        {/* Next steps */}
        <W pad={12} style={{ marginBottom: 12 }}>
          <Tag color={BL.muted}>NEAREST AVAILABILITY</Tag>
          {[
          ['Bloodbank@HSA', '11:20 AM today', '2.4 km'],
          ['Bloodbank@Dhoby Ghaut', '12:40 PM today', '6.1 km'],
          ['Bloodbank@Woodlands', '3:00 PM today', '14 km']].
          map((r, i) =>
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderTop: i ? `1px solid ${BL.hair}` : 'none'
          }}>
              <div>
                <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>{r[0]}</div>
                <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 2 }}>{r[1]} · {r[2]}</div>
              </div>
              <Btn variant="outline" size="sm" color={BL.ink}>Book</Btn>
            </div>
          )}
        </W>
      </div>
      <TabBar active="home" />
    </Phone>);

}

// ─── HOME B — same data, different IA (flow-style timeline) ──────
function HomeB() {
  return (
    <Phone>
      <AppHeader sub="GOOD MORNING" title="Hi, Wei Ming" />
      <div style={{ padding: '0 16px 80px', overflowY: 'auto', height: 'calc(100% - 56px - 64px)' }}>
        {/* Vertical answer-the-question stack */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: BL.ink }} />
            <div style={{ width: 1, flex: 1, background: BL.hair, marginTop: 4, minHeight: 80 }} />
          </div>
          <div style={{ flex: 1 }}>
            <Tag color={BL.muted}>CAN I DONATE?</Tag>
            <div style={{ fontFamily: BL.sans, fontSize: 28, fontWeight: 600, color: BL.ink, letterSpacing: -0.6, lineHeight: 1.1, marginTop: 2 }}>
              Yes — today.
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6, lineHeight: 1.5 }}>
              You're eligible. 84 days since your last donation.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: BL.red }} />
            <div style={{ width: 1, flex: 1, background: BL.hair, marginTop: 4, minHeight: 180 }} />
          </div>
          <div style={{ flex: 1 }}>
            <Tag color={BL.muted}>IS IT NEEDED?</Tag>
            <div style={{ fontFamily: BL.sans, fontSize: 28, fontWeight: 600, color: BL.ink, letterSpacing: -0.6, lineHeight: 1.1, marginTop: 2 }}>
              Critically.
            </div>
            <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6, lineHeight: 1.5, marginBottom: 12 }}>
              Your type, O−, is at <b style={{ color: BL.redInk }}>4.2 days</b> of supply. National levels:
            </div>
            <W pad={10}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
                {BLOOD_TYPES.map(({ t, n }) =>
                <BloodChip key={t} type={t} need={n} size="sm" selected={t === 'O−'} />
                )}
              </div>
            </W>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: BL.ink }} />
          </div>
          <div style={{ flex: 1 }}>
            <Tag color={BL.muted}>WHEN CAN I GO?</Tag>
            <W pad={12} style={{ marginTop: 6 }}>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>
                Bloodbank@HSA · 2.4 km
              </div>
              <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 4 }}>
                NEAREST OPEN SLOT · 11:20 AM TODAY
              </div>
              <Btn full size="lg" color={BL.ink} style={{ marginTop: 10 }}>Book 11:20</Btn>
              <Btn full size="sm" variant="ghost" color={BL.muted} style={{ marginTop: 4 }}>See other times</Btn>
            </W>
          </div>
        </div>
      </div>
      <TabBar active="home" />
    </Phone>);

}

// ─── SURGE ALERT — the hero screen ───────────────────────────────
function SurgeAlert() {
  return (
    <Phone>
      {/* Distinct mode shift: subtle red banner across the top */}
      <div style={{
        background: BL.surgeBg, borderBottom: `1px solid ${BL.surge}33`,
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: BL.surge, boxShadow: `0 0 0 4px ${BL.surge}22` }} />
        <Tag color={BL.surge}>SURGE MODE · ACTIVATED 11 MIN AGO</Tag>
      </div>

      <div style={{ padding: '20px 20px 80px', overflowY: 'auto', height: 'calc(100% - 80px)' }}>
        <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.8 }}>
          HSA NATIONAL ALERT · 18 MAY · 09:27
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 30, fontWeight: 600, color: BL.ink, lineHeight: 1.05, letterSpacing: -0.8, marginTop: 8 }}>
          O− is needed today.
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 15, color: BL.ink2, lineHeight: 1.5, marginTop: 10 }}>
          A multi-casualty incident along the AYE has drawn down national O− reserves. We're calling 4,200 eligible donors within 15 km.
        </div>

        {/* Single, clear action */}
        <div style={{ marginTop: 18, padding: 16, background: BL.surgeBg,
          border: `1px solid ${BL.surge}55`, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: BL.sans, fontSize: 15, color: BL.ink, fontWeight: 600 }}>
                Bloodbank@HSA
              </div>
              <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 4 }}>
                2.4 KM · OUTRAM
              </div>
            </div>
            <BloodChip type="O−" need="critical" size="lg" />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tag color={BL.ink} bg={BL.card}>11:20 AM</Tag>
            <Tag color={BL.ink} bg={BL.card}>11:40 AM</Tag>
            <Tag color={BL.ink} bg={BL.card}>12:00 PM</Tag>
            <Tag color={BL.muted}>+18 more · next 24h</Tag>
          </div>
          <Btn full size="lg" style={{ marginTop: 14, background: BL.surge, color: '#fff', border: 'none' }}>
            Book 11:20 AM
          </Btn>
        </div>

        {/* Secondary actions */}
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <Btn full variant="outline" color={BL.ink}>Mobilise my workplace</Btn>
          <Btn variant="soft" color={BL.muted}>Snooze 2h</Btn>
        </div>

        {/* Why I got this */}
        <div style={{ marginTop: 16, padding: 12, border: `1px solid ${BL.hair}`, borderRadius: 6 }}>
          <Tag color={BL.muted}>WHY YOU GOT THIS</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink2, lineHeight: 1.55, marginTop: 6 }}>
            You're <b>O−</b>, eligible, and within the 15 km tier. You can opt out of surge alerts in Profile · Notifications.
          </div>
        </div>
      </div>
      <TabBar active="home" />
    </Phone>);

}

// ─── COMMUNITY DRIVES (map + list) ────────────────────────────────
function Drives() {
  const dots = [
  { x: 96, y: 110, need: 'low', r: 8 },
  { x: 158, y: 118, need: 'critical', r: 10 },
  { x: 200, y: 116, need: 'urgent', r: 8 },
  { x: 260, y: 122, need: 'ok', r: 7 },
  { x: 304, y: 120, need: 'low', r: 9 }];

  return (
    <Phone>
      <AppHeader title="Drives near you" sub="32 ACTIVE · 4 WITHIN 5 KM" />
      <div style={{ padding: '0 0 64px', overflowY: 'auto', height: 'calc(100% - 56px - 70px)' }}>
        <div style={{ position: 'relative', margin: '0 16px 12px' }}>
          <SGMap w={328} h={170} dots={dots.map((d) => ({ ...d, x: d.x * 0.82, y: d.y * 0.77 }))} />
          <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8,
            display: 'flex', gap: 6 }}>
            <Btn variant="soft" size="sm" color={BL.muted}>All types</Btn>
            <Btn variant="soft" size="sm" color={BL.muted}>Within 5 km</Btn>
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>
          <Tag color={BL.muted}>THIS WEEK · 12 DRIVES</Tag>
          {[
          { org: 'DBS @ MBFC', when: 'Tomorrow · 10:00–17:00', slots: '14 / 80', tag: 'Workplace' },
          { org: 'NUS · Univ. Cultural Centre', when: 'Thu 21 May · 11:00–18:00', slots: '32 / 120', tag: 'School' },
          { org: 'Tampines East RC', when: 'Sat 23 May · 09:00–15:00', slots: 'open', tag: 'Community' },
          { org: 'Grab @ Hubble', when: 'Mon 26 May · 13:00–19:00', slots: '8 / 60', tag: 'Workplace' }].
          map((d, i) =>
          <W key={i} pad={12} style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>{d.org}</div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 4, letterSpacing: 0.4 }}>{d.when}</div>
                </div>
                <Tag color={BL.muted} bg={BL.fill}>{d.tag}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>{d.slots} slots</span>
                <Btn variant="outline" size="sm" color={BL.ink}>RSVP</Btn>
              </div>
            </W>
          )}
        </div>
      </div>
      <TabBar active="drives" />
    </Phone>);

}

// ─── IMPACT DASHBOARD ────────────────────────────────────────────
function Impact() {
  return (
    <Phone>
      <AppHeader title="Your impact" sub="LIFETIME · 12 DONATIONS" />
      <div style={{ padding: '0 16px 80px', overflowY: 'auto', height: 'calc(100% - 56px - 64px)' }}>
        {/* Personal impact card */}
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

        {/* Lifetime stats */}
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
              <Tag>blood given</Tag>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Tag color={BL.muted}>DONATIONS PER YEAR · 2021–2026</Tag>
            <div style={{ marginTop: 6 }}>
              <Bars data={[1, 2, 3, 2, 2, 2]} w={296} h={48} />
            </div>
          </div>
        </W>

        {/* Milestone badges */}
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
            { n: '100', l: 'Hon.', got: false }].
            map((m, i) =>
            <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                width: 48, height: 48, margin: '0 auto', borderRadius: 24,
                border: `1.5px ${m.got ? 'solid' : m.current ? 'dashed' : 'solid'} ${m.got ? BL.ink : m.current ? BL.red : BL.hair}`,
                background: m.got ? BL.ink : 'transparent',
                color: m.got ? '#fff' : BL.faint,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: BL.mono, fontSize: 14, fontWeight: 600
              }}>{m.n}</div>
                <div style={{ fontFamily: BL.sans, fontSize: 10, color: m.current ? BL.red : BL.muted, marginTop: 4, fontWeight: 500 }}>{m.l}</div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, height: 6, background: BL.hair, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: '48%', height: '100%', background: BL.ink }} />
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 6, textAlign: 'right' }}>
            12 / 25 · 13 to silver
          </div>
        </W>
      </div>
      <TabBar active="impact" />
    </Phone>);

}

// ─── PROFILE ─────────────────────────────────────────────────────
function Profile() {
  return (
    <Phone>
      <AppHeader title="You" />
      <div style={{ padding: '0 16px 80px', overflowY: 'auto', height: 'calc(100% - 56px - 64px)' }}>
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
          { l: 'Tampines East RC', rank: '#7', total: '64 donations' }].
          map((s, i) =>
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderTop: i ? `1px solid ${BL.hair}` : 'none' }}>
              <div>
                <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>{s.l}</div>
                <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>{s.total}</div>
              </div>
              <span style={{ fontFamily: BL.mono, fontSize: 14, color: BL.ink, fontWeight: 600 }}>{s.rank}</span>
            </div>
          )}
        </W>

        <W pad={12} style={{ marginBottom: 12 }}>
          <Tag color={BL.muted}>STREAK</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, marginTop: 4, letterSpacing: -0.4 }}>
            5 donations in a row
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
            <div key={i} style={{
              flex: 1, height: 28, borderRadius: 3,
              background: i <= 5 ? BL.ink : BL.fill
            }} />
            )}
          </div>
        </W>

        <W pad={12}>
          <Tag color={BL.muted}>NOTIFICATIONS</Tag>
          {[
          ['Surge alerts (your type)', 'Always'],
          ['Surge alerts (compatible)', 'Within 5 km'],
          ['Drive reminders', 'On'],
          ['Weekly recap', 'Sundays'],
          ['Cap: max 3 / week', 'On']].
          map((r, i) =>
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderTop: i ? `1px solid ${BL.hair}` : 'none' }}>
              <span style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink }}>{r[0]}</span>
              <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>{r[1]} ▸</span>
            </div>
          )}
        </W>
      </div>
      <TabBar active="profile" />
    </Phone>);

}

// ─── MOBILISE FLOW · 4 SCREENS ──────────────────────────────────
function Mobilise1() {// entry — choose org
  return (
    <Phone>
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn variant="ghost" size="sm" color={BL.ink}>← Back</Btn>
        <Tag>STEP 1 / 4</Tag>
      </div>
      <div style={{ padding: '12px 16px', overflowY: 'auto', height: 'calc(100% - 60px)' }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>
          Who do you want to mobilise?
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6, lineHeight: 1.5 }}>
          You'll send a one-tap invite to your squad. We'll handle scheduling with HSA.
        </div>

        <div style={{ marginTop: 18 }}>
          {[
          { l: 'DBS · Group Tech', sub: '128 members · 14 O− eligible', sel: true },
          { l: 'NUS Alumni · CompSci', sub: '412 members · 38 O− eligible' },
          { l: 'Tampines East RC', sub: '96 members · 9 O− eligible' }].
          map((s, i) =>
          <div key={i} style={{
            padding: 14, marginBottom: 8, borderRadius: 8,
            border: `${s.sel ? 2 : 1}px ${s.sel ? 'solid' : 'solid'} ${s.sel ? BL.ink : BL.hair}`,
            display: 'flex', alignItems: 'center', gap: 12
          }}>
              <div style={{
              width: 18, height: 18, borderRadius: 9,
              border: `2px solid ${s.sel ? BL.ink : BL.faint}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {s.sel && <div style={{ width: 8, height: 8, borderRadius: 4, background: BL.ink }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>{s.l}</div>
                <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
          )}
          <Btn variant="ghost" size="sm" color={BL.muted}>+ Add another organisation</Btn>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
        <Btn full size="lg" color={BL.ink}>Continue → Set time</Btn>
      </div>
    </Phone>);

}

function Mobilise2() {// time & location
  return (
    <Phone>
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn variant="ghost" size="sm" color={BL.ink}>← Back</Btn>
        <Tag>STEP 2 / 4</Tag>
      </div>
      <div style={{ padding: '12px 16px', overflowY: 'auto', height: 'calc(100% - 60px)' }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>
          When works for your team?
        </div>
        <div style={{ marginTop: 16 }}>
          <Tag color={BL.muted}>SUGGESTED · BASED ON HSA CAPACITY</Tag>
          {[
          { d: 'Tomorrow', t: 'Lunch · 11:30–14:00', cap: 'Mobile unit on-site', sel: true },
          { d: 'Thu 21 May', t: 'Lunch · 11:30–14:00', cap: 'Mobile unit on-site' },
          { d: 'Fri 22 May', t: 'After work · 17:00–19:30', cap: 'Bloodbank@HSA (2.4 km)' }].
          map((s, i) =>
          <div key={i} style={{
            padding: 12, marginTop: 8, borderRadius: 8,
            border: `${s.sel ? 2 : 1}px solid ${s.sel ? BL.ink : BL.hair}`
          }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 500 }}>{s.d}</div>
                <Tag>{s.cap}</Tag>
              </div>
              <div style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, marginTop: 4 }}>{s.t}</div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <Tag color={BL.muted}>LOCATION</Tag>
            <W pad={12} style={{ marginTop: 6 }}>
              <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink, fontWeight: 500 }}>DBS Asia Central · MBFC Tower 3 lobby</div>
              <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, marginTop: 4 }}>12 MARINA BLVD · LEVEL 1</div>
              <Btn variant="ghost" size="sm" color={BL.muted} style={{ marginTop: 4, padding: 0 }}>Change ▸</Btn>
            </W>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
        <Btn full size="lg" color={BL.ink}>Continue → Draft invite</Btn>
      </div>
    </Phone>);

}

function Mobilise3() {// invite preview
  return (
    <Phone>
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn variant="ghost" size="sm" color={BL.ink}>← Back</Btn>
        <Tag>STEP 3 / 4</Tag>
      </div>
      <div style={{ padding: '12px 16px', overflowY: 'auto', height: 'calc(100% - 60px)' }}>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>
          Review the invite
        </div>
        <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.muted, marginTop: 6, lineHeight: 1.5 }}>
          We'll send this via WhatsApp + email to 128 members. Reply RSVP in one tap.
        </div>
        <W pad={14} style={{ marginTop: 16, background: BL.fill }}>
          <Tag color={BL.muted}>PREVIEW</Tag>
          <div style={{ fontFamily: BL.sans, fontSize: 14, color: BL.ink, fontWeight: 600, marginTop: 4 }}>
            Group Tech · let's give blood tomorrow
          </div>
          <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink2, lineHeight: 1.55, marginTop: 6 }}>
            Wei Ming is organising a drive at MBFC T3 lobby, 11:30–14:00. O− is currently at <b>critical</b> nationally. Tap to RSVP — it's about 15 minutes.
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
            <div style={{ height: 6, background: BL.hair, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: '0%', height: '100%', background: BL.red }} />
            </div>
          </W>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 16, right: 16, display: 'flex', gap: 8 }}>
        <Btn variant="outline" color={BL.ink}>Edit copy</Btn>
        <Btn full size="lg" color={BL.ink}>Send invite</Btn>
      </div>
    </Phone>);

}

function Mobilise4() {// tracker (post-send)
  return (
    <Phone>
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: "16px" }}>
        <Btn variant="ghost" size="sm" color={BL.ink}>← Drives</Btn>
        <Tag>LIVE · STEP 4 / 4</Tag>
      </div>
      <div style={{ padding: '12px 16px', overflowY: 'auto', height: 'calc(100% - 60px)' }}>
        <Tag color={BL.muted}>YOUR DRIVE · TOMORROW · MBFC T3</Tag>
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2, marginTop: 4 }}>
          21 going · 9 maybe
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.need.ok.fg, fontWeight: 600 }}>↑ 3 ahead of target</span>
          <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>· sent 18 min ago</span>
        </div>

        <W pad={12} style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Tag color={BL.muted}>RSVPS · 30 / 18 NEEDED</Tag>
            <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.need.ok.fg, fontWeight: 600 }}>167%</span>
          </div>
          <div style={{ height: 8, background: BL.hair, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: BL.need.ok.fg }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>
            <span>21 going</span><span>9 maybe</span><span>5 declined</span><span>93 no reply</span>
          </div>
        </W>

        <W pad={12} style={{ marginTop: 10 }}>
          <Tag color={BL.muted}>RSVPS BY TYPE</Tag>
          <div style={{ marginTop: 10 }}>
            {[
            { t: 'O−', going: 6, eligible: 14, need: 'critical' },
            { t: 'O+', going: 5, eligible: 28, need: 'low' },
            { t: 'A+', going: 4, eligible: 32, need: 'ok' },
            { t: 'B+', going: 3, eligible: 24, need: 'ok' }].
            map((r, i) =>
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <BloodChip type={r.t} need={r.need} size="sm" />
                <div style={{ flex: 1, height: 6, background: BL.hair, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${r.going / r.eligible * 100}%`, height: '100%', background: BL.ink }} />
                </div>
                <span style={{ fontFamily: BL.mono, fontSize: 11, color: BL.muted, minWidth: 50, textAlign: 'right' }}>{r.going}/{r.eligible}</span>
              </div>
            )}
          </div>
        </W>

        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <Btn full variant="outline" color={BL.ink}>Nudge no-replies</Btn>
          <Btn full variant="outline" color={BL.ink}>Share to channels</Btn>
        </div>
      </div>
    </Phone>);

}

Object.assign(window, {
  Phone, AppHeader, TabBar,
  Onboarding, HomeA, HomeB, SurgeAlert, Drives, Impact, Profile,
  Mobilise1, Mobilise2, Mobilise3, Mobilise4
});