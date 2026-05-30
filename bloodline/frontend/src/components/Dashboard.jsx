import { useState } from "react";
import PredictPanel from "./PredictPanel";
import SurgePanel from "./SurgePanel";
import SchedulePanel from "./SchedulePanel";
import RetainPanel from "./RetainPanel";
import DonorPanel from "./DonorPanel";
import TestPanel from "./TestPanel";

const TABS = [
  { id: "predict", label: "Predict" },
  { id: "surge", label: "Surge" },
  { id: "schedule", label: "Schedule" },
  { id: "retain", label: "Retain" },
  { id: "donor", label: "Profile" },
  { id: "test", label: "🔧 Test" },
];

const s = {
  root: { minHeight: "100vh", background: "#0f0f0f" },
  header: { background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { color: "#c0392b", fontWeight: 700, fontSize: 20, padding: "14px 0" },
  logout: { background: "none", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13 },
  nav: { display: "flex", gap: 4, padding: "0 20px", background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", overflowX: "auto" },
  navBtn: (active) => ({
    background: "none", border: "none", cursor: "pointer", padding: "12px 16px", fontSize: 14, fontWeight: active ? 700 : 400,
    color: active ? "#c0392b" : "#888", borderBottom: active ? "2px solid #c0392b" : "2px solid transparent",
    whiteSpace: "nowrap",
  }),
  content: { maxWidth: 900, margin: "0 auto", padding: 24 },
};

export default function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("predict");

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div style={s.logo}>🩸 Bloodline</div>
        <button style={s.logout} onClick={onLogout}>Sign out</button>
      </div>
      <div style={s.nav}>
        {TABS.map(t => (
          <button key={t.id} style={s.navBtn(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={s.content}>
        {tab === "predict" && <PredictPanel />}
        {tab === "surge" && <SurgePanel />}
        {tab === "schedule" && <SchedulePanel />}
        {tab === "retain" && <RetainPanel />}
        {tab === "donor" && <DonorPanel />}
        {tab === "test" && <TestPanel />}
      </div>
    </div>
  );
}
