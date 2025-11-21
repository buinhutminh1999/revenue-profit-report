const { HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../config/firebase");

/**
 * Đảm bảo đã đăng nhập (dùng auth object của v2)
 * @param {object} auth - Auth object from request
 */
function ensureSignedIn(auth) {
    if (!auth) {
        throw new HttpsError("unauthenticated", "Bạn phải đăng nhập.");
    }
}

/**
 * Kiểm tra quyền admin (dùng auth object của v2)
 * @param {object} auth - Auth object from request
 */
async function ensureAdmin(auth) {
    ensureSignedIn(auth);

    const token = auth.token || {};
    if (token.admin === true) return;

    const uid = auth.uid;
    const snap = await db.collection("users").doc(uid).get();
    const data = snap.exists ? snap.data() : null;
    if (!data || data.role !== "admin") {
        throw new HttpsError("permission-denied", "Bạn không có quyền admin.");
    }
}

module.exports = {
    ensureSignedIn,
    ensureAdmin
};
