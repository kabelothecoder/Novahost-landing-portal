/*
 * The admin console's service worker. It does one job: show a notification when
 * the server pushes one, and open the console on the right page when it is
 * tapped. It caches nothing and intercepts no requests, so it can never serve a
 * stale console or sit between the page and the API.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "NovaHost admin", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "NovaHost admin";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      // Same tag replaces an unread alert, so a retry never stacks duplicates.
      tag: data.tag || "novahost-admin",
      renotify: true,
      icon: "/novahost-mark.png",
      badge: "/novahost-mark.png",
      data: { url: data.url || "/payment-claims" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || "/payment-claims";
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          return w.focus().then((c) => ("navigate" in c ? c.navigate(target) : c));
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
