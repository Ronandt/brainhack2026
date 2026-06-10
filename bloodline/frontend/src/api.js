import { getToken } from "./auth";
import { API_URL } from "./config";

async function request(path, options = {}) {
  const token = await getToken();
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
        ...options.headers,
      },
    });
  } catch (e) {
    throw new Error(`Unable to reach API (${API_URL}${path}). Check network, CORS, and whether the backend is deployed.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// Predict
export const getStatus = () => request("/api/v1/predict/status");
export const getForecast = (bloodType) =>
  request("/api/v1/predict/forecast" + (bloodType ? "?bloodType=" + encodeURIComponent(bloodType) : ""));

// Donors
export const getDonor = () => request("/api/v1/donors/me");
export const updateDonor = (body) =>
  request("/api/v1/donors/me", { method: "PUT", body: JSON.stringify(body) });

// Surge
export const activateSurge = (body) =>
  request("/api/v1/surge/activate", { method: "POST", body: JSON.stringify(body) });
export const getSurgeMonitor = () => request("/api/v1/surge/monitor");
export const endSurge = (alertId) =>
  request(`/api/v1/surge/${alertId}/end`, { method: "POST" });

// Schedule
export const getDrives = (bloodType) =>
  request("/api/v1/schedule/drives" + (bloodType ? "?bloodType=" + encodeURIComponent(bloodType) : ""));
export const getMyBookings = () => request("/api/v1/schedule/bookings");
export const createBooking = (body) =>
  request("/api/v1/schedule/book", { method: "POST", body: JSON.stringify(body) });

// Hospital — profile & directory
export const getHospitals = () => request("/api/v1/hospitals");
export const getHospitalProfile = () => request("/api/v1/hospital/profile");
export const updateHospitalProfile = (body) =>
  request("/api/v1/hospital/profile", { method: "PUT", body: JSON.stringify(body) });

// Donation slots — hospital manages, donors book
export const createSlot = (body) =>
  request("/api/v1/hospital/slots", { method: "POST", body: JSON.stringify(body) });
export const getHospitalSlots = () => request("/api/v1/hospital/slots");
export const getSlotBookings = (slotId) => request(`/api/v1/hospital/slots?slotId=${encodeURIComponent(slotId)}`);
export const getSlots = (bloodType) =>
  request("/api/v1/slots" + (bloodType ? `?bloodType=${encodeURIComponent(bloodType)}` : ""));
export const bookSlot = (slotId) =>
  request(`/api/v1/slots/${slotId}/book`, { method: "POST" });
export const cancelSlotBooking = (slotId) =>
  request(`/api/v1/slots/${slotId}/book`, { method: "DELETE" });

// Blood drives — hospital creates, admin approves
export const createDrive = (body) =>
  request("/api/v1/schedule/drives", { method: "POST", body: JSON.stringify(body) });
export const getHospitalDrives = () => request("/api/v1/hospital/drives");
export const lookupDonor = (donorId) => request(`/api/v1/hospital/donor?donorId=${encodeURIComponent(donorId)}`);
export const recordDonation = (body) =>
  request("/api/v1/admin/donations", { method: "POST", body: JSON.stringify(body) });

// Blood stock (live Red Cross SG scrape, cached every 15 min via EventBridge)
export const getBloodStock = () => request("/api/v1/blood-stock");

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
export const getTrafficIncidents = () => request("/api/v1/admin/traffic-incidents");
export const submitHospitalDemand = (body) =>
  request("/api/v1/admin/demand", { method: "POST", body: JSON.stringify(body) });
