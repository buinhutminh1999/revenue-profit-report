const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("../config/firebase");
const { ensureSignedIn, ensureAdmin } = require("../utils/auth");
const { writeAuditLog } = require("../utils/audit");
const { getDocumentNumberSettings, formatDisplayId } = require("../utils/documentNumber");
const logger = require("firebase-functions/logger");

exports.createInventoryReport = onCall(async (request) => {
    ensureSignedIn(request.auth);
    const { uid } = request.auth;
    const { type, departmentId, departmentName, blockName } = request.data;

    const counterRef = db.collection("counters").doc("inventoryReportCounter");

    if (!type ||
        (type === "DEPARTMENT_INVENTORY" && !departmentId) ||
        (type === "BLOCK_INVENTORY" && !blockName)
    ) {
        throw new HttpsError("invalid-argument", "Thiếu thông tin cần thiết để tạo báo cáo.");
    }

    try {
        const result = await db.runTransaction(async (tx) => {
            const counterDoc = await tx.get(counterRef);
            const newCounterValue = (counterDoc.data()?.currentValue || 0) + 1;

            // Lấy cấu hình mã phiếu từ settings
            const settings = await getDocumentNumberSettings("inventory_reports");
            const displayId = formatDisplayId(settings, newCounterValue);

            const userSnap = await tx.get(db.collection("users").doc(uid));
            const requester = {
                uid,
                name: userSnap.data()?.displayName || request.auth.token.name,
            };

            let reportData;

            if (type === "BLOCK_INVENTORY") {
                const deptsSnapshot = await db.collection("departments")
                    .where("managementBlock", "==", blockName)
                    .get();

                if (deptsSnapshot.empty) {
                    throw new Error(`Không tìm thấy phòng ban nào thuộc khối "${blockName}".`);
                }
                const deptIds = deptsSnapshot.docs.map((doc) => doc.id);

                const assetsSnap = await db.collection("assets").where("departmentId", "in", deptIds).get();
                const assetsInBlock = assetsSnap.docs.map((doc) => ({
                    id: doc.id, ...doc.data()
                }));

                reportData = {
                    type: "BLOCK_INVENTORY",
                    title: `Biên bản Bàn giao - Kiểm kê Tài sản ${blockName}`,
                    blockName: blockName,
                    assets: assetsInBlock,
                    // ✅ SỬA LẠI ĐÂY: Trạng thái bắt đầu phải là PENDING_HC
                    status: "PENDING_HC",
                    signatures: { hc: null, deptLeader: null, director: null },
                };
            } else if (type === "DEPARTMENT_INVENTORY") {
                const assetsSnap = await db.collection("assets").where("departmentId", "==", departmentId).get();
                const assetsInDept = assetsSnap.docs.map((doc) => ({
                    id: doc.id, ...doc.data()
                }));

                reportData = {
                    type: "DEPARTMENT_INVENTORY",
                    title: `Biên bản Bàn giao - Kiểm kê Tài sản Phòng ${departmentName}`,
                    departmentId: departmentId,
                    departmentName: departmentName,
                    assets: assetsInDept,
                    // ✅ SỬA LẠI ĐÂY: Trạng thái bắt đầu phải là PENDING_HC
                    status: "PENDING_HC",
                    signatures: { hc: null, deptLeader: null, director: null },
                };
            } else { // Logic cho type === "SUMMARY_REPORT"
                const allAssetsSnap = await db.collection("assets").get();
                const allAssets = allAssetsSnap.docs.map((doc) => ({
                    id: doc.id, ...doc.data()
                }));

                reportData = {
                    type: "SUMMARY_REPORT",
                    title: `Báo cáo Tổng hợp Tài sản Toàn Công ty`,
                    assets: allAssets,
                    status: "PENDING_HC",
                    signatures: { hc: null, kt: null, director: null },
                };
            }

            const payload = {
                ...reportData,
                maPhieuHienThi: displayId,
                requester,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            const newReportRef = db.collection("inventory_reports").doc();
            tx.set(newReportRef, payload);
            tx.update(counterRef, { currentValue: newCounterValue });

            return { reportId: newReportRef.id, displayId: displayId };
        });



        return { ok: true, reportId: result.reportId, displayId: result.displayId };
    } catch (error) {
        logger.error("Lỗi khi tạo báo cáo kiểm kê:", error);
        throw new HttpsError("internal", error.message || "Không thể tạo báo cáo trên server.");
    }
});

exports.deleteInventoryReport = onCall(async (request) => {
    await ensureAdmin(request.auth);

    const { reportId } = request.data || {};
    if (!reportId || typeof reportId !== "string") {
        throw new HttpsError("invalid-argument", "Thiếu reportId hợp lệ.");
    }

    const ref = db.collection("inventory_reports").doc(reportId);

    const snap = await ref.get();
    if (!snap.exists) {
        throw new HttpsError("not-found", "Báo cáo không tồn tại.");
    }

    // Ghi dấu người xoá để trigger có thể log đúng actor
    await ref.set(
        { deletedByUid: request.auth.uid },
        { merge: true }
    );

    await ref.delete();

    await writeAuditLog(
        "REPORT_DELETED_BY_CALLABLE",
        request.auth.uid,
        { type: "inventory_report", id: reportId },
        {},
        { request, origin: "callable:deleteInventoryReport", severity: "WARNING" }
    );

    return { ok: true, message: "Đã xoá báo cáo kiểm kê." };
});
