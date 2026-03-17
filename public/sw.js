// ─── Life Operating System — Push Notification Service Worker ───

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || "You have a notification",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: { url: data.url || "/dashboard" },
    tag: data.tag || "los-notification",
    renotify: true,
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Life Operating System",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open new tab
      return clients.openWindow(url);
    })
  );
});

// Handle notification close (for analytics if needed later)
self.addEventListener("notificationclose", () => {
  // Could log dismissals in the future
});
