import { useState } from "react";
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
import MySlotsPanel from "./hospital/MySlotsPanel";
import CreateSlotPanel from "./hospital/CreateSlotPanel";

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

function decodeHospitalName(token) {
  const p = decodePayload(token);
  return p.name ?? p["cognito:username"] ?? p.email ?? "Hospital";
}

function isAdmin(token) {
  return decodeGroups(token).includes("HSAAdmin");
}

function isHospital(token) {
  return decodeGroups(token).includes("HospitalStaff");
}

const DONOR_TABS = [
  { id: "home",    label: "Home" },
  { id: "drives",  label: "Drives" },
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

const HOSPITAL_TABS = [
  { id: "hslots",  label: "My Slots" },
  { id: "hcreate", label: "Create Slot" },
];

function PanelContent({ tab, hospitalName }) {
  if (tab === "home")     return <HomePanel />;
  if (tab === "drives")   return <DonorDrivesPanel />;
  if (tab === "impact")   return <ImpactPanel />;
  if (tab === "profile")  return <DonorPanel />;
  if (tab === "overview") return <OverviewPanel />;
  if (tab === "asurge")   return <AdminSurgePanel />;
  if (tab === "adrives")  return <DrivesPanel />;
  if (tab === "donors")   return <DonorsPanel />;
  if (tab === "demand")   return <DemandPanel />;
  if (tab === "hslots")   return <MySlotsPanel />;
  if (tab === "hcreate")  return <CreateSlotPanel hospitalName={hospitalName} />;
  return null;
}

// ── Admin layout: dark left sidebar + light content (mirrors ConsoleShell) ──
function AdminDashboard({ tab, setTab, onLogout }) {
  const activeLabel = ADMIN_TABS.find(t => t.id === tab)?.label ?? "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: BL.sans }}>
      {/* Left rail */}
      <div style={{
        width: 200, background: "#1a1917", color: "#e9e6e0",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <div style={{ padding: "18px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 3, background: BL.red }} />
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
                borderLeft: tab === t.id ? `2px solid ${BL.red}` : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #2a2723" }}>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: "#8e8a82", marginBottom: 8, letterSpacing: 0.8 }}>
            HSA ADMIN · PROD
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
          <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted }}>
            {new Date().toLocaleString("en-SG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflowY: "auto", background: BL.paper }}>
          <div style={{ maxWidth: 1100, padding: 24 }}>
            <PanelContent tab={tab} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Donor layout: light top nav ──────────────────────────────────────────────
function DonorDashboard({ tab, setTab, onLogout }) {
  return (
    <div style={{ minHeight: "100vh", background: BL.paper, fontFamily: BL.sans }}>
      {/* Header */}
      <div style={{
        background: BL.card, borderBottom: `1px solid ${BL.hair}`,
        padding: "0 24px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, padding: "14px 0" }}>
          <div style={{ width: 16, height: 16, borderRadius: 3, background: BL.red }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: BL.ink, letterSpacing: -0.2 }}>BloodLine</span>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: "none", border: `1px solid ${BL.hair}`, color: BL.muted,
            borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13,
            fontFamily: BL.sans,
          }}
        >
          Sign out
        </button>
      </div>

      {/* Tab nav */}
      <div style={{
        display: "flex", padding: "0 24px", background: BL.card,
        borderBottom: `1px solid ${BL.hair}`, overflowX: "auto",
      }}>
        {DONOR_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "12px 16px", fontSize: 13, fontFamily: BL.sans,
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? BL.red : BL.muted,
              borderBottom: tab === t.id ? `2px solid ${BL.red}` : "2px solid transparent",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <PanelContent tab={tab} />
      </div>
    </div>
  );
}

// ── Hospital layout: same dark sidebar as admin ──────────────────────────────
function HospitalDashboard({ tab, setTab, onLogout, hospitalName }) {
  const activeLabel = HOSPITAL_TABS.find(t => t.id === tab)?.label ?? "";
  const ACCENT = "#2563a8"; // hospital blue accent

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: BL.sans }}>
      {/* Left rail */}
      <div style={{
        width: 200, background: "#1a1917", color: "#e9e6e0",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <div style={{ padding: "18px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 3, background: ACCENT }} />
            <span style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600 }}>BloodLine</span>
          </div>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: "#8e8a82", marginTop: 4, letterSpacing: 0.8 }}>
            HOSPITAL PORTAL · PROD
          </div>
        </div>

        <div style={{ padding: "8px", flex: 1 }}>
          {HOSPITAL_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", borderRadius: 4, marginBottom: 2, cursor: "pointer",
                background: tab === t.id ? "#2a2723" : "transparent",
                fontFamily: BL.sans, fontSize: 13, border: "none",
                color: tab === t.id ? "#fff" : "#bdb8b0",
                borderLeft: tab === t.id ? `2px solid ${ACCENT}` : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #2a2723" }}>
          <div style={{ fontFamily: BL.mono, fontSize: 9, color: "#8e8a82", marginBottom: 8, letterSpacing: 0.8 }}>
            HOSPITAL STAFF · PROD
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
              HOSPITAL PORTAL
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

        {/* Panel content */}
        <div style={{ flex: 1, overflowY: "auto", background: BL.paper }}>
          <div style={{ maxWidth: 1100, padding: 24 }}>
            <PanelContent tab={tab} hospitalName={hospitalName} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ token, onLogout }) {
  const admin    = isAdmin(token);
  const hospital = !admin && isHospital(token);
  const tabs = admin ? ADMIN_TABS : hospital ? HOSPITAL_TABS : DONOR_TABS;
  const [tab, setTab] = useState(tabs[0].id);
  const hospitalName = hospital ? decodeHospitalName(token) : null;

  if (admin)    return <AdminDashboard    tab={tab} setTab={setTab} onLogout={onLogout} />;
  if (hospital) return <HospitalDashboard tab={tab} setTab={setTab} onLogout={onLogout} hospitalName={hospitalName} />;
  return <DonorDashboard tab={tab} setTab={setTab} onLogout={onLogout} />;
}
