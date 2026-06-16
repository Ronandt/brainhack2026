import { BL } from "../tokens";

// Inject pulse keyframes once at module load
(function () {
  if (typeof document === "undefined") return;
  if (document.getElementById("bl-skel-style")) return;
  const el = document.createElement("style");
  el.id = "bl-skel-style";
  el.textContent =
    "@keyframes skel-pulse{0%,100%{background-color:#f1ede5}50%{background-color:#e7e4dd}}";
  document.head.appendChild(el);
})();

const PULSE = "skel-pulse 1.6s ease-in-out infinite";

export function Skel({ w = "100%", h = 14, r = 6, mb = 0, delay = 0, style }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        backgroundColor: "#f1ede5",
        animation: PULSE,
        animationDelay: delay ? `${delay}s` : undefined,
        flexShrink: 0,
        ...(mb ? { marginBottom: mb } : {}),
        ...style,
      }}
    />
  );
}

// ── Donor: Home ───────────────────────────────────────────────────────────────

export function HomePanelSkeleton() {
  return (
    <div>
      {/* Header */}
      <div style={{ padding: "0 0 16px" }}>
        <Skel w={72} h={9} r={3} mb={7} />
        <Skel w={160} h={24} r={6} />
      </div>

      {/* Node 1 — Can I donate? */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 5, flexShrink: 0 }}>
          <Skel w={8} h={8} r={4} />
          <div style={{ width: 1, height: 72, backgroundColor: "#e7e4dd", marginTop: 5 }} />
        </div>
        <div style={{ flex: 1 }}>
          <Skel w={90} h={9} r={3} mb={10} />
          <Skel w={130} h={28} r={6} mb={8} delay={0.05} />
          <Skel w="75%" h={12} r={4} delay={0.1} />
        </div>
      </div>

      {/* Node 2 — Is it needed? */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 5, flexShrink: 0 }}>
          <Skel w={8} h={8} r={4} delay={0.1} />
          <div style={{ width: 1, height: 110, backgroundColor: "#e7e4dd", marginTop: 5 }} />
        </div>
        <div style={{ flex: 1 }}>
          <Skel w={110} h={9} r={3} mb={10} delay={0.1} />
          <Skel w={110} h={28} r={6} mb={12} delay={0.15} />
          {/* Blood stock grid */}
          <div style={{ background: BL.card, borderRadius: 12, padding: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 8 }}>
              {Array(8).fill(0).map((_, i) => (
                <Skel key={i} w="100%" h={36} r={8} delay={0.1 + i * 0.04} />
              ))}
            </div>
            <Skel w={150} h={9} r={3} delay={0.5} />
          </div>
        </div>
      </div>

      {/* Node 3 — When can I go? */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ paddingTop: 5, flexShrink: 0 }}>
          <Skel w={8} h={8} r={4} delay={0.2} />
        </div>
        <div style={{ flex: 1 }}>
          <Skel w={100} h={9} r={3} mb={12} delay={0.2} />
          <div style={{ background: BL.card, borderRadius: 14, padding: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <Skel w="65%" h={14} r={4} mb={6} delay={0.25} />
            <Skel w="45%" h={10} r={3} mb={14} delay={0.3} />
            <Skel w="100%" h={46} r={12} delay={0.35} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Donor: Book tab (drive card list only — header + tabs always visible) ─────

export function DriveCardsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: BL.card, borderRadius: 14, padding: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Skel w="60%" h={14} r={4} mb={6} delay={i * 0.1} />
              <Skel w="45%" h={10} r={3} mb={4} delay={i * 0.1 + 0.05} />
              <Skel w={100} h={9} r={3} delay={i * 0.1 + 0.1} />
            </div>
            <Skel w={60} h={22} r={6} delay={i * 0.1} style={{ marginLeft: 10 }} />
          </div>
          {/* Capacity bar */}
          <Skel w="100%" h={4} r={2} mb={12} delay={i * 0.1 + 0.05} />
          {/* Buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <Skel w={80} h={38} r={10} delay={i * 0.1 + 0.1} />
            <Skel w={100} h={38} r={10} delay={i * 0.1 + 0.15} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Donor: Impact ─────────────────────────────────────────────────────────────

export function ImpactSkeleton() {
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Skel w={120} h={9} r={3} mb={6} />
        <Skel w={160} h={24} r={6} />
      </div>

      {/* Hero stats row */}
      <div style={{ background: BL.card, borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
          {[0, 1, 2].map(i => (
            <div key={i}>
              <Skel w="60%" h={9} r={3} mb={6} delay={i * 0.08} />
              <Skel w="80%" h={28} r={6} delay={i * 0.08 + 0.05} />
            </div>
          ))}
        </div>
        <Skel w="100%" h={4} r={2} mb={8} delay={0.2} />
        <Skel w={140} h={9} r={3} delay={0.25} />
      </div>

      {/* Milestone badges */}
      <div style={{ background: BL.card, borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <Skel w={80} h={9} r={3} mb={14} />
        <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Skel w={48} h={48} r={24} delay={i * 0.07} />
              <Skel w="80%" h={9} r={3} delay={i * 0.07 + 0.05} />
              <Skel w="60%" h={8} r={3} delay={i * 0.07 + 0.1} />
            </div>
          ))}
        </div>
      </div>

      {/* Annual bar chart */}
      <div style={{ background: BL.card, borderRadius: 14, padding: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <Skel w={100} h={9} r={3} mb={14} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 70 }}>
          {[60, 40, 75, 50, 85, 65, 45, 90, 55, 70, 40, 80].map((pct, i) => (
            <Skel key={i} w="100%" h={`${pct}%`} r={3} delay={i * 0.04} style={{ alignSelf: "flex-end" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Donor: Profile (You tab) ──────────────────────────────────────────────────

export function DonorProfileSkeleton() {
  return (
    <div>
      {/* Avatar + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <Skel w={56} h={56} r={28} />
        <div style={{ flex: 1 }}>
          <Skel w="55%" h={18} r={5} mb={6} />
          <Skel w="40%" h={11} r={4} delay={0.05} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: BL.card, borderRadius: 12, padding: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)" }}>
            <Skel w="50%" h={9} r={3} mb={6} delay={i * 0.07} />
            <Skel w="70%" h={22} r={5} delay={i * 0.07 + 0.05} />
          </div>
        ))}
      </div>

      {/* Form fields */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: BL.card, borderRadius: 14, padding: 14, marginBottom: 10, boxShadow: "0 1px 8px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)" }}>
          <Skel w={80} h={9} r={3} mb={8} delay={i * 0.08} />
          <Skel w="80%" h={16} r={4} delay={i * 0.08 + 0.05} />
        </div>
      ))}

      {/* Notification rows */}
      <div style={{ background: BL.card, borderRadius: 14, padding: 14, marginBottom: 10, boxShadow: "0 1px 8px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)" }}>
        <Skel w={90} h={9} r={3} mb={12} />
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: i > 0 ? `1px solid ${BL.fill}` : "none" }}>
            <Skel w="50%" h={12} r={4} delay={i * 0.06} />
            <Skel w={50} h={12} r={4} delay={i * 0.06 + 0.05} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HSA Admin: Overview (Forecast) ────────────────────────────────────────────

export function OverviewPanelSkeleton() {
  return (
    <div style={{ display: "flex", gap: 0, margin: "-20px -24px", height: "calc(100vh - 48px)", overflow: "hidden" }}>
      {/* Main content */}
      <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", minWidth: 0 }}>
        {/* Page header */}
        <div style={{ marginBottom: 20 }}>
          <Skel w={220} h={22} r={5} mb={8} />
          <Skel w={300} h={12} r={4} />
        </div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: 14 }}>
              <Skel w="60%" h={9} r={3} mb={8} delay={i * 0.07} />
              <Skel w="50%" h={28} r={5} mb={6} delay={i * 0.07 + 0.05} />
              <Skel w="75%" h={9} r={3} delay={i * 0.07 + 0.1} />
            </div>
          ))}
        </div>

        {/* Stock grid — 8 blood types */}
        <div style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <Skel w={120} h={9} r={3} mb={12} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {Array(8).fill(0).map((_, i) => (
              <div key={i} style={{ background: BL.fill, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Skel w={32} h={14} r={4} delay={i * 0.05} />
                  <Skel w={50} h={18} r={4} delay={i * 0.05 + 0.05} />
                </div>
                <Skel w="100%" h={4} r={2} delay={i * 0.05 + 0.1} />
              </div>
            ))}
          </div>
        </div>

        {/* Forecast chart area */}
        <div style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Skel w={160} h={9} r={3} />
            <div style={{ display: "flex", gap: 6 }}>
              {Array(8).fill(0).map((_, i) => <Skel key={i} w={28} h={20} r={6} delay={i * 0.04} />)}
            </div>
          </div>
          <Skel w="100%" h={210} r={10} delay={0.1} />
        </div>

        {/* Heatmap */}
        <div style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: 14 }}>
          <Skel w={100} h={9} r={3} mb={12} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Array(8).fill(0).map((_, row) => (
              <div key={row} style={{ display: "grid", gridTemplateColumns: "48px repeat(14, 1fr)", gap: 3 }}>
                <Skel w="100%" h={24} r={4} delay={row * 0.04} />
                {Array(14).fill(0).map((__, col) => (
                  <Skel key={col} w="100%" h={24} r={4} delay={row * 0.04 + col * 0.01} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div style={{ width: 300, borderLeft: "1px solid rgba(0,0,0,0.06)", padding: "20px 18px", overflowY: "auto", flexShrink: 0 }}>
        <Skel w={120} h={9} r={3} mb={14} />
        {[80, 60, 70, 55].map((w, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <Skel w={`${w}%`} h={13} r={4} mb={6} delay={i * 0.08} />
            <Skel w="100%" h={4} r={2} delay={i * 0.08 + 0.05} />
          </div>
        ))}
        <div style={{ height: 1, background: BL.fill, margin: "16px 0" }} />
        <Skel w={100} h={9} r={3} mb={12} />
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: BL.fill, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <Skel w="70%" h={12} r={4} mb={6} delay={i * 0.08} />
            <Skel w="100%" h={4} r={2} delay={i * 0.08 + 0.05} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HSA Admin: Surge Mode ─────────────────────────────────────────────────────

export function AdminSurgeSkeleton() {
  return (
    <div style={{ maxWidth: 720 }}>
      <Skel w={200} h={22} r={5} mb={6} />
      <Skel w={340} h={12} r={4} mb={24} delay={0.05} />

      {/* Blood type chips */}
      <div style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <Skel w={80} h={9} r={3} mb={12} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Array(8).fill(0).map((_, i) => (
            <Skel key={i} w={56} h={34} r={8} delay={i * 0.05} />
          ))}
        </div>
      </div>

      {/* Geo tier cards */}
      <div style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <Skel w={60} h={9} r={3} mb={12} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.08)", borderRadius: 10, padding: 14 }}>
              <Skel w={40} h={40} r={8} mb={8} delay={i * 0.07} />
              <Skel w="70%" h={13} r={4} mb={4} delay={i * 0.07 + 0.05} />
              <Skel w="90%" h={9} r={3} delay={i * 0.07 + 0.1} />
            </div>
          ))}
        </div>
      </div>

      {/* Message field */}
      <div style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <Skel w={110} h={9} r={3} mb={10} />
        <Skel w="100%" h={72} r={10} delay={0.15} />
      </div>

      {/* Activate button */}
      <Skel w="100%" h={48} r={10} delay={0.2} />
    </div>
  );
}

// ── Hospital: My Slots ────────────────────────────────────────────────────────

export function MySlotsSkeletonPanel() {
  return (
    <div>
      <Skel w={120} h={22} r={5} mb={6} />
      <Skel w={280} h={12} r={4} mb={24} delay={0.05} />

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: BL.card, boxShadow: "0 1px 8px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 12, padding: 14 }}>
            <Skel w="65%" h={9} r={3} mb={8} delay={i * 0.07} />
            <Skel w="50%" h={24} r={4} delay={i * 0.07 + 0.05} />
          </div>
        ))}
      </div>

      {/* Slot cards */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: 18, marginBottom: 10 }}>
          <Skel w="55%" h={15} r={4} mb={6} delay={i * 0.1} />
          <Skel w={180} h={10} r={3} mb={12} delay={i * 0.1 + 0.05} />
          <Skel w={70} h={20} r={3} mb={12} delay={i * 0.1 + 0.1} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Skel w={100} h={9} r={3} delay={i * 0.1 + 0.1} />
            <Skel w={36} h={9} r={3} delay={i * 0.1 + 0.1} />
          </div>
          <Skel w="100%" h={4} r={2} delay={i * 0.1 + 0.15} />
        </div>
      ))}
    </div>
  );
}

// ── Generic fallback (admin panels without specific layouts) ──────────────────

export function GenericPanelSkeleton({ rows = 3 }) {
  return (
    <div>
      <Skel w={180} h={22} r={5} mb={6} />
      <Skel w={280} h={12} r={4} mb={24} delay={0.05} />
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} style={{ background: BL.card, boxShadow: "0 1px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", borderRadius: 14, padding: 16, marginBottom: 10 }}>
          <Skel w="45%" h={14} r={4} mb={8} delay={i * 0.1} />
          <Skel w="70%" h={10} r={3} mb={6} delay={i * 0.1 + 0.05} />
          <Skel w="90%" h={10} r={3} delay={i * 0.1 + 0.1} />
        </div>
      ))}
    </div>
  );
}
