// functions/src/utils/sendPushNotification.js
// Helper function to send push notifications via Firebase Admin SDK

const admin = require("firebase-admin");

/**
 * Send push notification to specific users
 * @param {string[]} userIds - Array of user IDs to notify
 * @param {object} notification - Notification content {title, body}
 * @param {object} data - Additional data payload
 */
async function sendPushToUsers(userIds, notification, data = {}) {
    if (!userIds || userIds.length === 0) {
        console.log("No users to notify");
        return { success: 0, failure: 0 };
    }

    const db = admin.firestore();
    const tokens = [];

    // Collect FCM tokens from users
    for (const userId of userIds) {
        try {
            const userDoc = await db.collection("users").doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                    tokens.push(...userData.fcmTokens);
                }
            }
        } catch (error) {
            console.error(`Error fetching tokens for user ${userId}:`, error);
        }
    }

    if (tokens.length === 0) {
        console.log("No FCM tokens found for users");
        return { success: 0, failure: 0 };
    }

    // Remove duplicates
    const uniqueTokens = [...new Set(tokens)];

    console.log(`Sending push to ${uniqueTokens.length} tokens`);

    // Send multicast message
    const message = {
        notification: {
            title: notification.title,
            body: notification.body,
        },
        data: {
            ...data,
            click_action: data.url || "/asset-transfer",
        },
        tokens: uniqueTokens,
        webpush: {
            notification: {
                icon: "/logo192.png",
                badge: "/logo192.png",
                requireInteraction: true,
            },
            fcmOptions: {
                link: data.url || "/asset-transfer",
            },
        },
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Push sent: ${response.successCount} success, ${response.failureCount} failure`);

        // Clean up invalid tokens
        if (response.failureCount > 0) {
            const invalidTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error?.code;
                    if (
                        errorCode === "messaging/invalid-registration-token" ||
                        errorCode === "messaging/registration-token-not-registered"
                    ) {
                        invalidTokens.push(uniqueTokens[idx]);
                    }
                }
            });

            // Remove invalid tokens from Firestore
            if (invalidTokens.length > 0) {
                console.log(`Removing ${invalidTokens.length} invalid tokens`);
                for (const userId of userIds) {
                    try {
                        const userRef = db.collection("users").doc(userId);
                        await userRef.update({
                            fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
                        });
                    } catch (e) {
                        // Ignore errors
                    }
                }
            }
        }

        return {
            success: response.successCount,
            failure: response.failureCount,
        };
    } catch (error) {
        console.error("Error sending push notification:", error);
        return { success: 0, failure: uniqueTokens.length };
    }
}

/**
 * Send push notification to users in specific departments
 * @param {string[]} departmentIds - Array of department IDs
 * @param {object} notification - Notification content
 * @param {object} data - Additional data
 */
async function sendPushToDepartments(departmentIds, notification, data = {}) {
    if (!departmentIds || departmentIds.length === 0) {
        console.log("sendPushToDepartments: No department IDs provided");
        return { success: 0, failure: 0 };
    }

    const db = admin.firestore();
    const userIds = new Set();

    console.log(`sendPushToDepartments: Finding users in departments: ${departmentIds.join(", ")}`);

    // Find users in these departments (removed pushNotificationsEnabled filter)
    for (const deptId of departmentIds) {
        try {
            const usersSnapshot = await db
                .collection("users")
                .where("departmentId", "==", deptId)
                .get();

            console.log(`Department ${deptId}: Found ${usersSnapshot.size} users`);
            usersSnapshot.forEach((doc) => {
                const userData = doc.data();
                // Only add if user has fcmTokens
                if (userData.fcmTokens && userData.fcmTokens.length > 0) {
                    userIds.add(doc.id);
                    console.log(`  - User ${doc.id} has ${userData.fcmTokens.length} tokens`);
                }
            });
        } catch (error) {
            console.error(`Error fetching users for dept ${deptId}:`, error);
        }
    }

    console.log(`sendPushToDepartments: Total users with tokens: ${userIds.size}`);
    return sendPushToUsers([...userIds], notification, data);
}

/**
 * Send push notification to admins and HC/KT departments
 */
async function sendPushToAdmins(notification, data = {}) {
    const db = admin.firestore();
    const userIds = new Set();

    console.log("sendPushToAdmins: Finding admin users...");

    try {
        // Get admin users (removed pushNotificationsEnabled filter)
        const adminsSnapshot = await db
            .collection("users")
            .where("role", "==", "admin")
            .get();

        console.log(`Found ${adminsSnapshot.size} admin users`);
        adminsSnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.fcmTokens && userData.fcmTokens.length > 0) {
                userIds.add(doc.id);
                console.log(`  - Admin ${doc.id} has ${userData.fcmTokens.length} tokens`);
            }
        });

    } catch (error) {
        console.error("Error fetching admin users:", error);
    }

    console.log(`sendPushToAdmins: Total admins with tokens: ${userIds.size}`);
    return sendPushToUsers([...userIds], notification, data);
}

module.exports = {
    sendPushToUsers,
    sendPushToDepartments,
    sendPushToAdmins,
};
