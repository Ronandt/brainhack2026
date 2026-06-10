import { useState, useEffect } from "react";
import { BL } from "../tokens";
import HomePanel from "./HomePanel";
import DonorDrivesPanel from "./DonorDrivesPanel";
import ImpactPanel from "./ImpactPanel";
import DonorPanel from "./DonorPanel";
import OverviewPanel from "./admin/OverviewPanel";
import AdminSurgePanel from "./admin/SurgePanel";
import DrivesPanel from "./admin/DrivesPanel";
import DonorsPanel from "./admin/DonorsPanel";
import DemandPanel from "./admin/DemandPanel";
import ManageSlotsPanel from "./hospital/ManageSlotsPanel";
import CheckinPanel from "./hospital/CheckinPanel";
import SetupLocationPanel from "./hospital/SetupLocationPanel";
import DriveApprovalsPanel from "./redcross/DriveApprovalsPanel";
import AdminProfilePanel from "./admin/AdminProfilePanel";
import { getHospitalProfile, getDonor } from "../api";
import { getToken } from "../auth";

function decodePayload(token) {
  if (!token) return {};
  try {
    const base64url = token.split(".")[1];
    const base64 = base64url.replaceAll("-", "+").replaceAll("_", "/").padEnd(
      base64url.length + (4 - (base64url.length % 4)) % 4, "="
    );
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

function decodeGroups(token) {
  return decodePayload(token)["cognito:groups"] ?? [];
}


function isAdmin(token) {
  return decodeGroups(token).includes("HSAAdmin");
}

function isBloodBank(token) {
  return decodeGroups(token).includes("BloodBank");
}

function isHospital(token) {
  return decodeGroups(token).includes("RedCrossSG");
}

const HSA_BLUE = "#4a6fa5";
const SRC_RED  = BL.red;

const SG_BLOODBANKS = [
  "Bloodbank@HSA",
  "Bloodbank@Dhoby Ghaut",
  "Bloodbank@Woodlands",
  "Bloodbank@Westgate",
  "Bloodbank@One Punggol",
];

const DONOR_TABS = [
  { id: "home",    label: "Home" },
  { id: "drives",  label: "Book" },
  { id: "impact",  label: "Impact" },
  { id: "profile", label: "You" },
];

const ADMIN_TABS = [
  { id: "overview", label: "Forecast" },
  { id: "asurge",   label: "Surge Mode" },
  { id: "adrives",  label: "Drive queue" },
  { id: "donors",   label: "Donor pool" },
  { id: "demand",   label: "Hospital demand" },
];

const BLOODBANK_TABS = [
  { id: "bbmanage",  label: "Manage Slots" },
  { id: "bbcheckin", label: "Check-in" },
];

const SRC_TABS = [
  { id: "srcdrives",  label: "Drive approvals" },
  { id: "srcmanage",  label: "Manage Slots" },
  { id: "srccheckin", label: "Check-in" },
];

function PanelContent({ tab, onLogout, hospitalName }) {
  if (tab === "home")     return <HomePanel />;
  if (tab === "drives")   return <DonorDrivesPanel />;
  if (tab === "impact")   return <ImpactPanel />;
  if (tab === "profile")  return <DonorPanel onLogout={onLogout} />;
  if (tab === "overview") return <OverviewPanel />;
  if (tab === "asurge")   return <AdminSurgePanel />;
  if (tab === "adrives")  return <DrivesPanel />;
  if (tab === "donors")   return <DonorsPanel />;
  if (tab === "demand")     return <DemandPanel />;
  if (tab === "aprofile")   return <AdminProfilePanel />;
  if (tab === "bbmanage")   return <ManageSlotsPanel locations={SG_BLOODBANKS} />;
  if (tab === "bbcheckin")  return <CheckinPanel />;
  if (tab === "srcmanage")  return <ManageSlotsPanel locationName={hospitalName ?? "Singapore Red Cross"} />;
  if (tab === "srccheckin") return <CheckinPanel />;
  if (tab === "srcdrives")  return <DriveApprovalsPanel />;
  return null;
}

// ── BloodBank layout (under HSA umbrella, blue accent, 2 tabs) ──────────────
function BloodBankDashboard({ tab, setTab, onLogout }) {
  const activeLabel = BLOODBANK_TABS.find(t => t.id === tab)?.label ?? "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: BL.sans }}>
      <div style={{
        width: 200, background: "#1a1917", color: "#e9e6e0",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <div style={{ padding: "18px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 3, background: HSA_BLUE }} />
            <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600 }}>BloodLine</span>
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: "#8e8a82", marginTop: 4, letterSpacing: 0.8 }}>
            HSA BLOODBANK · PROD
          </div>
        </div>

        <div style={{ padding: "8px", flex: 1 }}>
          {BLOODBANK_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", borderRadius: 4, marginBottom: 2, cursor: "pointer",
                background: tab === t.id ? "#2a2723" : "transparent",
                fontFamily: BL.sans, fontSize: 13, border: "none",
                color: tab === t.id ? "#fff" : "#bdb8b0",
                borderLeft: tab === t.id ? `2px solid ${HSA_BLUE}` : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #2a2723" }}>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: "#8e8a82", marginBottom: 8, letterSpacing: 0.8 }}>
            HSA BLOODBANK · PROD
          </div>
          <button
            onClick={onLogout}
            style={{
              width: "100%", background: "none", border: "1px solid #2a2723",
              color: "#8e8a82", borderRadius: 6, padding: "6px 0",
              cursor: "pointer", fontSize: 12, fontFamily: BL.sans,
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{
          height: 48, borderBottom: `1px solid ${BL.hair}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", background: BL.card, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.8 }}>
              HSA BLOODBANK
            </span>
            <span style={{ color: BL.faint }}>/</span>
            <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.ink }}>
              {activeLabel.toUpperCase()}
            </span>
          </div>
          <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>
            {new Date().toLocaleString("en-SG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", background: BL.paper }}>
          <div style={{ maxWidth: 1100, padding: 24 }}>
            <PanelContent tab={tab} hospitalName="HSA Bloodbank" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin layout: dark left sidebar + light content (mirrors ConsoleShell) ──
function AdminDashboard({ tab, setTab, onLogout }) {
  const activeLabel = ADMIN_TABS.find(t => t.id === tab)?.label ?? (tab === "aprofile" ? "My Profile" : "");
  const [adminName, setAdminName] = useState("");
  const [profileHovered, setProfileHovered] = useState(false);

  useEffect(() => {
    getDonor().then(d => setAdminName(d.name ?? "")).catch(() => {});
  }, []);

  const initials = adminName
    ? adminName.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const displayName = adminName ? `${adminName} · HSA` : "HSA Admin";

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: BL.sans }}>
      {/* Left rail */}
      <div style={{
        width: 200, background: "#1a1917", color: "#e9e6e0",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <div style={{ padding: "18px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 3, background: HSA_BLUE }} />
            <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600 }}>BloodLine</span>
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: "#8e8a82", marginTop: 4, letterSpacing: 0.8 }}>
            HSA OPERATIONS · PROD
          </div>
        </div>

        <div style={{ padding: "8px", flex: 1 }}>
          {ADMIN_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", borderRadius: 4, marginBottom: 2, cursor: "pointer",
                background: tab === t.id ? "#2a2723" : "transparent",
                fontFamily: BL.sans, fontSize: 13, border: "none",
                color: tab === t.id ? "#fff" : "#bdb8b0",
                borderLeft: tab === t.id ? `2px solid ${HSA_BLUE}` : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "12px", borderTop: "1px solid #2a2723" }}>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: "#8e8a82", letterSpacing: 0.6, lineHeight: 1.9 }}>
            MODE · <span style={{ color: "#bdb8b0" }}>PREDICT</span><br />
            OPS · GREEN · 3 ACTIVE
          </div>
          <button
            onClick={onLogout}
            style={{
              marginTop: 8, width: "100%", background: "none", border: "1px solid #2a2723",
              color: "#8e8a82", borderRadius: 5, padding: "5px 0",
              cursor: "pointer", fontSize: 11, fontFamily: BL.sans,
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top header bar */}
        <div style={{
          height: 48, borderBottom: `1px solid ${BL.hair}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", background: BL.card, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.8 }}>
              HSA · NATIONAL OPERATIONS
            </span>
            <span style={{ color: BL.faint }}>/</span>
            <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.ink }}>
              {activeLabel.toUpperCase()}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: BL.mono, fontSize: 9, color: BL.muted, letterSpacing: 0.4 }}>
              {new Date().toLocaleString("en-SG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            <div style={{ width: 1, height: 16, background: BL.hair }} />
            <button
              onClick={() => setTab("aprofile")}
              onMouseEnter={() => setProfileHovered(true)}
              onMouseLeave={() => setProfileHovered(false)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: profileHovered ? BL.fill : "none",
                border: `1px solid ${profileHovered ? BL.hair : "transparent"}`,
                borderRadius: 6, padding: "4px 8px 4px 4px",
                cursor: "pointer", transition: "all 0.12s",
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                background: tab === "aprofile" ? BL.ink : BL.fill,
                border: `1px solid ${tab === "aprofile" ? BL.ink : BL.hair}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: BL.sans, fontSize: 11, fontWeight: 700,
                color: tab === "aprofile" ? "#fff" : BL.ink,
              }}>
                {initials}
              </div>
              <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.ink, whiteSpace: "nowrap" }}>
                {displayName}
              </span>
            </button>
          </div>
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflowY: "auto", background: BL.paper }}>
          <div style={{ maxWidth: 1100, padding: "20px 24px" }}>
            <PanelContent tab={tab} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Responsive hook ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// Shared tab icon (square with rounded corners, matching prototype)
// Per-tab line icons for the donor nav (home / book / impact / you)
function NavIcon({ id, active, size = 20 }) {
  const color = active ? BL.ink : BL.muted;
  const p = {
    home:    <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></>,
    drives:  <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 9.5h17" /><path d="M8 3v4M16 3v4" /></>,
    impact:  <path d="M12 20.5C7 17 3.5 13.8 3.5 9.8 3.5 7.1 5.6 5 8.2 5c1.7 0 3 .9 3.8 2.2C12.8 5.9 14.1 5 15.8 5c2.6 0 4.7 2.1 4.7 4.8 0 4-3.5 7.2-8.5 10.7Z" />,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block" }}>
      {p[id] ?? p.home}
    </svg>
  );
}

// ── Donor layout: responsive — left sidebar on desktop, bottom bar on mobile ─
function DonorDashboard({ tab, setTab, onLogout }) {
  const mobile = useIsMobile();
  return mobile
    ? <DonorMobileLayout tab={tab} setTab={setTab} onLogout={onLogout} />
    : <DonorDesktopLayout tab={tab} setTab={setTab} onLogout={onLogout} />;
}

function DonorDesktopLayout({ tab, setTab, onLogout }) {
  const activeLabel = DONOR_TABS.find(t => t.id === tab)?.label ?? "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: BL.sans }}>
      {/* Left sidebar */}
      <div style={{
        width: 180, background: BL.card, borderRight: `1px solid ${BL.hair}`,
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: 3, background: BL.red }} />
            <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 700, color: BL.ink, letterSpacing: -0.2 }}>
              BloodLine
            </span>
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: BL.faint, marginTop: 4, letterSpacing: 0.8 }}>
            DONOR
          </div>
        </div>

        {/* Nav items */}
        <div style={{ padding: "4px 8px", flex: 1 }}>
          {DONOR_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", textAlign: "left",
                padding: "9px 12px", borderRadius: 5, marginBottom: 1,
                cursor: "pointer", border: "none",
                background: tab === t.id ? BL.fill : "transparent",
                fontFamily: BL.sans, fontSize: 13,
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? BL.ink : BL.muted,
                borderLeft: tab === t.id ? `2px solid ${BL.red}` : "2px solid transparent",
              }}
            >
              <NavIcon id={t.id} active={tab === t.id} size={17} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Sign out */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${BL.hair}` }}>
          <button
            onClick={onLogout}
            style={{
              width: "100%", background: "none", border: `1px solid ${BL.hair}`,
              color: BL.muted, borderRadius: 6, padding: "7px 0",
              cursor: "pointer", fontSize: 12, fontFamily: BL.sans,
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar — logo + current tab */}
        <div style={{
          height: 48, borderBottom: `1px solid ${BL.hair}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", background: BL.card, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* BloodLine logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: BL.red }} />
              <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 700, color: BL.ink, letterSpacing: -0.2 }}>
                BloodLine
              </span>
            </div>
            <span style={{ color: BL.hair, fontSize: 16, lineHeight: 1 }}>›</span>
            <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.6 }}>
              {activeLabel.toUpperCase()}
            </span>
          </div>
          <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>
            {new Date().toLocaleString("en-SG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Panel */}
        <div style={{ flex: 1, overflowY: "auto", background: BL.paper }}>
          <div style={{ maxWidth: 800, padding: "16px 24px 24px" }}>
            <PanelContent tab={tab} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DonorMobileLayout({ tab, setTab, onLogout }) {
  return (
    <div style={{ minHeight: "100vh", background: BL.paper, fontFamily: BL.sans }}>
      {/* No top bar on mobile — matches prototype (AppHeader in each panel handles identity) */}

      {/* Safe area top + 16px base so content never hugs the browser chrome */}
      <div style={{ padding: "max(16px, env(safe-area-inset-top)) 16px 80px" }}>
        <PanelContent tab={tab} onLogout={onLogout} />
      </div>

      {/* Bottom tab bar — matches prototype TabBar exactly */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: 56, background: BL.card, borderTop: `1px solid ${BL.hair}`,
        display: "flex", alignItems: "center",
        paddingBottom: 4, zIndex: 20,
      }}>
        {DONOR_TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, textAlign: "center", background: "none", border: "none",
                cursor: "pointer", padding: "6px 0",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 3 }}>
                <NavIcon id={t.id} active={active} size={22} />
              </div>
              <div style={{
                fontFamily: BL.sans, fontSize: 10, fontWeight: 500,
                color: active ? BL.ink : BL.faint,
              }}>
                {t.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Singapore Red Cross layout: red accent, 2 tabs (Manage Slots + Check-in) ─
function SRCDashboard({ tab, setTab, onLogout }) {
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const activeLabel = SRC_TABS.find(t => t.id === tab)?.label ?? "";

  useEffect(() => {
    getHospitalProfile()
      .then(d => setLocation(d.profile?.location ?? null))
      .catch(() => setLocation(null))
      .finally(() => setLocationLoading(false));
  }, []);

  const sidebar = (
    <div style={{
      width: 200, background: "#1a1917", color: "#e9e6e0",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      <div style={{ padding: "18px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 18, height: 18, borderRadius: 3, background: SRC_RED }} />
          <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600 }}>BloodLine</span>
        </div>
        <div style={{ fontFamily: BL.mono, fontSize: 9, color: "#8e8a82", marginTop: 4, letterSpacing: 0.8 }}>
          RED CROSS SINGAPORE · PROD
        </div>
      </div>

      <div style={{ padding: "8px", flex: 1 }}>
        {SRC_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 12px", borderRadius: 4, marginBottom: 2, cursor: "pointer",
              background: tab === t.id ? "#2a2723" : "transparent",
              fontFamily: BL.sans, fontSize: 13, border: "none",
              color: tab === t.id ? "#fff" : "#bdb8b0",
              borderLeft: tab === t.id ? `2px solid ${SRC_RED}` : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #2a2723" }}>
        <div style={{ fontFamily: BL.mono, fontSize: 9, color: "#8e8a82", marginBottom: 8, letterSpacing: 0.8 }}>
          {location ?? "SRC STAFF"} · PROD
        </div>
        <button
          onClick={onLogout}
          style={{
            width: "100%", background: "none", border: "1px solid #2a2723",
            color: "#8e8a82", borderRadius: 6, padding: "6px 0",
            cursor: "pointer", fontSize: 12, fontFamily: BL.sans,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );

  if (locationLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", fontFamily: BL.sans }}>
        {sidebar}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13 }}>Loading…</span>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", fontFamily: BL.sans }}>
        {sidebar}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: BL.paper }}>
          <SetupLocationPanel onComplete={loc => setLocation(loc)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: BL.sans }}>
      {sidebar}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{
          height: 48, borderBottom: `1px solid ${BL.hair}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", background: BL.card, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.8 }}>
              RED CROSS SINGAPORE
            </span>
            <span style={{ color: BL.faint }}>/</span>
            <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.ink }}>
              {activeLabel.toUpperCase()}
            </span>
          </div>
          <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>
            {new Date().toLocaleString("en-SG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", background: BL.paper }}>
          <div style={{ maxWidth: 1100, padding: 24 }}>
            <PanelContent tab={tab} hospitalName={location} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ token, onLogout }) {
  const admin     = isAdmin(token);
  const bloodBank = !admin && isBloodBank(token);
  const hospital  = !admin && !bloodBank && isHospital(token);
  const tabs = admin ? ADMIN_TABS : bloodBank ? BLOODBANK_TABS : hospital ? SRC_TABS : DONOR_TABS;
  const [tab, setTab] = useState(tabs[0].id);

  if (admin)     return <AdminDashboard     tab={tab} setTab={setTab} onLogout={onLogout} />;
  if (bloodBank) return <BloodBankDashboard tab={tab} setTab={setTab} onLogout={onLogout} />;
  if (hospital)  return <SRCDashboard       tab={tab} setTab={setTab} onLogout={onLogout} />;
  return <DonorDashboard tab={tab} setTab={setTab} onLogout={onLogout} />;
}
