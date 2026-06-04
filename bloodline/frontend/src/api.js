import { getToken } from "./auth";
import { API_URL } from "./config";

async function request(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// Predict
export const getStatus = () => request("/api/v1/predict/status");
export const getForecast = (bloodType) =>
  request("/api/v1/predict/forecast" + (bloodType ? "?bloodType=" + bloodType : ""));

// Donors
export const getDonor = () => request("/api/v1/donors/me");
export const updateDonor = (body) =>
  request("/api/v1/donors/me", { method: "PUT", body: JSON.stringify(body) });

// Surge
export const activateSurge = (body) =>
  request("/api/v1/surge/activate", { method: "POST", body: JSON.stringify(body) });
export const getSurgeMonitor = () => request("/api/v1/surge/monitor");

// Schedule
export const getDrives = (bloodType) =>
  request("/api/v1/schedule/drives" + (bloodType ? "?bloodType=" + bloodType : ""));
export const createBooking = (body) =>
  request("/api/v1/schedule/book", { method: "POST", body: JSON.stringify(body) });

// Hospital
export const getHospitalProfile = () => request("/api/v1/hospital/profile");
export const updateHospitalProfile = (body) =>
  request("/api/v1/hospital/profile", { method: "PUT", body: JSON.stringify(body) });
export const createDrive = (body) =>
  request("/api/v1/hospital/drives", { method: "POST", body: JSON.stringify(body) });
export const getHospitalDrives = () => request("/api/v1/hospital/drives");

// Retain
export const getRetainStats = () => request("/api/v1/retain/stats");

// Diagnostics / test panel
export const getDiagnostics = () => request("/api/v1/admin/diagnostics");
export const triggerFunction = (target) =>
  request("/api/v1/admin/trigger", { method: "POST", body: JSON.stringify({ target }) });

// Admin
export const getDonorSegments = () => request("/api/v1/admin/donors/segments");
export const getPendingDrives = () => request("/api/v1/admin/drives/pending");
export const approveDrive = (driveId) => request(`/api/v1/admin/drives/${driveId}/approve`, { method: "POST" });
export const rejectDrive = (driveId) => request(`/api/v1/admin/drives/${driveId}/reject`, { method: "POST" });
export const getStockOverview = () => request("/api/v1/admin/stock");
export const getAllAlerts = () => request("/api/v1/admin/alerts");
export const submitHospitalDemand = (body) =>
  request("/api/v1/admin/demand", { method: "POST", body: JSON.stringify(body) });
