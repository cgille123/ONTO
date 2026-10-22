const CACHE = 'onto-pwa-dock-tray-size-20261022-v6';
const ASSETS = ['./','./index.html','./style.css','./app.js','./browser.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('onto-pwa-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
 if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
 e.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(e.request,{cache:'no-cache'});if(response.ok)cache.put(e.request,response.clone());return response;}catch(err){const cached=await caches.match(e.request);if(cached)return cached;throw err;}})());
});
