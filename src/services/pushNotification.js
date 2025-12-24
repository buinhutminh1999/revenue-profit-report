// src/services/pushNotification.js
// Service for handling Push Notifications with Firebase Cloud Messaging

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from './firebase-config';

// VAPID Key from Firebase Console
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let messaging = null;

/**
 * Initialize Firebase Messaging
 * Must be called after Firebase app is initialized
 */
export const initializeMessaging = async () => {
    try {
        // Dynamic import to avoid SSR issues
        const { getMessaging: getMsg } = await import('firebase/messaging');
        const { initializeApp, getApps } = await import('firebase/app');

        if (getApps().length > 0) {
            messaging = getMsg();
            console.log('✅ Firebase Messaging initialized');
            return messaging;
        }
    } catch (error) {
        console.error('❌ Error initializing messaging:', error);
        return null;
    }
};

/**
 * Check if browser supports push notifications
 */
export const isPushSupported = () => {
    return 'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;
};

/**
 * Get current notification permission status
 */
export const getPermissionStatus = () => {
    if (!isPushSupported()) return 'unsupported';
    return Notification.permission; // 'granted', 'denied', or 'default'
};

/**
 * Request notification permission and get FCM token
 * @param {string} userId - Current user's UID
 * @param {object} userInfo - Optional user info to sync (departmentId, role, etc.)
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export const requestNotificationPermission = async (userId, userInfo = {}) => {
    if (!isPushSupported()) {
        return { success: false, error: 'Trình duyệt không hỗ trợ thông báo đẩy' };
    }

    if (!VAPID_KEY) {
        console.error('VAPID_KEY is not configured');
        return { success: false, error: 'VAPID key chưa được cấu hình' };
    }

    try {
        // Request permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            return { success: false, error: 'Người dùng từ chối nhận thông báo' };
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Service Worker registered:', registration);

        // Initialize messaging if not already done
        if (!messaging) {
            await initializeMessaging();
        }

        if (!messaging) {
            return { success: false, error: 'Không thể khởi tạo Firebase Messaging' };
        }

        // Get FCM token
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (!token) {
            return { success: false, error: 'Không thể lấy FCM token' };
        }

        console.log('✅ FCM Token:', token);

        // Save token to Firestore with user info
        await saveTokenToFirestore(userId, token, userInfo);

        return { success: true, token };
    } catch (error) {
        console.error('❌ Error requesting notification permission:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Save FCM token to Firestore for the user
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @param {object} userInfo - Additional user info to sync (departmentId, role, etc.)
 */
const saveTokenToFirestore = async (userId, token, userInfo = {}) => {
    if (!userId || !token) return;

    const userRef = doc(db, 'users', userId);

    try {
        // Build update data
        const updateData = {
            fcmTokens: arrayUnion(token),
            pushNotificationsEnabled: true,
            lastTokenUpdate: new Date()
        };

        // Add departmentId if provided
        if (userInfo.departmentId) {
            updateData.departmentId = userInfo.departmentId;
        }

        // Add role if provided  
        if (userInfo.role) {
            updateData.role = userInfo.role;
        }

        // Add email if provided
        if (userInfo.email) {
            updateData.email = userInfo.email;
        }

        await setDoc(userRef, updateData, { merge: true });

        console.log('✅ FCM token saved to Firestore', { userId, departmentId: userInfo.departmentId });
    } catch (error) {
        console.error('❌ Error saving FCM token:', error);
        throw error;
    }
};

/**
 * Remove FCM token from Firestore (when user disables notifications)
 */
export const removeTokenFromFirestore = async (userId, token) => {
    if (!userId || !token) return;

    const userRef = doc(db, 'users', userId);

    try {
        await setDoc(userRef, {
            fcmTokens: arrayRemove(token),
            pushNotificationsEnabled: false
        }, { merge: true });

        console.log('✅ FCM token removed from Firestore');
    } catch (error) {
        console.error('❌ Error removing FCM token:', error);
    }
};

/**
 * Setup foreground message listener
 * @param {function} callback - Function to call when message received
 */
export const setupForegroundListener = (callback) => {
    if (!messaging) {
        initializeMessaging().then(() => {
            if (messaging) {
                onMessage(messaging, (payload) => {
                    console.log('📬 Foreground message received:', payload);
                    callback?.(payload);
                });
            }
        });
    } else {
        onMessage(messaging, (payload) => {
            console.log('📬 Foreground message received:', payload);
            callback?.(payload);
        });
    }
};

/**
 * Get current FCM token (if permission already granted)
 */
export const getCurrentToken = async () => {
    if (!isPushSupported() || Notification.permission !== 'granted') {
        return null;
    }

    try {
        if (!messaging) {
            await initializeMessaging();
        }

        if (!messaging) return null;

        const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (!registration) return null;

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        return token;
    } catch (error) {
        console.error('Error getting current token:', error);
        return null;
    }
};
