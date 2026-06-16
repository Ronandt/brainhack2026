import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faCalendarDays, faHeart, faUser } from "@fortawesome/free-solid-svg-icons";
import { faHouse as faHouseReg, faCalendarDays as faCalendarDaysReg, faHeart as faHeartReg, faUser as faUserReg } from "@fortawesome/free-regular-svg-icons";
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

const HSA_BLUE   = "#4a6fa5";
const SRC_RED    = BL.red;
const SIDEBAR_BG = "#1c1916";
const SIDEBAR_ACTIVE_BG = "rgba(255,255,255,0.09)";
const SIDEBAR_HOVER_BG  = "rgba(255,255,255,0.04)";
const SIDEBAR_LABEL     = "#6b6560";
const SIDEBAR_MUTED     = "#a09a90";
const SIDEBAR_DIVIDER   = "rgba(255,255,255,0.07)";

const SG_BLOODBANKS = [
  "Bloodbank@HSA",
  "Bloodbank@Dhoby Ghaut",
  "Bloodbank@Woodlands",
  "Bloodbank@Westgate",
  "Bloodbank@One Punggol",
];

const DONOR_TABS = [
  { id: "home",    label: "Home",   solid: faHouse,        outline: faHouseReg },
  { id: "drives",  label: "Book",   solid: faCalendarDays, outline: faCalendarDaysReg },
  { id: "impact",  label: "Impact", solid: faHeart,        outline: faHeartReg },
  { id: "profile", label: "You",    solid: faUser,         outline: faUserReg },
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

function AdminSidebar({ tabs, tab, setTab, accent, roleLabel, footer }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{
      width: 220, background: SIDEBAR_BG, color: "#e9e6e0",
      display: "flex", flexDirection: "column", flexShrink: 0,
      boxShadow: "1px 0 0 rgba(255,255,255,0.05)",
    }}>
      {/* Logo */}
      <div style={{ padding: "22px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 7, background: accent, flexShrink: 0,
            boxShadow: `0 2px 8px ${accent}50`,
          }} />
          <span style={{ fontFamily: BL.sans, fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>
            BloodLine
          </span>
        </div>
        <div style={{ fontFamily: BL.mono, fontSize: 9, color: SIDEBAR_LABEL, marginTop: 5, letterSpacing: 0.9 }}>
          {roleLabel}
        </div>
      </div>

      {/* Divider */}
      <div style={{ margin: "0 12px 6px", height: 1, background: SIDEBAR_DIVIDER }} />

      {/* Nav */}
      <div style={{ padding: "4px 10px", flex: 1 }}>
        {tabs.map(t => {
          const active = tab === t.id;
          const hover  = hovered === t.id && !active;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                cursor: "pointer", border: "none",
                background: active ? SIDEBAR_ACTIVE_BG : hover ? SIDEBAR_HOVER_BG : "transparent",
                fontFamily: BL.sans, fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? "#fff" : SIDEBAR_MUTED,
                borderLeft: `3px solid ${active ? accent : "transparent"}`,
                transition: "background 0.12s, color 0.1s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${SIDEBAR_DIVIDER}` }}>
        {footer}
      </div>
    </div>
  );
}

function SidebarSignOut({ onLogout, meta }) {
  return (
    <>
      {meta && (
        <div style={{ fontFamily: BL.mono, fontSize: 9, color: SIDEBAR_LABEL, letterSpacing: 0.7, marginBottom: 8, lineHeight: 1.8 }}>
          {meta}
        </div>
      )}
      <button
        onClick={onLogout}
        style={{
          width: "100%", background: "rgba(255,255,255,0.05)", border: "none",
          color: SIDEBAR_MUTED, borderRadius: 8, padding: "7px 0",
          cursor: "pointer", fontSize: 12, fontFamily: BL.sans,
        }}
      >
        Sign out
      </button>
    </>
  );
}

function AdminTopBar({ breadcrumbLeft, breadcrumbRight, right }) {
  return (
    <div style={{
      height: 50, borderBottom: "1px solid rgba(0,0,0,0.07)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", background: BL.card, flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.8 }}>
          {breadcrumbLeft}
        </span>
        <span style={{ color: BL.hair, fontSize: 14 }}>/</span>
        <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.ink, letterSpacing: 0.4 }}>
          {breadcrumbRight}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: BL.mono, fontSize: 9, color: BL.faint, letterSpacing: 0.4 }}>
          {new Date().toLocaleString("en-SG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
        {right && (
          <>
            <div style={{ width: 1, height: 16, background: BL.hair }} />
            {right}
          </>
        )}
      </div>
    </div>
  );
}

function PanelContent({ tab, onLogout, hospitalName, onNavigate }) {
  if (tab === "home")     return <HomePanel onNavigate={onNavigate} />;
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
      <AdminSidebar
        tabs={BLOODBANK_TABS}
        tab={tab}
        setTab={setTab}
        accent={HSA_BLUE}
        roleLabel="HSA BLOODBANK · PROD"
        footer={<SidebarSignOut onLogout={onLogout} />}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AdminTopBar
          breadcrumbLeft="HSA BLOODBANK"
          breadcrumbRight={activeLabel.toUpperCase()}
        />
        <div style={{ flex: 1, overflowY: "auto", background: BL.paper }}>
          <div style={{ padding: 24 }}>
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

  const profileBtn = (
    <button
      onClick={() => setTab("aprofile")}
      onMouseEnter={() => setProfileHovered(true)}
      onMouseLeave={() => setProfileHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        background: profileHovered ? BL.fill : "none",
        border: `1px solid ${profileHovered ? BL.hair : "transparent"}`,
        borderRadius: 8, padding: "4px 10px 4px 4px",
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
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: BL.sans }}>
      <AdminSidebar
        tabs={ADMIN_TABS}
        tab={tab}
        setTab={setTab}
        accent={HSA_BLUE}
        roleLabel="HSA OPERATIONS · PROD"
        footer={
          <SidebarSignOut
            onLogout={onLogout}
            meta={`MODE · PREDICT\nOPS · GREEN`}
          />
        }
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AdminTopBar
          breadcrumbLeft="HSA · NATIONAL OPERATIONS"
          breadcrumbRight={activeLabel.toUpperCase()}
          right={profileBtn}
        />
        <div style={{ flex: 1, overflowY: "auto", background: BL.paper }}>
          <div style={{ padding: "20px 24px" }}>
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

function TabIcon({ tab, active }) {
  return (
    <FontAwesomeIcon
      icon={active ? tab.solid : tab.outline}
      style={{ fontSize: 20, color: active ? BL.ink : BL.faint, display: "block" }}
    />
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
              <FontAwesomeIcon
                icon={tab === t.id ? t.solid : t.outline}
                style={{ fontSize: 14, color: tab === t.id ? BL.ink : BL.faint, flexShrink: 0, width: 16 }}
              />
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
            <PanelContent tab={tab} onLogout={onLogout} onNavigate={setTab} />
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
      <div style={{ padding: "max(16px, env(safe-area-inset-top)) 16px 96px" }}>
        <PanelContent tab={tab} onLogout={onLogout} onNavigate={setTab} />
      </div>

      {/* Bottom tab bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: 72, background: BL.card, borderTop: `1px solid ${BL.hair}`,
        display: "flex", alignItems: "center",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))", zIndex: 20,
      }}>
        {DONOR_TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                background: "none", border: "none", cursor: "pointer",
                padding: "6px 8px", gap: 4,
              }}
            >
              <TabIcon tab={t} active={active} />
              <div style={{
                fontFamily: BL.sans, fontSize: 10, fontWeight: active ? 600 : 400,
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

// ── Singapore Red Cross layout: red accent ──────────────────────────────────
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
    <AdminSidebar
      tabs={SRC_TABS}
      tab={tab}
      setTab={setTab}
      accent={SRC_RED}
      roleLabel="RED CROSS SINGAPORE · PROD"
      footer={
        <SidebarSignOut
          onLogout={onLogout}
          meta={location ? `${location} · PROD` : undefined}
        />
      }
    />
  );

  if (locationLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", fontFamily: BL.sans }}>
        {sidebar}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: BL.paper }}>
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
        <AdminTopBar
          breadcrumbLeft="RED CROSS SINGAPORE"
          breadcrumbRight={activeLabel.toUpperCase()}
        />
        <div style={{ flex: 1, overflowY: "auto", background: BL.paper }}>
          <div style={{ padding: 24 }}>
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
