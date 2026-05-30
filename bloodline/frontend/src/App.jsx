import { useState, useEffect } from "react";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import { getCurrentUser, getToken, signOut } from "./auth";

export default function App() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then((t) => {
      setToken(t);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner />;

  if (!token) return <Auth onLogin={setToken} />;

  return <Dashboard onLogout={() => { signOut(); setToken(null); }} />;
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ color: "#c0392b", fontSize: 18 }}>Loading…</div>
    </div>
  );
}
