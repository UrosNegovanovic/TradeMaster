/* Capture Chrome's install event before React hydrates, and register the worker. */
window.addEventListener('beforeinstallprompt', function (event) {
  event.preventDefault()
  window.__tmInstallPrompt = event
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
}
