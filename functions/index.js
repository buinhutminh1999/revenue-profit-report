// File: functions/index.js (v2)
/* eslint-disable no-console */

// --- Imports v2 ---
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
    onDocumentCreated,
    onDocumentDeleted,
    onDocumentUpdated
} = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { closeQuarterAndCarryOver } = require("./dataProcessing");

admin.initializeApp();
const db = admin.firestore();

// --- Cấu hình chung cho tất cả functions (v2) ---
setGlobalOptions({ region: "asia-southeast1" });

/** ----------------- Helpers chung (v2) ----------------- **/

/** Đảm bảo đã đăng nhập (dùng auth object của v2) */
function ensureSignedIn(auth) {
    if (!auth) {
        throw new HttpsError("unauthenticated", "Bạn phải đăng nhập.");
    }
}

/** Kiểm tra quyền admin (dùng auth object của v2) */
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

/**
 * Ghi audit log tối ưu:
 *  - Ưu tiên lấy email/name từ token của callable (nếu có)
 *  - Chỉ fallback gọi getUser khi cần
 *  - Ghi thêm origin, severity, ip, userAgent
 *
 * @param {string} action           - Mã hành động, ví dụ "USER_ROLE_SET"
 * @param {string|object} actor     - uid hoặc { uid, email?, name? }
 * @param {object|null} target      - Thực thể tác động { type, id, ... } hoặc null
 * @param {object} details          - Chi tiết bổ sung
 * @param {object} opts             - { request?, origin?, severity? }
 */
async function writeAuditLog(
    action,
    actor,
    target = null,
    details = {},
    opts = {}
) {
    try {
        const { request, origin = "unspecified", severity = "INFO" } = opts;

        // Chuẩn hóa actor
        const actorInfo =
            typeof actor === "string" ?
                { uid: actor } :
                actor && typeof actor === "object" ?
                    { ...actor } :
                    {};

        // Lấy thông tin từ auth token (callable)
        const token = request?.auth?.token;
        if (!actorInfo.uid && request?.auth?.uid) {
            actorInfo.uid = request.auth.uid;
        }
        if (!actorInfo.email && token?.email) actorInfo.email = token.email;
        if (!actorInfo.name && token?.name) actorInfo.name = token.name;

        // Fallback nhẹ sang Admin SDK nếu thiếu email/name
        if (actorInfo.uid && (!actorInfo.email || !actorInfo.name)) {
            try {
                const ur = await admin.auth().getUser(actorInfo.uid);
                actorInfo.email = actorInfo.email || ur.email || null;
                actorInfo.name = actorInfo.name || ur.displayName || null;
            } catch (e) {
                logger.debug(
                    "writeAuditLog: getUser fallback skipped:",
                    e.message
                );
            }
        }

        // Bổ sung ngữ cảnh HTTP (chỉ có ở callable)
        const ip = request?.rawRequest?.ip || null;
        const ua = request?.rawRequest?.headers?.["user-agent"] || null;

        await db.collection("audit_logs").add({
            action,
            actor: actorInfo.uid ? actorInfo : { uid: "unknown" },
            target: target || null,
            details: details || {},
            origin,
            severity, // INFO | WARNING | ERROR
            ip,
            userAgent: ua,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            readBy: [],
        });
    } catch (e) {
        // Không để audit làm fail nghiệp vụ chính
        logger.warn("writeAuditLog warning:", e?.message || e);
    }
}


/** ----------------- Cloud Functions (Callable - v2) ----------------- **/

exports.setUserRole = onCall(async (request) => {
    await ensureAdmin(request.auth);

    const { uid, role } = request.data || {};
    if (
        !uid ||
        typeof uid !== "string" ||
        !["admin", "manager", "user"].includes(role)
    ) {
        throw new HttpsError("invalid-argument", "Thiếu uid/role hợp lệ.");
    }

    const claims = { admin: role === "admin", manager: role === "manager" };

    try {
        await admin.auth().setCustomUserClaims(uid, claims);
        await db.collection("users").doc(uid).set({ role }, { merge: true });

        await writeAuditLog(
            "USER_ROLE_SET",
            request.auth.uid,
            { type: "user", id: uid },
            { role, claims },
            { request, origin: "callable:setUserRole" }
        );

        return { ok: true, claims };
    } catch (e) {
        console.error("setUserRole error:", e);
        throw new HttpsError("internal", e?.message || "Không gán được role.");
    }
});

exports.deleteUserByUid = onCall(async (request) => {
    await ensureAdmin(request.auth);

    const { uid } = request.data || {};
    if (!uid || typeof uid !== "string") {
        throw new HttpsError("invalid-argument", "Thiếu uid hợp lệ.");
    }
    if (uid === request.auth.uid) {
        throw new HttpsError(
            "failed-precondition",
            "Không thể tự xoá tài khoản đang đăng nhập."
        );
    }

    try {
        try {
            await admin.auth().deleteUser(uid);
        } catch (err) {
            if (err.code !== "auth/user-not-found") {
                throw new HttpsError(
                    "internal",
                    `Xoá Auth thất bại: ${err.message}`
                );
            }
        }

        await db.collection("users").doc(uid).delete();

        await writeAuditLog(
            "USER_DELETED",
            request.auth.uid,
            { type: "user", id: uid },
            {},
            { request, origin: "callable:deleteUserByUid", severity: "WARNING" }
        );

        return { ok: true };
    } catch (e) {
        console.error("deleteUserByUid error:", e);
        throw new HttpsError(
            "internal",
            e?.message || "Xoá người dùng thất bại."
        );
    }
});

exports.manualCloseQuarter = onCall(async (request) => {
    ensureSignedIn(request.auth);

    const { year, quarter } = request.data || {};
    if (!year || !quarter) {
        throw new HttpsError(
            "invalid-argument",
            "Vui lòng cung cấp đầy đủ năm và quý."
        );
    }

    console.log(
        `manualCloseQuarter by uid=${request.auth.uid} for Q${quarter}/${year}`
    );
    try {
        const result = await closeQuarterAndCarryOver(year, quarter);

        await writeAuditLog(
            "CLOSE_QUARTER",
            request.auth.uid,
            { type: "quarter", id: `Q${quarter}/${year}` },
            { year, quarter, result: "ok" },
            { request, origin: "callable:manualCloseQuarter" }
        );

        return result;
    } catch (error) {
        console.error("closeQuarterAndCarryOver error:", error);

        await writeAuditLog(
            "CLOSE_QUARTER_FAILED",
            request.auth.uid,
            { type: "quarter", id: `Q${quarter}/${year}` },
            { year, quarter, message: error?.message },
            {
                request,
                origin: "callable:manualCloseQuarter",
                severity: "ERROR",
            }
        );

        throw new HttpsError(
            "internal",
            "Đã xảy ra lỗi ở máy chủ khi xử lý.",
            error?.message
        );
    }
});
// ====================================================================
// NEW: FUNCTION XỬ LÝ YÊU CẦU THAY ĐỔI TÀI SẢN
// ====================================================================
exports.processAssetRequest = onCall(async (request) => {
    ensureSignedIn(request.auth);

    const { requestId, action, reason } = request.data;
    if (!requestId || !action) {
        throw new HttpsError("invalid-argument", "Thiếu ID yêu cầu hoặc hành động.");
    }

    const uid = request.auth.uid;
    const userSnap = await db.collection("users").doc(uid).get();
    const userData = userSnap.data() || {};
    const isAdmin = request.auth.token.admin === true;

    const requestRef = db.collection("asset_requests").doc(requestId);

    return db.runTransaction(async (transaction) => {
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists) {
            throw new HttpsError("not-found", "Yêu cầu không tồn tại.");
        }
        const reqData = requestDoc.data();
        const { status, type } = reqData;

        // --- Logic từ chối ---
        if (action === "reject") {
            if (status !== "PENDING_HC" && status !== "PENDING_KT") {
                throw new HttpsError("failed-precondition", "Yêu cầu đã được xử lý.");
            }
            transaction.update(requestRef, {
                status: "REJECTED",
                rejectionReason: reason || "Không có lý do",
                processedBy: { uid, name: userData.displayName || request.auth.token.email },
            });
            await writeAuditLog("ASSET_REQUEST_REJECTED", uid, { type: "asset_request", id: requestId }, { reason }, { request });
            return { ok: true, message: "Đã từ chối yêu cầu." };
        }

        // --- Logic duyệt ---
        const signature = {
            uid: uid,
            name: userData.displayName || request.auth.token.email || "Người duyệt",
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (status === "PENDING_HC") {
            const deptSnap = await db.collection("departments").doc(reqData.assetData.departmentId).get();
            const hcApprovers = deptSnap.data()?.hcStep3ApproverIds || [];
            if (!isAdmin && !hcApprovers.includes(uid)) {
                throw new HttpsError("permission-denied", "Bạn không có quyền duyệt P.HC cho phòng ban này.");
            }

            transaction.update(requestRef, {
                "status": "PENDING_KT", // SỬA LỖI: Thêm lại dấu ngoặc kép để nhất quán
                "signatures.hc": signature,
            });
            await writeAuditLog("ASSET_REQUEST_HC_APPROVED", uid, { type: "asset_request", id: requestId }, {}, { request });
            return { ok: true, message: "P.HC đã duyệt, chờ P.KT." };
        } else if (status === "PENDING_KT") {
            const deptId = reqData.assetData?.departmentId || reqData.departmentId;
            const deptSnap = await db.collection("departments").doc(deptId).get();
            const ktApprovers = deptSnap.data()?.ktApproverIds || [];
            if (!isAdmin && !ktApprovers.includes(uid)) {
                throw new HttpsError("permission-denied", "Bạn không có quyền duyệt P.KT cho phòng ban này.");
            }

            if (type === "ADD") {
                const newAssetRef = db.collection("assets").doc();
                transaction.set(newAssetRef, {
                    ...reqData.assetData,
                    createdByUid: reqData.requester.uid,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    reserved: 0,
                });
            } else if (type === "DECREASE") {
                const assetRef = db.collection("assets").doc(reqData.targetAssetId);
                transaction.update(assetRef, {
                    quantity: admin.firestore.FieldValue.increment(-reqData.quantityToDecrease),
                });
            } else if (type === "DELETE") {
                const assetRef = db.collection("assets").doc(reqData.targetAssetId);
                transaction.update(assetRef, { deletedByUid: uid });
                transaction.delete(assetRef);
            }

            transaction.update(requestRef, {
                "status": "COMPLETED", // SỬA LỖI: Thêm lại dấu ngoặc kép để nhất quán
                "signatures.kt": signature,
            });
            await writeAuditLog("ASSET_REQUEST_KT_APPROVED", uid, { type: "asset_request", id: requestId }, { executedType: type }, { request });
            return { ok: true, message: "Hoàn tất! Thay đổi đã được áp dụng." };
        } else {
            throw new HttpsError("failed-precondition", "Yêu cầu không ở trạng thái chờ duyệt.");
        }
    });
});

// ====================================================================
// NEW: FUNCTION ĐỂ XÓA YÊU CẦU THAY ĐỔI TÀI SẢN (CHỈ ADMIN)
// ====================================================================
exports.deleteAssetRequest = onCall(async (request) => {
    // Chỉ Admin mới có quyền chạy hàm này
    await ensureAdmin(request.auth);

    const { requestId } = request.data;
    if (!requestId) {
        throw new HttpsError("invalid-argument", "Thiếu ID của yêu cầu.");
    }

    try {
        const requestRef = db.collection("asset_requests").doc(requestId);

        // Ghi log hành động xóa trước khi thực hiện
        await writeAuditLog(
            "ASSET_REQUEST_DELETED",
            request.auth.uid,
            { type: "asset_request", id: requestId },
            {},
            { request, severity: "WARNING" }
        );

        // Thực hiện xóa
        await requestRef.delete();

        return { ok: true, message: "Đã xóa yêu cầu thành công." };
    } catch (error) {
        logger.error("deleteAssetRequest error:", error);
        throw new HttpsError("internal", "Xóa yêu cầu thất bại.", error.message);
    }
});

/** ----------------- Firestore Triggers (v2) ----------------- **/

exports.logAssetCreation = onDocumentCreated(
    "assets/{assetId}",
    async (event) => {
        const snap = event.data;
        if (!snap) {
            console.log("No data associated with the event");
            return;
        }
        const newAssetData = snap.data();
        const { assetId } = event.params;

        const actorUid = newAssetData.createdByUid;
        if (!actorUid) {
            console.warn(`Asset ${assetId} được tạo nhưng thiếu createdByUid.`);
            return;
        }

        const target = {
            type: "asset",
            id: assetId,
            name: newAssetData.name || "Không có tên",
        };
        const details = {
            name: newAssetData.name || null,
            quantity: newAssetData.quantity || null,
            unit: newAssetData.unit || null,
            departmentId: newAssetData.departmentId || null,
            notes: newAssetData.notes || "",
        };

        return writeAuditLog("ASSET_CREATED", actorUid, target, details, {
            origin: "trigger:logAssetCreation",
        });
    }
);

exports.logAssetDeletion = onDocumentDeleted(
    "assets/{assetId}",
    async (event) => {
        const snap = event.data;
        if (!snap) {
            console.log("No data associated with the event");
            return;
        }
        const deletedAssetData = snap.data();
        const { assetId } = event.params;

        const actorUid = deletedAssetData.deletedByUid || "unknown_actor";
        const target = {
            type: "asset",
            id: assetId,
            name: deletedAssetData.name || "Không có tên",
        };

        return writeAuditLog(
            "ASSET_DELETED",
            actorUid,
            target,
            { ...deletedAssetData },
            {
                origin: "trigger:logAssetDeletion",
                severity: "WARNING",
            }
        );
    }
);


// ====================================================================
// NEW: CÁC TRIGGER GHI LOG CHO PHIẾU LUÂN CHUYỂN
// ====================================================================

// 1. Ghi log khi một phiếu luân chuyển MỚI được tạo
exports.logTransferCreation = onDocumentCreated("transfers/{transferId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const transferData = snap.data();
    const { transferId } = event.params;
    const actor = transferData.createdBy || "unknown_actor";
    const target = {
        type: "transfer",
        id: transferId,
        name: `#${transferId.slice(0, 6)} từ ${transferData.from} đến ${transferData.to}`,
    };

    return writeAuditLog("TRANSFER_CREATED", actor, target, transferData, {
        origin: "trigger:logTransferCreation",
    });
});

// 2. Ghi log khi một phiếu luân chuyển BỊ XÓA
exports.logTransferDeletion = onDocumentDeleted("transfers/{transferId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const deletedData = snap.data();
    const { transferId } = event.params;

    // Giả sử client đã thêm deletedByUid vào document trước khi xóa
    // Nếu không, bạn cần một cách khác để xác định người xóa
    const actor = deletedData.deletedByUid || "unknown_actor";
    const target = {
        type: "transfer",
        id: transferId,
        name: `#${transferId.slice(0, 6)}`,
    };

    return writeAuditLog("TRANSFER_DELETED", actor, target, deletedData, {
        origin: "trigger:logTransferDeletion",
        severity: "WARNING",
    });
});

exports.logTransferSignature = onDocumentUpdated("transfers/{transferId}", async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // So sánh chữ ký để tìm ra ai vừa ký
    const signaturesBefore = beforeData.signatures || {};
    const signaturesAfter = afterData.signatures || {};

    let signedRole = null;
    if (!signaturesBefore.sender && signaturesAfter.sender) signedRole = "sender";
    else if (!signaturesBefore.receiver && signaturesAfter.receiver) signedRole = "receiver";
    else if (!signaturesBefore.admin && signaturesAfter.admin) signedRole = "admin";

    // Nếu không có chữ ký mới thì không làm gì cả
    if (!signedRole) return null;

    const actor = signaturesAfter[signedRole];
    const { transferId } = event.params;
    const target = {
        type: "transfer",
        id: transferId,
        name: `#${transferId.slice(0, 6)}`,
    };
    const stepName = signedRole === "sender" ? "Phòng chuyển" : signedRole === "receiver" ? "Phòng nhận" : "P.Hành chính";

    return writeAuditLog("TRANSFER_SIGNED", actor, target, { step: stepName }, {
        origin: "trigger:logTransferSignature"
    });
});
