// BloodLine — mid-fi wireframe primitives & tokens
// Grayscale + single red accent. Clinical, calm.

const BL = {
  // surfaces
  paper: '#fafaf9',
  card: '#ffffff',
  ink: '#1a1917',
  ink2: '#3c3a36',
  muted: '#6b6862',
  faint: '#a8a49d',
  hair: '#e7e4dd',
  rule: '#d6d2ca',
  fill: '#f1ede5',
  // accent (red — used sparingly)
  red: '#b83a33',
  redInk: '#7a1f1a',
  redSoft: '#f3dad7',
  // surge mode — used ONLY on surge surfaces
  surge: '#d62828',
  surgeBg: '#fdecec',
  // type stack
  sans: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace',
  // need tint scale (used on blood-type chips, heatmaps, gauges)
  need: {
    ok: { fg: '#1f5a3a', bg: '#dbeadd', label: 'OK' },
    low: { fg: '#7a5c10', bg: '#f3e8c4', label: 'LOW' },
    urgent: { fg: '#8b3a14', bg: '#f4d9c8', label: 'URGENT' },
    critical: { fg: '#7a1f1a', bg: '#f3dad7', label: 'CRITICAL' }
  }
};

// ─── PRIMITIVES ─────────────────────────────────────────────────

// Bordered card surface
function W({ children, style, pad = 12, hair = true, ...rest }) {
  return (
    <div style={{
      background: BL.card,
      border: hair ? `1px solid ${BL.hair}` : 'none',
      borderRadius: 6, padding: pad, fontFamily: BL.sans,
      ...style
    }} {...rest}>{children}</div>);

}

// Mono label — small caps-ish tag
function Tag({ children, color = BL.muted, bg, style }) {
  return (
    <span style={{
      fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6,
      textTransform: 'uppercase', color,
      background: bg, padding: bg ? '2px 6px' : 0,
      borderRadius: 3, display: 'inline-block',
      whiteSpace: 'nowrap',
      ...style
    }}>{children}</span>);

}

// Placeholder slot — dashed box with mono caption (for images, maps, charts)
function Slot({ label, height = 80, style, dashed = true, children }) {
  return (
    <div style={{
      height, border: dashed ? `1px dashed ${BL.rule}` : `1px solid ${BL.hair}`,
      borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: BL.faint, fontFamily: BL.mono, fontSize: 10, letterSpacing: 0.4,
      background: BL.paper, position: 'relative', overflow: 'hidden',
      ...style
    }}>
      {children}
      {label && !children && <span>{label}</span>}
    </div>);

}

// Text bar — for body copy placeholder lines
function Bar({ w = '100%', h = 8, c = BL.hair, style }) {
  return <div style={{ width: w, height: h, background: c, borderRadius: 2, ...style }} />;
}

// Section header
function H({ children, size = 13, mb = 6, mono = false, color = BL.ink, style }) {
  return (
    <div style={{
      fontFamily: mono ? BL.mono : BL.sans,
      fontSize: size, fontWeight: mono ? 500 : 600,
      color, marginBottom: mb, letterSpacing: mono ? 0.4 : -0.1,
      textTransform: mono ? 'uppercase' : 'none',
      ...style
    }}>{children}</div>);

}

// Button — filled / outline / ghost
function Btn({ children, variant = 'fill', size = 'md', color = BL.ink, full, style, ...rest }) {
  const h = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const fs = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;
  const styles = {
    fill: { background: color, color: '#fff', border: `1px solid ${color}` },
    outline: { background: 'transparent', color, border: `1px solid ${color}` },
    ghost: { background: 'transparent', color, border: '1px solid transparent' },
    soft: { background: BL.fill, color: BL.ink, border: `1px solid ${BL.hair}` }
  }[variant];
  return (
    <button style={{
      height: h, padding: `0 ${size === 'sm' ? 10 : 14}px`,
      borderRadius: size === 'lg' ? 8 : 6,
      fontFamily: BL.sans, fontSize: fs, fontWeight: 500,
      width: full ? '100%' : 'auto', cursor: 'pointer',
      boxSizing: 'border-box', whiteSpace: 'nowrap',
      display: full ? 'flex' : 'inline-flex',
      alignItems: 'center', justifyContent: 'center', gap: 6,
      ...styles, ...style
    }} {...rest}>{children}</button>);

}

// Blood-type chip — single source of truth (donor app, HSA, hospital)
function BloodChip({ type, need = 'ok', size = 'md', selected = false }) {
  const n = BL.need[need];
  const dims = {
    sm: { w: 28, h: 28, fs: 10 },
    md: { w: 36, h: 36, fs: 12 },
    lg: { w: 56, h: 56, fs: 18 },
    xl: { w: 96, h: 96, fs: 30 }
  }[size];
  return (
    <div style={{
      width: dims.w, height: dims.h, borderRadius: 6,
      background: n.bg, color: n.fg,
      border: selected ? `2px solid ${BL.ink}` : `1px solid ${n.fg}22`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: BL.mono, fontSize: dims.fs, fontWeight: 600,
      letterSpacing: -0.4
    }}>{type}</div>);

}

// 8 chips in a national-need rail
const BLOOD_TYPES = [
{ t: 'O−', n: 'critical' }, { t: 'O+', n: 'low' },
{ t: 'A−', n: 'urgent' }, { t: 'A+', n: 'ok' },
{ t: 'B−', n: 'critical' }, { t: 'B+', n: 'ok' },
{ t: 'AB−', n: 'low' }, { t: 'AB+', n: 'ok' }];


function NationalRail({ size = 'sm', highlight }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {BLOOD_TYPES.map(({ t, n }) =>
      <BloodChip key={t} type={t} need={n} size={size} selected={highlight === t} />
      )}
    </div>);

}

// Mini sparkline (SVG)
function Spark({ w = 80, h = 24, points, color = BL.ink }) {
  const data = points || [4, 6, 5, 7, 8, 6, 9, 7, 10, 8, 11, 9, 12, 14];
  const max = Math.max(...data),min = Math.min(...data);
  const xs = data.map((_, i) => i / (data.length - 1) * w);
  const ys = data.map((v) => h - (v - min) / (max - min || 1) * (h - 2) - 1);
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={d} stroke={color} strokeWidth="1.25" fill="none" />
    </svg>);

}

// Bar chart (horizontal-or-vertical) for tiny inline use
function Bars({ data, w = 200, h = 60, color = BL.ink2, max }) {
  const M = max || Math.max(...data);
  const bw = w / data.length;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {data.map((v, i) => {
        const bh = v / M * (h - 2);
        return (
          <rect key={i} x={i * bw + 1} y={h - bh} width={bw - 2} height={bh}
          fill={color} opacity={0.85} />);

      })}
    </svg>);

}

// Singapore map placeholder — abstracted island shape with optional regional dots
function SGMap({ w = 400, h = 220, dots = [], style }) {
  // Stylized Singapore-ish silhouette (not geographically accurate, just evocative)
  return (
    <svg width={w} height={h} viewBox="0 0 400 220" style={{ display: 'block', ...style }}>
      <rect width="400" height="220" fill={BL.paper} />
      {/* dashed grid */}
      <g stroke={BL.hair} strokeWidth="0.5" strokeDasharray="2 4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
        <line key={'h' + i} x1={0} y1={i * 28 + 14} x2={400} y2={i * 28 + 14} />
        )}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) =>
        <line key={'v' + i} x1={i * 28 + 14} y1={0} x2={i * 28 + 14} y2={220} />
        )}
      </g>
      {/* island silhouette */}
      <path d="M 40 110 Q 60 80 110 78 Q 160 70 210 76 Q 260 80 310 88 Q 350 96 360 116 Q 365 138 330 148 Q 280 158 220 156 Q 160 156 120 152 Q 70 146 50 138 Q 35 126 40 110 Z"
      fill={BL.fill} stroke={BL.rule} strokeWidth="1" />
      {/* dots */}
      {dots.map((d, i) => {
        const c = BL.need[d.need || 'ok'];
        const r = d.r || 14;
        return (
          <g key={i}>
            <circle cx={d.x} cy={d.y} r={r + 6} fill={c.fg} opacity="0.12" />
            <circle cx={d.x} cy={d.y} r={r} fill={c.bg} stroke={c.fg} strokeWidth="1.5" />
            {d.label &&
            <text x={d.x} y={d.y + 3} textAnchor="middle"
            fontFamily={BL.mono} fontSize="9" fontWeight="600" fill={c.fg}>{d.label}</text>
            }
          </g>);

      })}
    </svg>);

}

// Tiny donor pin
function Pin({ color = BL.red, size = 16 }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 16 21">
      <path d="M8 0C3.6 0 0 3.6 0 8c0 6 8 13 8 13s8-7 8-13C16 3.6 12.4 0 8 0z" fill={color} />
      <circle cx="8" cy="8" r="3" fill="#fff" />
    </svg>);

}

Object.assign(window, {
  BL, W, Tag, Slot, Bar, H, Btn, BloodChip, BLOOD_TYPES, NationalRail, Spark, Bars, SGMap, Pin
});