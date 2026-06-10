import { updateDonor } from "./api";

// VAPID public key (safe to embed — it's the application server's public key).
const VAPID_PUBLIC_KEY = "BFdwcBTCofYrm-xpjKqP1n3_FYYQEvfInMzwuc1VD1GI7p5ratagCjSlylDKZlSSzKF7lMI3KxE4pqEXFGqnvBo";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Register the service worker, subscribe to web push, and persist the
// subscription on the donor record so surge alerts reach them while offline.
export async function enableSurgePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (typeof Notification !== "undefined" && Notification.permission === "denied") return;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const perm = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    if (perm !== "granted") return;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await updateDonor({ pushSubscription: sub.toJSON() });
  } catch (e) {
    console.warn("[push] enable failed:", e);
  }
}
