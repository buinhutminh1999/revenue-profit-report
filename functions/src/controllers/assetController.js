const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("../config/firebase");
const { ensureSignedIn, ensureAdmin } = require("../utils/auth");
const { writeAuditLog } = require("../utils/audit");
const { findMatchingAsset } = require("../utils/common");
const { closeQuarterAndCarryOver } = require("../../dataProcessing");
const logger = require("firebase-functions/logger");

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

exports.createAssetRequest = onCall(async (request) => {
    ensureSignedIn(request.auth);
    const { uid } = request.auth;
    // ✅ Thêm 'quantity' để nhận số lượng cần xóa
    const { type, assetData, targetAssetId, assetsData, quantity } = request.data;

    try {
        const userSnap = await db.collection("users").doc(uid).get();
        const requester = { uid, name: userSnap.data()?.displayName || request.auth.token.email };
        const counterRef = db.collection("counters").doc("assetRequestCounter");

        switch (type) {
            case "ADD": {
                if (!assetData || !assetData.departmentId || !assetData.name) {
                    throw new HttpsError("invalid-argument", "Thiếu dữ liệu tài sản để tạo yêu cầu.");
                }
                const { newRequestRef, displayId } = await db.runTransaction(async (tx) => {
                    const counterDoc = await tx.get(counterRef);
                    const newCounterValue = (counterDoc.data()?.currentValue || 0) + 1;
                    const year = new Date().getFullYear();
                    const displayId = `PYC-${year}-${String(newCounterValue).padStart(5, "0")}`;
                    const requestPayload = {
                        type: "ADD",
                        status: "PENDING_HC",
                        requester,
                        assetData,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        signatures: { hc: null, kt: null },
                        maPhieuHienThi: displayId,
                    };
                    const newRequestRef = db.collection("asset_requests").doc();
                    tx.set(newRequestRef, requestPayload);
                    tx.update(counterRef, { currentValue: newCounterValue });
                    return { newRequestRef, displayId };
                });
                await writeAuditLog("ASSET_REQUEST_ADD_CREATED", uid, { type: "asset_request", id: newRequestRef.id }, { name: assetData.name, displayId }, { request });
                return { ok: true, message: "Yêu cầu đã được tạo.", displayId };
            }

            case "DELETE": {
                if (!targetAssetId) {
                    throw new HttpsError("invalid-argument", "Thiếu ID tài sản cần xóa.");
                }
                return db.runTransaction(async (tx) => {
                    const counterDoc = await tx.get(counterRef);
                    const newCounterValue = (counterDoc.data()?.currentValue || 0) + 1;
                    const year = new Date().getFullYear();
                    const displayId = `PYC-${year}-${String(newCounterValue).padStart(5, "0")}`;
                    const assetToDeleteSnap = await tx.get(db.collection("assets").doc(targetAssetId));
                    if (!assetToDeleteSnap.exists) {
                        throw new HttpsError("not-found", "Không tìm thấy tài sản để tạo yêu cầu xóa.");
                    }
                    const assetToDelete = assetToDeleteSnap.data();
                    const requestPayload = {
                        type: "DELETE",
                        status: "PENDING_HC",
                        requester,
                        targetAssetId,
                        departmentId: assetToDelete.departmentId,
                        assetData: {
                            name: assetToDelete.name,
                            quantity: assetToDelete.quantity,
                            unit: assetToDelete.unit,
                            departmentId: assetToDelete.departmentId
                        },
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        signatures: { hc: null, kt: null },
                        maPhieuHienThi: displayId,
                    };
                    const newRequestRef = db.collection("asset_requests").doc();
                    tx.set(newRequestRef, requestPayload);
                    tx.update(counterRef, { currentValue: newCounterValue });
                    await writeAuditLog("ASSET_REQUEST_DELETE_CREATED", uid, { type: "asset_request", id: newRequestRef.id }, { name: assetToDelete.name, displayId }, { request });
                    return { ok: true, message: "Yêu cầu xóa đã được tạo.", displayId };
                });
            }

            case "REDUCE_QUANTITY": {
                if (!targetAssetId || !quantity || Number(quantity) <= 0) {
                    throw new HttpsError("invalid-argument", "Thiếu ID tài sản hoặc số lượng không hợp lệ.");
                }

                return db.runTransaction(async (tx) => {
                    const counterDoc = await tx.get(counterRef);
                    const newCounterValue = (counterDoc.data()?.currentValue || 0) + 1;
                    const year = new Date().getFullYear();
                    const displayId = `PYC-${year}-${String(newCounterValue).padStart(5, "0")}`;

                    const assetToReduceSnap = await tx.get(db.collection("assets").doc(targetAssetId));
                    if (!assetToReduceSnap.exists) {
                        throw new HttpsError("not-found", "Không tìm thấy tài sản để tạo yêu cầu.");
                    }
                    const assetToReduce = assetToReduceSnap.data();

                    if (Number(quantity) > Number(assetToReduce.quantity)) {
                        throw new HttpsError("invalid-argument", `Số lượng yêu cầu xóa (${quantity}) lớn hơn số lượng tồn kho (${assetToReduce.quantity}).`);
                    }

                    const requestPayload = {
                        type: "REDUCE_QUANTITY", // <-- Lưu đúng type
                        status: "PENDING_HC",
                        requester,
                        targetAssetId,
                        departmentId: assetToReduce.departmentId,
                        assetData: { // Lưu thông tin tài sản VÀ số lượng cần giảm
                            name: assetToReduce.name,
                            quantity: Number(quantity), // Đây là số lượng cần giảm
                            unit: assetToReduce.unit,
                            departmentId: assetToReduce.departmentId
                        },
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        signatures: { hc: null, kt: null },
                        maPhieuHienThi: displayId,
                    };

                    const newRequestRef = db.collection("asset_requests").doc();
                    tx.set(newRequestRef, requestPayload);
                    tx.update(counterRef, { currentValue: newCounterValue });

                    await writeAuditLog("ASSET_REQUEST_REDUCE_CREATED", uid, { type: "asset_request", id: newRequestRef.id }, { name: assetToReduce.name, quantity: Number(quantity), displayId }, { request });

                    return { ok: true, message: "Yêu cầu giảm số lượng đã được tạo.", displayId };
                });
            }

            case "INCREASE_QUANTITY": {
                if (!targetAssetId || !quantity || Number(quantity) <= 0) {
                    throw new HttpsError("invalid-argument", "Thiếu ID tài sản hoặc số lượng không hợp lệ.");
                }

                return db.runTransaction(async (tx) => {
                    const counterDoc = await tx.get(counterRef);
                    const newCounterValue = (counterDoc.data()?.currentValue || 0) + 1;
                    const year = new Date().getFullYear();
                    const displayId = `PYC-${year}-${String(newCounterValue).padStart(5, "0")}`;

                    const assetToIncreaseSnap = await tx.get(db.collection("assets").doc(targetAssetId));
                    if (!assetToIncreaseSnap.exists) {
                        throw new HttpsError("not-found", "Không tìm thấy tài sản để tạo yêu cầu.");
                    }
                    const assetToIncrease = assetToIncreaseSnap.data();

                    const requestPayload = {
                        type: "INCREASE_QUANTITY",
                        status: "PENDING_HC", // Bắt đầu luồng duyệt
                        requester,
                        targetAssetId,
                        departmentId: assetToIncrease.departmentId,
                        assetData: { // Lưu thông tin tài sản VÀ số lượng cần *cộng*
                            name: assetToIncrease.name,
                            quantity: Number(quantity), // Đây là số lượng cần cộng
                            unit: assetToIncrease.unit,
                            departmentId: assetToIncrease.departmentId,
                            ...assetData // Ghi đè thông tin client gửi (nếu có)
                        },
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        signatures: { hc: null, kt: null },
                        maPhieuHienThi: displayId,
                    };

                    const newRequestRef = db.collection("asset_requests").doc();
                    tx.set(newRequestRef, requestPayload);
                    tx.update(counterRef, { currentValue: newCounterValue });

                    await writeAuditLog("ASSET_REQUEST_INCREASE_CREATED", uid, { type: "asset_request", id: newRequestRef.id }, { name: assetToIncrease.name, quantity: Number(quantity), displayId }, { request });

                    return { ok: true, message: "Yêu cầu tăng số lượng đã được tạo.", displayId };
                });
            }

            case "BATCH_ADD": {
                if (!Array.isArray(assetsData) || assetsData.length === 0) {
                    throw new HttpsError("invalid-argument", "Thiếu dữ liệu.");
                }
                const batch = db.batch();
                const year = new Date().getFullYear();
                const counterSnap = await counterRef.get();
                let counter = counterSnap.data()?.currentValue || 0;
                assetsData.forEach((singleAssetData) => {
                    counter++;
                    const displayId = `PYC-${year}-${String(counter).padStart(5, "0")}`;
                    const docRef = db.collection("asset_requests").doc();
                    batch.set(docRef, {
                        maPhieuHienThi: displayId,
                        type: "ADD",
                        status: "PENDING_HC",
                        requester,
                        assetData: singleAssetData,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        signatures: { hc: null, kt: null },
                    });
                });
                batch.update(counterRef, { currentValue: counter });
                await batch.commit();
                await writeAuditLog("ASSET_REQUEST_BATCH_ADD_CREATED", uid, null, { count: assetsData.length }, { request });
                return { ok: true, message: `Đã tạo ${assetsData.length} yêu cầu.` };
            }
            default:
                throw new HttpsError("invalid-argument", "Loại yêu cầu không hợp lệ.");
        }
    } catch (error) {
        logger.error("Lỗi khi tạo yêu cầu tài sản:", error);
        throw new HttpsError("internal", error.message || "Không thể tạo yêu cầu tài sản.");
    }
});

exports.processAssetRequest = onCall(async (request) => {
    ensureSignedIn(request.auth);
    const { uid, token } = request.auth;
    const isAdmin = token.admin === true;

    const { requestId, action } = request.data;
    if (!requestId || !action) {
        throw new HttpsError("invalid-argument", "Thiếu ID yêu cầu hoặc hành động.");
    }

    const configDoc = await db.collection("app_config").doc("leadership").get();
    if (!configDoc.exists) {
        throw new HttpsError("failed-precondition", "Không tìm thấy tệp cấu hình quyền.");
    }
    const leadershipConfig = configDoc.data();
    const permissionsConfig = leadershipConfig.approvalPermissions || {};
    // ✅ THÊM DÒNG NÀY: Lấy thông tin lãnh đạo khối
    const blockLeaders = leadershipConfig.blockLeaders || {};

    const requestRef = db.collection("asset_requests").doc(requestId);
    const userSnap = await db.collection("users").doc(uid).get();
    const userData = userSnap.data() || {};

    return db.runTransaction(async (transaction) => {
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists) {
            throw new HttpsError("not-found", "Yêu cầu không tồn tại.");
        }
        const reqData = requestDoc.data();
        const { status, type } = reqData;

        if (action === "reject") {
            const { reason } = request.data;
            if (status !== "PENDING_HC" && status !== "PENDING_KT" && status !== "PENDING_BLOCK_LEADER") {
                throw new HttpsError("failed-precondition", "Yêu cầu đã được xử lý hoặc đã bị từ chối.");
            }
            transaction.update(requestRef, {
                status: "REJECTED",
                rejectionReason: reason || "Không có lý do",
                processedBy: { uid, name: userData.displayName || token.email },
            });
            await writeAuditLog("ASSET_REQUEST_REJECTED", uid, { type: "asset_request", id: requestId }, { reason }, { request });
            return { ok: true, message: "Đã từ chối yêu cầu." };
        }

        const signature = {
            uid: uid,
            name: userData.displayName || token.email || "Người duyệt",
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const deptId = reqData.assetData?.departmentId || reqData.departmentId;
        if (!deptId) throw new HttpsError("failed-precondition", "Yêu cầu không có thông tin phòng ban.");
        const deptSnap = await transaction.get(db.collection("departments").doc(deptId));
        if (!deptSnap.exists) throw new HttpsError("not-found", "Phòng ban của yêu cầu không tồn tại.");
        const deptData = deptSnap.data();
        const managementBlock = deptData.managementBlock;

        if (status === "PENDING_HC") {
            const permissionGroupKey = managementBlock === "Nhà máy" ? "Nhà máy" : "default";
            const permissions = permissionsConfig[permissionGroupKey];
            if (!permissions) throw new HttpsError("failed-precondition", `Không có cấu hình quyền cho nhóm '${permissionGroupKey}'.`);

            const hcApprovers = permissions.hcApproverIds || [];
            if (!isAdmin && !hcApprovers.includes(uid)) {
                throw new HttpsError("permission-denied", "Bạn không có quyền duyệt P.HC cho nhóm này.");
            }
            transaction.update(requestRef, {
                "status": "PENDING_BLOCK_LEADER",
                "signatures.hc": signature,
            });

            const nextStepMessage = managementBlock ? `chờ Khối ${managementBlock} duyệt.` : "chờ Lãnh đạo Khối duyệt.";
            await writeAuditLog("ASSET_REQUEST_HC_APPROVED", uid, { type: "asset_request", id: requestId }, {}, { request });
            return { ok: true, message: `P.HC đã duyệt, ${nextStepMessage}` };
        } else if (status === "PENDING_BLOCK_LEADER") {
            if (!managementBlock || !blockLeaders[managementBlock]) {
                throw new HttpsError("failed-precondition", `Yêu cầu không có thông tin khối quản lý hợp lệ.`);
            }
            const leadersOfBlock = blockLeaders[managementBlock];
            const leaderIds = [...(leadersOfBlock.headIds || []), ...(leadersOfBlock.deputyIds || [])];

            if (!isAdmin && !leaderIds.includes(uid)) {
                throw new HttpsError("permission-denied", `Bạn không có quyền duyệt cho Khối ${managementBlock}.`);
            }

            transaction.update(requestRef, {
                "status": "PENDING_KT", // Chuyển đến bước P.KT
                "signatures.blockLeader": signature,
            });

            await writeAuditLog("ASSET_REQUEST_BLOCK_APPROVED", uid, { type: "asset_request", id: requestId }, {}, { request });
            return { ok: true, message: `Khối ${managementBlock} đã duyệt, chờ P.KT.` };
        } else if (status === "PENDING_KT") {
            const permissionGroupKey = managementBlock === "Nhà máy" ? "Nhà máy" : "default";
            const permissions = permissionsConfig[permissionGroupKey];
            if (!permissions) throw new HttpsError("failed-precondition", `Không có cấu hình quyền cho nhóm '${permissionGroupKey}'.`);

            const ktApprovers = permissions.ktApproverIds || [];
            if (!isAdmin && !ktApprovers.includes(uid)) {
                throw new HttpsError("permission-denied", "Bạn không có quyền duyệt P.KT cho nhóm này.");
            }

            if (type === "ADD") {
                const newAssetRef = db.collection("assets").doc();
                transaction.set(newAssetRef, { ...reqData.assetData, managementBlock: managementBlock || null, createdByUid: reqData.requester.uid, createdAt: admin.firestore.FieldValue.serverTimestamp(), reserved: 0 });
            } else if (type === "DELETE") {
                const assetRef = db.collection("assets").doc(reqData.targetAssetId);
                transaction.delete(assetRef);
            } else if (type === "REDUCE_QUANTITY") {
                const assetRef = db.collection("assets").doc(reqData.targetAssetId);
                const quantityToReduce = reqData.assetData.quantity;
                transaction.update(assetRef, { quantity: admin.firestore.FieldValue.increment(-quantityToReduce) });
            } else if (type === "INCREASE_QUANTITY") {
                const assetRef = db.collection("assets").doc(reqData.targetAssetId);
                const quantityToIncrease = reqData.assetData.quantity;
                transaction.update(assetRef, { quantity: admin.firestore.FieldValue.increment(quantityToIncrease) });
            }

            transaction.update(requestRef, {
                "status": "COMPLETED",
                "signatures.kt": signature,
            });
            await writeAuditLog("ASSET_REQUEST_KT_APPROVED", uid, { type: "asset_request", id: requestId }, { executedType: type }, { request });
            return { ok: true, message: "Hoàn tất! Thay đổi đã được áp dụng." };
        } else {
            throw new HttpsError("failed-precondition", "Yêu cầu không ở trạng thái chờ duyệt.");
        }
    });
});

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

exports.batchAddAssetsDirectly = onCall(async (request) => {
    await ensureAdmin(request.auth);
    const { uid } = request.auth;
    const { assetsData } = request.data;

    if (!Array.isArray(assetsData) || assetsData.length === 0) {
        throw new HttpsError("invalid-argument", "Thiếu dữ liệu tài sản.");
    }
    if (assetsData.length > 200) {
        throw new HttpsError("invalid-argument", "Chỉ có thể thêm tối đa 200 tài sản mỗi lần.");
    }

    try {
        const userSnap = await db.collection("users").doc(uid).get();
        const creatorName = userSnap.data()?.displayName || request.auth.token.email || "Admin";

        // ✅ LOGIC MỚI: Bỏ qua (SKIP) tài sản trùng

        // Tạo một mảng các promise, mỗi promise là một transaction
        const upsertPromises = assetsData.map(async (asset) => {
            // Validation cho từng tài sản
            if (!asset.name || !asset.departmentId || !asset.unit || !asset.quantity) {
                logger.warn("Bỏ qua tài sản không hợp lệ trong batch:", asset);
                return { status: "skipped", name: asset.name || "N/A" }; // Bỏ qua
            }
            const quantityToAdd = Number(asset.quantity) || 0;
            if (quantityToAdd <= 0) {
                return { status: "skipped", name: asset.name }; // Bỏ qua
            }

            // Chạy một transaction cho MỖI tài sản
            return db.runTransaction(async (tx) => {
                // Gọi hàm helper để tìm tài sản trùng
                const existingAssetSnap = await findMatchingAsset(tx, asset);

                if (existingAssetSnap) {
                    // ĐÃ TỒN TẠI: BỎ QUA (SKIP)
                    logger.log(`Skipping duplicate asset: ${asset.name}`);
                    return { status: "skipped", name: asset.name };
                } else {
                    // CHƯA TỒN TẠI: Thêm mới
                    const newAssetRef = db.collection("assets").doc();
                    tx.set(newAssetRef, {
                        ...asset,
                        quantity: quantityToAdd,
                        createdBy: { uid, name: creatorName },
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        reserved: 0,
                    });
                    return { status: "created", name: asset.name };
                }
            });
        });

        // Chờ tất cả transaction hoàn tất
        const results = await Promise.all(upsertPromises);

        const createdCount = results.filter((r) => r?.status === "created").length;
        const skippedCount = results.filter((r) => r?.status === "skipped").length;
        const skippedNames = results
            .filter((r) => r?.status === "skipped")
            .map((r) => r.name)
            .slice(0, 5); // Lấy 5 tên đầu tiên để báo lỗi

        await writeAuditLog(
            "ASSET_BATCH_ADD_WITH_SKIP", // Tên action mới
            uid,
            null,
            {
                created: createdCount,
                skipped: skippedCount,
                total: assetsData.length,
                skippedExamples: skippedNames.join(", ")
            },
            { request, origin: "callable:batchAddAssetsDirectly" }
        );

        // 5. Trả về kết quả
        let message = `Đã thêm ${createdCount} tài sản mới.`;
        if (skippedCount > 0) {
            message += ` ${skippedCount} tài sản bị bỏ qua vì đã tồn tại (VD: ${skippedNames.join(", ")}...).`;
        }

        return {
            ok: true,
            message: message
        };
    } catch (error) {
        logger.error("Lỗi khi thêm tài sản hàng loạt trực tiếp:", error);
        throw new HttpsError("internal", error.message || "Không thể thêm tài sản lên server.");
    }
});

exports.batchUpdateAssetDates = onCall(async (request) => {
    // 1. Đảm bảo người thực hiện là Admin
    await ensureAdmin(request.auth);
    const { uid } = request.auth;
    const { assetIds, newCheckDate } = request.data;

    // 2. Kiểm tra dữ liệu đầu vào
    if (!Array.isArray(assetIds) || assetIds.length === 0 || !newCheckDate) {
        throw new HttpsError("invalid-argument", "Dữ liệu không hợp lệ (thiếu IDs hoặc ngày).");
    }
    if (assetIds.length > 1000) { // Đặt giới hạn
        throw new HttpsError("invalid-argument", "Chỉ có thể cập nhật tối đa 1000 tài sản mỗi lần.");
    }

    const newDate = new Date(newCheckDate); // Chuyển chuỗi ISO về đối tượng Date
    if (isNaN(newDate.getTime())) {
        throw new HttpsError("invalid-argument", "Ngày không hợp lệ.");
    }

    const db = admin.firestore();

    // 3. Xử lý cập nhật hàng loạt (Batch Write)
    // Một batch chỉ cho phép tối đa 500 thao tác
    const chunks = [];
    for (let i = 0; i < assetIds.length; i += 500) {
        chunks.push(assetIds.slice(i, i + 500));
    }

    let successCount = 0;
    try {
        // Thực thi từng batch (chunk)
        for (const chunk of chunks) {
            const batch = db.batch();

            chunk.forEach((assetId) => {
                const docRef = db.collection("assets").doc(assetId);
                // Cập nhật trường lastChecked
                batch.update(docRef, { lastChecked: newDate });
            });

            await batch.commit();
            successCount += chunk.length;
        }

        // 4. Ghi log kiểm toán
        await writeAuditLog(
            "ASSET_DATES_BATCH_UPDATED",
            uid,
            null, // Hành động hàng loạt
            {
                count: successCount,
                newCheckDate: newCheckDate
            },
            { request, origin: "callable:batchUpdateAssetDates", severity: "INFO" }
        );

        // 5. Trả về kết quả
        return {
            success: true,
            message: `Đã cập nhật ngày kiểm kê cho ${successCount} tài sản.`,
        };
    } catch (error) {
        logger.error("Lỗi khi batchUpdateAssetDates: ", error);

        // ✅ ĐÂY LÀ DÒNG ĐÃ SỬA LỖI (thêm toán tử '+')
        throw new HttpsError("internal", "Cập nhật thất bại: " + error.message);
    }
});
