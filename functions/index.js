// File: functions/index.js
/* eslint-disable no-console */
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { closeQuarterAndCarryOver } = require("./dataProcessing");

admin.initializeApp();

/** ----------------- Helpers chung ----------------- **/

/** Đảm bảo đã đăng nhập; ném lỗi https phù hợp */
function ensureSignedIn(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Bạn phải đăng nhập."
    );
  }
}

/** Kiểm tra quyền admin: ưu tiên custom claims, fallback role trong Firestore */
async function ensureAdmin(context) {
  ensureSignedIn(context);

  // 1) custom claims
  const token = context.auth.token || {};
  if (token.admin === true) return;

  // 2) fallback role trong Firestore
  const uid = context.auth.uid;
  const snap = await admin.firestore().collection("users").doc(uid).get();
  const data = snap.exists ? snap.data() : null;
  if (!data || data.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Bạn không có quyền admin."
    );
  }
}

/** Ghi nhật ký đơn giản vào collection audit_logs */
async function writeAuditLog(action, actorUid, target, details = {}) {
  try {
    await admin.firestore().collection("audit_logs").add({
      action,
      actor: { uid: actorUid },
      target: target || null,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn("writeAuditLog warning:", e.message);
  }
}

/** ----------------- Cloud Functions ----------------- **/

/**
 * Gán role bằng custom claims: { admin: boolean, manager: boolean }
 * Chỉ admin hiện tại được phép gán.
 * data = { uid: string, role: "admin" | "manager" | "user" }
 */
exports.setUserRole = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    await ensureAdmin(context);

    const { uid, role } = data || {};
    if (!uid || typeof uid !== "string" || !["admin", "manager", "user"].includes(role)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Thiếu uid/role hợp lệ."
      );
    }

    const claims = {
      admin: role === "admin",
      manager: role === "manager",
    };

    try {
      await admin.auth().setCustomUserClaims(uid, claims);
      // Lưu cả role vào Firestore cho UI dùng (tuỳ ý)
      await admin.firestore().collection("users").doc(uid).set(
        { role },
        { merge: true }
      );

      await writeAuditLog("USER_ROLE_SET", context.auth.uid, { uid }, { role, claims });

      return { ok: true, claims };
    } catch (e) {
      console.error("setUserRole error:", e);
      throw new functions.https.HttpsError(
        "internal",
        e?.message || "Không gán được role."
      );
    }
  });

/**
 * Xoá người dùng theo UID:
 * - Xoá Auth user (nếu không còn, bỏ qua)
 * - Xoá doc Firestore: users/{uid}
 * - Ghi audit log
 */
exports.deleteUserByUid = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    await ensureAdmin(context);

    const { uid } = data || {};
    if (!uid || typeof uid !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Thiếu uid hợp lệ.");
    }
    if (uid === context.auth.uid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Không thể tự xoá tài khoản đang đăng nhập."
      );
    }

    try {
      // 1) Xoá trên Auth
      try {
        await admin.auth().deleteUser(uid);
      } catch (err) {
        // Nếu không tìm thấy user trên Auth – cho qua, tiếp tục dọn Firestore
        if (err.code !== "auth/user-not-found") {
          throw new functions.https.HttpsError("internal", `Xoá Auth thất bại: ${err.message}`);
        }
      }

      // 2) Xoá doc Firestore
      await admin.firestore().collection("users").doc(uid).delete();

      await writeAuditLog("USER_DELETED", context.auth.uid, { uid });

      return { ok: true };
    } catch (e) {
      console.error("deleteUserByUid error:", e);
      throw new functions.https.HttpsError(
        "internal",
        e?.message || "Xoá người dùng thất bại."
      );
    }
  });

/**
 * Khóa sổ theo quý (bạn đã có sẵn closeQuarterAndCarryOver)
 * data = { year: number, quarter: number }
 */
exports.manualCloseQuarter = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    ensureSignedIn(context);

    const { year, quarter } = data || {};
    if (!year || !quarter) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Vui lòng cung cấp đầy đủ năm và quý."
      );
    }

    console.log(
      `manualCloseQuarter by uid=${context.auth.uid} for Q${quarter}/${year}`
    );

    try {
      const result = await closeQuarterAndCarryOver(year, quarter);
      await writeAuditLog(
        "CLOSE_QUARTER",
        context.auth.uid,
        null,
        { year, quarter, result: "ok" }
      );
      return result;
    } catch (error) {
      console.error("closeQuarterAndCarryOver error:", error);
      await writeAuditLog(
        "CLOSE_QUARTER_FAILED",
        context.auth.uid,
        null,
        { year, quarter, message: error?.message }
      );
      throw new functions.https.HttpsError(
        "internal",
        "Đã xảy ra lỗi ở máy chủ khi xử lý.",
        error?.message
      );
    }
  });
