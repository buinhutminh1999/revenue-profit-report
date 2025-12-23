const {
    onDocumentCreated,
    onDocumentDeleted,
    onDocumentUpdated
} = require("firebase-functions/v2/firestore");
const { writeAuditLog } = require("../utils/audit");

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

// Import push notification helper
const { sendPushToDepartments, sendPushToAdmins } = require("../utils/sendPushNotification");

// 1. GỬI PUSH khi một phiếu luân chuyển MỚI được tạo
// NOTE: Audit log đã được ghi bởi transferController, trigger này chỉ gửi push
exports.logTransferCreation = onDocumentCreated("transfers/{transferId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const transferData = snap.data();
    const { transferId } = event.params;
    const actor = transferData.createdBy || "unknown_actor";
    const actorName = actor?.name || "Ai đó";

    // Send push notification to receiver department only (avoid duplicates)
    const displayId = transferData.maPhieuHienThi || `#${transferId.slice(0, 6)}`;
    try {
        // Only notify receiver department (they need to sign)
        // Admins can see via in-app notification from audit log
        if (transferData.toDeptId) {
            await sendPushToDepartments(
                [transferData.toDeptId],
                {
                    title: "📦 Có phiếu luân chuyển mới!",
                    body: `${actorName} gửi phiếu ${displayId} từ ${transferData.from} đến ${transferData.to}`,
                },
                { url: "/asset-transfer", transferId }
            );
        }
    } catch (pushError) {
        console.error("Error sending push for transfer creation:", pushError);
    }
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
    const displayId = afterData.maPhieuHienThi || `#${transferId.slice(0, 6)}`;
    const target = {
        type: "transfer",
        id: transferId,
        name: displayId,
    };
    const stepName = signedRole === "sender" ? "Phòng chuyển" : signedRole === "receiver" ? "Phòng nhận" : "P.Hành chính";

    // Write audit log
    await writeAuditLog("TRANSFER_SIGNED", actor, target, { step: stepName }, {
        origin: "trigger:logTransferSignature"
    });

    // Send push notification to next approver
    try {
        const actorName = actor?.name || "Ai đó";

        if (signedRole === "sender") {
            // Sender signed → Notify receiver department
            if (afterData.toDeptId) {
                await sendPushToDepartments(
                    [afterData.toDeptId],
                    {
                        title: "✍️ Cần ký duyệt phiếu",
                        body: `${actorName} đã ký phiếu ${displayId}. Đến lượt bạn duyệt!`,
                    },
                    { url: "/asset-transfer", transferId }
                );
            }
        } else if (signedRole === "receiver") {
            // Receiver signed → Notify admins (HC department)
            await sendPushToAdmins(
                {
                    title: "✍️ Phiếu cần duyệt cuối",
                    body: `${displayId} đã được phòng nhận ký. Cần P.HC duyệt!`,
                },
                { url: "/asset-transfer", transferId }
            );
        } else if (signedRole === "admin") {
            // Admin signed (completed) → Notify both departments
            const deptIds = [afterData.fromDeptId, afterData.toDeptId].filter(Boolean);
            if (deptIds.length > 0) {
                await sendPushToDepartments(
                    deptIds,
                    {
                        title: "✅ Phiếu đã hoàn thành!",
                        body: `Phiếu ${displayId} đã được duyệt xong.`,
                    },
                    { url: "/asset-transfer", transferId }
                );
            }
        }
    } catch (pushError) {
        console.error("Error sending push for transfer signature:", pushError);
    }
});

// ====================================================================
// NEW: CÁC TRIGGER LOG CHO BÁO CÁO KIỂM KÊ (inventory_reports)
// ====================================================================

exports.logReportCreation = onDocumentCreated("inventory_reports/{reportId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const report = snap.data();
    const { reportId } = event.params;

    const actor = report?.requester?.uid || "unknown_actor";
    const target = {
        type: "inventory_report",
        id: reportId,
        name: report?.title || `Report ${reportId.slice(0, 6)}`
    };

    return writeAuditLog(
        "REPORT_CREATED",
        actor,
        target,
        {
            type: report?.type,
            departmentId: report?.departmentId || null,
            status: report?.status
        },
        { origin: "trigger:logReportCreation" }
    );
});

exports.logReportDeletion = onDocumentDeleted("inventory_reports/{reportId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const report = snap.data();
    const { reportId } = event.params;

    // Nếu muốn bắt người xóa: client nên set report.deletedByUid trước khi xóa
    const actor = report?.deletedByUid || "unknown_actor";
    const target = {
        type: "inventory_report",
        id: reportId,
        name: report?.title || `Report ${reportId.slice(0, 6)}`
    };

    return writeAuditLog(
        "REPORT_DELETED",
        actor,
        target,
        { ...report },
        { origin: "trigger:logReportDeletion", severity: "WARNING" }
    );
});

exports.logReportSignature = onDocumentUpdated("inventory_reports/{reportId}", async (event) => {
    const before = event.data.before.data() || {};
    const after = event.data.after.data() || {};

    // So sánh chữ ký để xác định bước nào vừa ký
    const b = before.signatures || {};
    const a = after.signatures || {};

    let step = null;
    // Với báo cáo phòng: hc, deptLeader, director
    // Với báo cáo tổng hợp: hc, kt, director
    if (!b.hc && a.hc) step = "P.HC";
    else if (!b.deptLeader && a.deptLeader) step = "Lãnh đạo Phòng";
    else if (!b.kt && a.kt) step = "P.KT";
    else if (!b.director && a.director) step = "BTGĐ";

    if (!step) return null; // không phải cập nhật chữ ký

    // Lấy actor từ chữ ký mới
    const actor =
        (a.hc && !b.hc && a.hc) ||
        (a.deptLeader && !b.deptLeader && a.deptLeader) ||
        (a.kt && !b.kt && a.kt) ||
        (a.director && !b.director && a.director) ||
        { uid: "unknown_actor" };

    const { reportId } = event.params;
    const target = {
        type: "inventory_report",
        id: reportId,
        name: after?.title || `Report ${reportId.slice(0, 6)}`
    };

    return writeAuditLog(
        "REPORT_SIGNED",
        actor,
        target,
        { step, status: after?.status },
        { origin: "trigger:logReportSignature" }
    );
});
