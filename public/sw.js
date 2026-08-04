/* eslint-disable no-restricted-globals */
/**
 * Shikhar Service Worker
 * - Listens for `push` events and displays notifications.
 * - Handles `notificationclick` to focus/open the app.
 * - Caches the app shell for offline use (basic — not offline-first per TRD non-goal).
 */

const CACHE_NAME = "shikhar-v1";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let payload = { title: "Shikhar", body: "You have a new update", url: "/" };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    // Payload wasn't JSON — fall back to text
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url ?? "/" },
    vibrate: [80, 40, 80],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus an existing tab if one is open
      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          if (url !== "/") {
            client.navigate?.(url);
          }
          return;
        }
      }
      // Otherwise open a new tab
      await self.clients.openWindow(url);
    })(),
  );
});
