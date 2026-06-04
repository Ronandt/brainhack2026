// Design tokens matching the BloodLine prototype wireframe
export const BL = {
  paper:    '#fafaf9',
  card:     '#ffffff',
  ink:      '#1a1917',
  ink2:     '#3c3a36',
  muted:    '#6b6862',
  faint:    '#a8a49d',
  hair:     '#e7e4dd',
  rule:     '#d6d2ca',
  fill:     '#f1ede5',
  red:      '#b83a33',
  redInk:   '#7a1f1a',
  redSoft:  '#f3dad7',
  surge:    '#d62828',
  surgeBg:  '#fdecec',
  sans:     '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
  mono:     '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace',
  need: {
    ok:       { fg: '#1f5a3a', bg: '#dbeadd', label: 'OK' },
    low:      { fg: '#7a5c10', bg: '#f3e8c4', label: 'LOW' },
    urgent:   { fg: '#8b3a14', bg: '#f4d9c8', label: 'URGENT' },
    critical: { fg: '#7a1f1a', bg: '#f3dad7', label: 'CRITICAL' },
  },
};

// Map legacy risk strings to need keys
export function riskToNeed(risk) {
  const map = { ok: 'ok', low: 'low', urgent: 'urgent', critical: 'critical' };
  return map[risk] ?? 'ok';
}
