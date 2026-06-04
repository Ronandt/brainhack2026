// BloodLine — top-level prototype assembly

// ─── Donor surface: tab bar + screen routing ─────────────────────
function DonorSurface() {
  const { s, set } = useApp();

  // Modal/sub-screens take priority over tab
  let body;
  if (s.donorScreen === 'booking')          body = <DonorBooking />;
  else if (s.donorScreen === 'booking-confirm') body = <DonorBookingConfirm />;
  else if (s.donorScreen === 'booking-success') body = <DonorBookingSuccess />;
  else if (s.donorScreen === 'type-detail') body = <DonorTypeDetail />;
  else if (s.donorScreen === 'mobilise')    body = <DonorMobilise />;
  else if (s.donorTab === 'home') {
    // Show surge alert IF surge active AND not snoozed (and not already in a flow)
    if (s.surgeActive && !s.surgeSnoozed) body = <DonorSurgeAlert />;
    else body = s.homeVariant === 'A' ? <DonorHomeA /> : <DonorHomeB />;
  }
  else if (s.donorTab === 'drives')  body = <DonorDrives />;
  else if (s.donorTab === 'impact')  body = <DonorImpact />;
  else if (s.donorTab === 'profile') body = <DonorProfile />;

  // Tab bar hidden during certain sub-screens
  const hideTabs = ['booking', 'booking-confirm', 'booking-success', 'mobilise', 'type-detail'].includes(s.donorScreen);

  return (
    <Phone w={380} h={780}>
      {body}
      {!hideTabs && <DonorTabBar />}
      <Toast msg={s.toast} surface="donor" />
    </Phone>
  );
}

// Interactive tab bar
function DonorTabBar() {
  const { s, set } = useApp();
  const items = [
    { k: 'home',    l: 'Home' },
    { k: 'drives',  l: 'Drives' },
    { k: 'impact',  l: 'Impact' },
    { k: 'profile', l: 'You' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 56, background: BL.card, borderTop: `1px solid ${BL.hair}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      paddingBottom: 8,
    }}>
      {items.map((i) => {
        const active = s.donorTab === i.k;
        return (
          <button key={i.k} onClick={() => set({ donorTab: i.k, donorScreen: null, surgeSnoozed: i.k === 'home' ? s.surgeSnoozed : true })}
            style={{ textAlign: 'center', flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{
              width: 22, height: 22, margin: '0 auto 2px',
              border: `1.5px solid ${active ? BL.ink : BL.faint}`,
              borderRadius: 4,
              background: active ? BL.ink : 'transparent',
            }} />
            <div style={{ fontFamily: BL.sans, fontSize: 10, fontWeight: 500,
              color: active ? BL.ink : BL.faint }}>{i.l}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Stage wrapper: scales the surface to fit viewport ──────────
function Stage({ children, surface }) {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Native size of each surface
  const dims = surface === 'donor'
    ? { w: 380, h: 780 }
    : { w: 1220, h: 800 };

  useEffect(() => {
    function fit() {
      const padX = surface === 'donor' ? 80 : 80;
      const padY = 140;
      const sw = (window.innerWidth - padX) / dims.w;
      const sh = (window.innerHeight - padY) / dims.h;
      setScale(Math.min(1, sw, sh));
    }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [surface, dims.w, dims.h]);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div ref={wrapperRef} style={{
        width: dims.w, height: dims.h,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Tweaks ─────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showSurfaceSwitch": true,
  "homeVariant": "A",
  "autoSurgeDemo": false
}/*EDITMODE-END*/;

function BLTweaks() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const { s, set } = useApp();

  // Sync homeVariant tweak to app state
  useEffect(() => { set({ homeVariant: t.homeVariant }); }, [t.homeVariant]);

  // Auto-surge demo: cycle surge on/off every 10s when enabled
  useEffect(() => {
    if (!t.autoSurgeDemo) return;
    const id = setInterval(() => {
      set((cur) => ({
        surgeActive: !cur.surgeActive,
        surgeActivatedAt: !cur.surgeActive ? new Date().toISOString() : null,
      }));
    }, 10000);
    return () => clearInterval(id);
  }, [t.autoSurgeDemo]);

  return (
    <TweaksPanel title="BloodLine prototype">
      <TweakSection label="Demo controls">
        <TweakButton
          label={s.surgeActive ? 'Deactivate Surge Mode' : 'Trigger Surge Mode'}
          onClick={() => set((cur) => ({
            surgeActive: !cur.surgeActive,
            surgeActivatedAt: !cur.surgeActive ? new Date().toISOString() : null,
            surgeSnoozed: false,
          }))} />
        <TweakButton
          label="Reset prototype state"
          secondary
          onClick={() => set({
            surface: 'donor', donorTab: 'home', donorScreen: null,
            bookedSlot: null, mobStep: 1, surgeActive: false, surgeSnoozed: false,
            hsaInbox: [], hospOrders: [], driveRsvps: {},
          })} />
      </TweakSection>

      <TweakSection label="Donor home">
        <TweakRadio
          label="Home layout"
          value={t.homeVariant}
          options={[
            { value: 'A', label: 'Hero card' },
            { value: 'B', label: 'Timeline' },
          ]}
          onChange={(v) => setTweak('homeVariant', v)} />
      </TweakSection>

      <TweakSection label="Auto-play">
        <TweakToggle
          label="Cycle surge every 10s"
          value={t.autoSurgeDemo}
          onChange={(v) => setTweak('autoSurgeDemo', v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

// ─── App root ──────────────────────────────────────────────────
function App() {
  return (
    <AppProvider>
      <RootStage />
    </AppProvider>
  );
}

function RootStage() {
  const { s } = useApp();
  return (
    <React.Fragment>
      <SurfaceSwitch />
      <Stage surface={s.surface}>
        {s.surface === 'donor'    && <DonorSurface />}
        {s.surface === 'hsa'      && <HSADesktop />}
        {s.surface === 'hospital' && <HospDesktop />}
      </Stage>
      <BLTweaks />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
