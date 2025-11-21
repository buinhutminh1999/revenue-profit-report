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
