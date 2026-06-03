import { useState } from "react";
import PredictPanel from "./PredictPanel";
import SurgePanel from "./SurgePanel";
import SchedulePanel from "./SchedulePanel";
import RetainPanel from "./RetainPanel";
import DonorPanel from "./DonorPanel";
import TestPanel from "./TestPanel";
import OverviewPanel from "./admin/OverviewPanel";
import AdminSurgePanel from "./admin/SurgePanel";
import DrivesPanel from "./admin/DrivesPanel";
import DonorsPanel from "./admin/DonorsPanel";
import DemandPanel from "./admin/DemandPanel";

function isAdmin(token) {
  if (!token) return false;
  try {
    // JWT uses base64url — replace chars and add padding before decoding
    const base64url = token.split(".")[1];
    const base64 = base64url.replaceAll("-", "+").replaceAll("_", "/").padEnd(
      base64url.length + (4 - (base64url.length % 4)) % 4, "="
    );
    const payload = JSON.parse(atob(base64));
    return (payload["cognito:groups"] ?? []).includes("HSAAdmin");
  } catch {
    return false;
  }
}

const DONOR_TABS = [
  { id: "predict",  label: "Predict" },
  { id: "surge",    label: "Surge" },
  { id: "schedule", label: "Schedule" },
  { id: "retain",   label: "Retain" },
  { id: "donor",    label: "Profile" },
  { id: "test",     label: "🔧 Test" },
];

const ADMIN_TABS = [
  { id: "overview", label: "Overview" },
  { id: "asurge",   label: "Surge Control" },
  { id: "drives",   label: "Drive Approvals" },
  { id: "donors",   label: "Donor Pool" },
  { id: "demand",   label: "Hospital Demand" },
];

const s = {
  root: { minHeight: "100vh", background: "#0f0f0f" },
  header: { background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", padding: "0 20px", display: "flex", alignItems: "center", gap: 12 },
  logo: { color: "#c0392b", fontWeight: 700, fontSize: 20, padding: "14px 0", flex: 1 },
  adminBadge: { background: "#2a0a0a", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 4, fontSize: 11, padding: "2px 8px" },
  logout: { background: "none", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13 },
  nav: { display: "flex", gap: 4, padding: "0 20px", background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", overflowX: "auto" },
  navBtn: (active) => ({
    background: "none", border: "none", cursor: "pointer", padding: "12px 16px", fontSize: 14, fontWeight: active ? 700 : 400,
    color: active ? "#c0392b" : "#888", borderBottom: active ? "2px solid #c0392b" : "2px solid transparent",
    whiteSpace: "nowrap",
  }),
  content: { maxWidth: 1100, margin: "0 auto", padding: 24 },
};

export default function Dashboard({ token, onLogout }) {
  const admin = isAdmin(token);
  const tabs = admin ? ADMIN_TABS : DONOR_TABS;
  const [tab, setTab] = useState(tabs[0].id);

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div style={s.logo}>🩸 Bloodline</div>
        {admin && <div style={s.adminBadge}>HSA Admin</div>}
        <button style={s.logout} onClick={onLogout}>Sign out</button>
      </div>
      <div style={s.nav}>
        {tabs.map(t => (
          <button key={t.id} style={s.navBtn(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={s.content}>
        {/* Donor views */}
        {tab === "predict"  && <PredictPanel />}
        {tab === "surge"    && <SurgePanel />}
        {tab === "schedule" && <SchedulePanel />}
        {tab === "retain"   && <RetainPanel />}
        {tab === "donor"    && <DonorPanel />}
        {tab === "test"     && <TestPanel />}
        {/* Admin views */}
        {tab === "overview" && <OverviewPanel />}
        {tab === "asurge"   && <AdminSurgePanel />}
        {tab === "drives"   && <DrivesPanel />}
        {tab === "donors"   && <DonorsPanel />}
        {tab === "demand"   && <DemandPanel />}
      </div>
    </div>
  );
}
