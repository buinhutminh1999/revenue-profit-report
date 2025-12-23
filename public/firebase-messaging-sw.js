// Firebase Messaging Service Worker
// This file MUST be in the public folder and named exactly 'firebase-messaging-sw.js'

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
// These values should match your firebase-config.js
firebase.initializeApp({
    apiKey: "AIzaSyABAtDgu1RWl8yhHECA2WDqOYTO_6NNQ6I",
    authDomain: "revenue-profit-app.firebaseapp.com",
    projectId: "revenue-profit-app",
    storageBucket: "revenue-profit-app.firebasestorage.app",
    messagingSenderId: "468098013262",
    appId: "1:468098013262:web:6fb885532508fce54d0b1f"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message:', payload);

    const notificationTitle = payload.notification?.title || 'Thông báo mới';
    const notificationOptions = {
        body: payload.notification?.body || 'Bạn có thông báo mới.',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: payload.data?.tag || 'default',
        data: payload.data || {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/asset-transfer';

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    return client.navigate(urlToOpen);
                }
            }
            return clients.openWindow(urlToOpen);
        })
    );
});
