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
// Logic: Chỉ thông báo cho PHÒNG GỬI vì họ cần ký trước
exports.logTransferCreation = onDocumentCreated("transfers/{transferId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const transferData = snap.data();
    const { transferId } = event.params;
    const actor = transferData.createdBy || "unknown_actor";
    const actorName = actor?.name || "Ai đó";

    const displayId = transferData.maPhieuHienThi || `#${transferId.slice(0, 6)}`;

    // DEBUG: Log transfer data
    console.log(`[logTransferCreation] Transfer created:`, {
        transferId,
        displayId,
        from: transferData.from,
        to: transferData.to,
        fromDeptId: transferData.fromDeptId,
        toDeptId: transferData.toDeptId,
    });

    try {
        // Chỉ thông báo cho phòng GỬI (họ cần ký trước)
        // Try by deptId first, then by department name
        const deptIdToNotify = transferData.fromDeptId;
        const deptNameToNotify = transferData.from;

        console.log(`[logTransferCreation] Notifying sender dept: ID=${deptIdToNotify}, Name=${deptNameToNotify}`);

        if (deptIdToNotify) {
            await sendPushToDepartments(
                [deptIdToNotify],
                {
                    title: "📦 Phiếu Luân Chuyển Mới",
                    body: `${actorName} đã tạo phiếu luân chuyển ${displayId}: ${transferData.from} → ${transferData.to}. Vui lòng kiểm tra!`,
                },
                { url: "/asset-transfer", transferId }
            );
        }
    } catch (pushError) {
        console.error("[logTransferCreation] Error sending push:", pushError);
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
                        title: "✍️ Cần ký: Phiếu Luân Chuyển",
                        body: `${actorName} đã ký phiếu luân chuyển ${displayId}. P.Nhận vui lòng kiểm tra và duyệt!`,
                    },
                    { url: "/asset-transfer", transferId }
                );
            }
        } else if (signedRole === "receiver") {
            // Receiver signed → Notify admins (HC department)
            await sendPushToAdmins(
                {
                    title: "✍️ Phê duyệt: Phiếu Luân Chuyển",
                    body: `${displayId} đã được P.Nhận ký. P.Hành chính vui lòng phê duyệt cuối!`,
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
                        title: "✅ Hoàn tất: Phiếu Luân Chuyển",
                        body: `Phiếu luân chuyển ${displayId} đã được duyệt xong. Thiết bị đã được điều chuyển.`,
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
    const actorName = report?.requester?.name || "Ai đó";
    const reportTitle = report?.title || `Báo cáo ${reportId.slice(0, 6)}`;
    const target = {
        type: "inventory_report",
        id: reportId,
        name: reportTitle
    };

    // Write audit log
    await writeAuditLog(
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

    // Send push notification to HC department (first approvers)
    try {
        await sendPushToAdmins(
            {
                title: "📋 Báo Cáo Kiểm Kê Mới",
                body: `${actorName} đã tạo "${reportTitle}". P.Hành chính vui lòng kiểm tra và duyệt!`,
            },
            { url: "/asset-transfer", reportId }
        );
    } catch (pushError) {
        console.error("[logReportCreation] Error sending push:", pushError);
    }
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
    let signedKey = null;
    // Với báo cáo phòng: hc, deptLeader, director
    // Với báo cáo tổng hợp: hc, kt, director
    if (!b.hc && a.hc) { step = "P.HC"; signedKey = "hc"; }
    else if (!b.deptLeader && a.deptLeader) { step = "Lãnh đạo Phòng"; signedKey = "deptLeader"; }
    else if (!b.kt && a.kt) { step = "P.KT"; signedKey = "kt"; }
    else if (!b.director && a.director) { step = "BTGĐ"; signedKey = "director"; }

    if (!step) return null; // không phải cập nhật chữ ký

    // Lấy actor từ chữ ký mới
    const actor = a[signedKey] || { uid: "unknown_actor" };
    const actorName = actor?.name || "Ai đó";

    const { reportId } = event.params;
    const reportTitle = after?.title || `Báo cáo ${reportId.slice(0, 6)}`;
    const target = {
        type: "inventory_report",
        id: reportId,
        name: reportTitle
    };

    // Write audit log
    await writeAuditLog(
        "REPORT_SIGNED",
        actor,
        target,
        { step, status: after?.status },
        { origin: "trigger:logReportSignature" }
    );

    // Send push notifications based on which step was signed
    try {
        if (signedKey === "hc") {
            // HC signed → Notify department leader (if department report) or KT (if summary report)
            if (after?.type === "department" && after?.departmentId) {
                // Notify department
                await sendPushToDepartments(
                    [after.departmentId],
                    {
                        title: "✍️ Ký duyệt: Báo Cáo Kiểm Kê",
                        body: `${actorName} (P.HC) đã ký "${reportTitle}". Lãnh đạo phòng vui lòng duyệt!`,
                    },
                    { url: "/asset-transfer", reportId }
                );
            } else {
                // Summary report - notify admins (for KT to sign)
                await sendPushToAdmins(
                    {
                        title: "✍️ Ký duyệt: Báo Cáo Tổng Hợp",
                        body: `${actorName} (P.HC) đã ký "${reportTitle}". P.Kế toán vui lòng duyệt!`,
                    },
                    { url: "/asset-transfer", reportId }
                );
            }
        } else if (signedKey === "deptLeader" || signedKey === "kt") {
            // Dept Leader or KT signed → Notify Director (admins)
            await sendPushToAdmins(
                {
                    title: "✍️ Phê duyệt cuối: Báo Cáo Kiểm Kê",
                    body: `${actorName} (${step}) đã ký "${reportTitle}". Ban TGĐ vui lòng phê duyệt!`,
                },
                { url: "/asset-transfer", reportId }
            );
        } else if (signedKey === "director") {
            // Director signed (completed) → Notify all relevant parties
            const deptIds = after?.departmentId ? [after.departmentId] : [];
            if (deptIds.length > 0) {
                await sendPushToDepartments(
                    deptIds,
                    {
                        title: "✅ Hoàn tất: Báo Cáo Kiểm Kê",
                        body: `"${reportTitle}" đã được Ban TGĐ phê duyệt hoàn tất!`,
                    },
                    { url: "/asset-transfer", reportId }
                );
            }
            // Also notify HC/KT
            await sendPushToAdmins(
                {
                    title: "✅ Hoàn tất: Báo Cáo Kiểm Kê",
                    body: `"${reportTitle}" đã được Ban TGĐ phê duyệt hoàn tất!`,
                },
                { url: "/asset-transfer", reportId }
            );
        }
    } catch (pushError) {
        console.error("[logReportSignature] Error sending push:", pushError);
    }
});

