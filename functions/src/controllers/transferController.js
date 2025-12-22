const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("../config/firebase");
const { ensureSignedIn } = require("../utils/auth");
const { writeAuditLog } = require("../utils/audit");
const { getDocumentNumberSettings, formatDisplayId } = require("../utils/documentNumber");
const logger = require("firebase-functions/logger");

exports.createTransfer = onCall(async (request) => {
    ensureSignedIn(request.auth);
    const { uid } = request.auth;
    const { fromDeptId, toDeptId, assets, nonce } = request.data;

    if (!fromDeptId || !toDeptId || !Array.isArray(assets) || assets.length === 0 || !nonce) {
        throw new HttpsError("invalid-argument", "Thiếu thông tin cần thiết để tạo phiếu.");
    }

    const nonceRef = db.collection("processed_nonces").doc(nonce);
    const counterRef = db.collection("counters").doc("transferCounter");

    try {
        const result = await db.runTransaction(async (tx) => {
            const nonceDoc = await tx.get(nonceRef);
            if (nonceDoc.exists) {
                logger.log(`Nonce ${nonce} đã được xử lý. Trả về kết quả cũ.`);
                return { transferId: nonceDoc.data().transferId, displayId: nonceDoc.data().displayId };
            }

            const counterDoc = await tx.get(counterRef);
            const newCounterValue = (counterDoc.data()?.currentValue || 0) + 1;

            // Lấy cấu hình mã phiếu từ settings
            const settings = await getDocumentNumberSettings("transfers");
            const displayId = formatDisplayId(settings, newCounterValue);

            const fromDeptSnap = await tx.get(db.collection("departments").doc(fromDeptId));
            const toDeptSnap = await tx.get(db.collection("departments").doc(toDeptId));
            const userSnap = await tx.get(db.collection("users").doc(uid));

            if (!fromDeptSnap.exists || !toDeptSnap.exists) {
                throw new Error("Phòng ban không tồn tại.");
            }

            // ✅ Tính reserved ĐỘNG từ các phiếu PENDING thực tế
            // Lấy tất cả phiếu PENDING để tính reserved thực tế
            const pendingTransfersSnap = await db.collection("transfers")
                .where("status", "in", ["PENDING_SENDER", "PENDING_RECEIVER", "PENDING_ADMIN"])
                .get();

            // Tính reserved cho mỗi asset từ các phiếu PENDING
            const pendingReservedMap = new Map();
            pendingTransfersSnap.docs.forEach((doc) => {
                const transferData = doc.data();
                (transferData.assets || []).forEach((item) => {
                    const currentReserved = pendingReservedMap.get(item.id) || 0;
                    pendingReservedMap.set(item.id, currentReserved + Number(item.quantity || 0));
                });
            });

            for (const item of assets) {
                const assetRef = db.collection("assets").doc(item.id);
                const assetSnap = await tx.get(assetRef);
                if (!assetSnap.exists) throw new Error(`Tài sản không tồn tại: ${item.name}`);

                const aData = assetSnap.data();
                // Sử dụng reserved tính động thay vì giá trị stored
                const calculatedReserved = pendingReservedMap.get(item.id) || 0;
                const availableQty = Number(aData.quantity || 0) - calculatedReserved;
                if (item.quantity > availableQty) {
                    throw new Error(`"${item.name}" vượt tồn khả dụng trên server (${item.quantity} > ${availableQty}).`);
                }
            }

            for (const item of assets) {
                tx.update(db.collection("assets").doc(item.id), {
                    reserved: admin.firestore.FieldValue.increment(item.quantity)
                });
            }

            // ✅ BƯỚC 1: TẠO MẢNG CHỈ CHỨA ID
            const assetIds = assets.map((a) => a.id);

            const transferRef = db.collection("transfers").doc();
            tx.set(transferRef, {
                maPhieuHienThi: displayId,
                from: fromDeptSnap.data().name,
                to: toDeptSnap.data().name,
                fromDeptId,
                toDeptId,
                assets, // Giữ lại mảng object đầy đủ để hiển thị chi tiết phiếu
                // ✅ BƯỚC 2: LƯU MẢNG ID MỚI VÀO
                assetIds: assetIds,
                status: "PENDING_SENDER",
                date: admin.firestore.FieldValue.serverTimestamp(),
                signatures: { sender: null, receiver: null, admin: null },
                createdBy: {
                    uid: uid,
                    name: userSnap.data()?.displayName || request.auth.token.email || "Người tạo",
                },
                nonce: nonce,
            });

            tx.update(counterRef, { currentValue: newCounterValue });

            tx.set(nonceRef, {
                uid,
                transferId: transferRef.id,
                displayId: displayId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return { transferId: transferRef.id, displayId: displayId };
        });

        await writeAuditLog("TRANSFER_CREATED_VIA_FUNC", uid, { type: "transfer", id: result.transferId }, { displayId: result.displayId }, { request });
        return { ok: true, transferId: result.transferId, displayId: result.displayId };
    } catch (error) {
        logger.error("Transaction createTransfer thất bại:", error);
        throw new HttpsError("internal", error.message || "Không thể tạo phiếu chuyển trên server.");
    }
});
