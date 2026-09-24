/* Minimal worker so Chrome can install the web app. Network-only — no cache of API or pages. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Required for the worker to control the page. Requests go to the network.
})
