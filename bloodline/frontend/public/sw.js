// Bloodline service worker — shows surge-alert push notifications even when the
// app/tab is closed. We send bodyless web pushes (no encryption needed), so the
// notification text lives here; if a payload is ever attached it's used instead.
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* bodyless push */ }

  const title = data.title || "🩸 Blood surge alert";
  const body  = data.body  || "Urgent: blood is needed. Tap to open Bloodline and book a slot.";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: data.tag || "surge",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      requireInteraction: true,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
