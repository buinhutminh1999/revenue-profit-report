const { FieldValue, db, admin } = require("../config/firebase");
const logger = require("firebase-functions/logger");

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
            timestamp: FieldValue.serverTimestamp(),
            readBy: [],
        });
    } catch (e) {
        // Không để audit làm fail nghiệp vụ chính
        logger.warn("writeAuditLog warning:", e?.message || e);
    }
}

module.exports = {
    writeAuditLog
};
