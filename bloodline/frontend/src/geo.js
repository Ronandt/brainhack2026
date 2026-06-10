// Shared geo helpers for proximity sorting / nearest-bloodbank features.

// Approximate coordinates for the fixed Singapore blood banks. Slots/drives often
// carry only a location name, so we map the name → coords to compute distance.
export const BLOODBANK_COORDS = {
  "Bloodbank@HSA":          { lat: 1.2812, lng: 103.8389 },
  "Bloodbank@Dhoby Ghaut":  { lat: 1.2993, lng: 103.8455 },
  "Bloodbank@Woodlands":    { lat: 1.4360, lng: 103.7865 },
  "Bloodbank@Westgate":     { lat: 1.3338, lng: 103.7430 },
  "Bloodbank@One Punggol":  { lat: 1.4050, lng: 103.9020 },
  "HSA Bloodbank":          { lat: 1.2812, lng: 103.8389 },
  "Singapore Red Cross":    { lat: 1.2966, lng: 103.8485 },
};

// Great-circle distance between two lat/lng points, in km.
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Coordinates for a session: explicit lat/lng, a known blood bank, or a geocoded
// location name passed in via geoCache. Returns {lat,lng} or null.
export function resolveCoords(item, geoCache = {}) {
  if (item.lat != null && item.lng != null) return { lat: Number(item.lat), lng: Number(item.lng) };
  const bank = BLOODBANK_COORDS[item.location];
  if (bank) return bank;
  return geoCache[item.location] || null;
}

// Human label for a distance in km (e.g. "420 m" / "3.2 km").
export function formatDistance(km) {
  if (km == null) return "";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
