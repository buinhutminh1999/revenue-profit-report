// PWA + Firebase Messaging Service Worker (Combined)
// This is the ONLY service worker file needed

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const CACHE_NAME = 'bachkhoa-erp-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/logo192.png',
    '/logo512.png',
    '/favicon.ico'
];

// Initialize Firebase
firebase.initializeApp({
    apiKey: "AIzaSyABAtDgu1RWl8yhHECA2WDqOYTO_6NNQ6I",
    authDomain: "revenue-profit-app.firebaseapp.com",
    projectId: "revenue-profit-app",
    storageBucket: "revenue-profit-app.firebasestorage.app",
    messagingSenderId: "468098013262",
    appId: "1:468098013262:web:6fb885532508fce54d0b1f"
});

const messaging = firebase.messaging();

// ============= PWA CACHING =============

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and Firebase/external URLs
    if (
        event.request.method !== 'GET' ||
        event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('firebase') ||
        event.request.url.includes('googleapis.com')
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache when offline
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// ============= FIREBASE MESSAGING =============

// Handle background messages (ONLY place that handles this)
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message:', payload);

    // Read from data payload (we send data-only messages to avoid duplicates)
    const data = payload.data || {};
    const notificationTitle = data.title || payload.notification?.title || 'Thông báo mới';
    const notificationBody = data.body || payload.notification?.body || 'Bạn có thông báo mới.';

    const notificationOptions = {
        body: notificationBody,
        icon: '/logo512.png',
        badge: '/logo512.png',
        tag: data.tag || data.transferId || 'default', // Use tag to prevent duplicates
        renotify: false, // Don't re-notify for same tag
        data: data,
        vibrate: [100, 50, 100],
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/asset-transfer';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Focus existing window if available
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    return client.navigate(urlToOpen);
                }
            }
            // Open new window
            return clients.openWindow(urlToOpen);
        })
    );
});

console.log('[SW] Service Worker loaded - Combined PWA + Firebase Messaging');
