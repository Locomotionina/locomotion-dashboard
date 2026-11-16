// Service Worker for Locomotion Dashboard Tracker PWA & Push Notifications

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push messages
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: "Locomotion Notification",
        body: event.data.text(),
      };
    }
  }

  const title = data.title || "Locomotion Dashboard";
  const body = data.body || data.message || "Ada pembaruan task di workspace Anda.";
  const url = data.url || data.link || "/dashboard";

  const options = {
    body: body,
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      url: url,
      taskId: data.taskId,
      type: data.type,
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: "open",
        title: "Buka",
      },
    ],
    tag: data.taskId ? `task-${data.taskId}` : `locomotion-notif-${Date.now()}`,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification tap / click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Search if any client tab already has the app open
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
        // If no tab is open, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
