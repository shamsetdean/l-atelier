/* Service Worker — Atelier Funk PHÉNIX
   Objectif : mise en cache légère de l'app shell pour un accès plus rapide
   et une tolérance aux coupures réseau ponctuelles. Pas de vraie synchro
   hors-ligne (les données Supabase restent en ligne uniquement). */

const CACHE_NAME = 'phenix-shell-v2';

const SHELL_FILES = [
  './index.html',
  './atelier.css',
  './manifest.json',
  './favicon-32.png',
  './favicon.svg',
  './apple-touch-icon.png',
  './android-chrome-192.png',
  './android-chrome-512.png',
  './phenix-logo.png',
  './custom-audio.js',
  './loop-ab.js',
  './pdf-modal.js',
  './vendor/lucide.min.js',
  './vendor/supabase.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // On ne touche jamais aux requêtes vers Supabase, YouTube, Dropbox, ou autre domaine externe :
  // uniquement les fichiers du site lui-même, en mode "réseau d'abord, cache en secours".
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  // Fichiers statiques (scripts, styles, images, polices) : réponse immédiate depuis le cache,
  // mise à jour en arrière-plan (stale-while-revalidate). Pages HTML et JSON : réseau d'abord.
  const dest = event.request.destination;
  if (['script', 'style', 'image', 'font'].includes(dest)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const network = fetch(event.request).then((response) => {
            if (response && response.ok) cache.put(event.request, response.clone()).catch(() => {});
            return response;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => {
        if (cached) return cached;
        // Le fallback vers index.html n'a de sens que pour une navigation de page
        // (sinon un CSS/JS manquant renverrait du HTML, ce qui casse tout).
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return undefined;
      }))
  );
});
