import { React, html } from './components/common.js';
import { App } from './components/App.js';

const ReactDOM = window.ReactDOM;
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);

// Online-only web app: no service worker. Defensively tear down any worker /
// cache left over from the old offline-capable PWA so returning users always
// load the latest code straight from the network.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
  if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
}
