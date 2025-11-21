const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const { db, admin } = require("../config/firebase");

/**
 * [GIAI ĐOẠN 3 - v2] Tự động cập nhật ngày kiểm kê khi phiếu luân chuyển hoàn tất.
 */
exports.onTransferCompleted = onDocumentUpdated("transfers/{transferId}", async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // Chỉ chạy khi trạng thái thay đổi và chuyển thành "COMPLETED"
    if (beforeData.status !== "COMPLETED" && afterData.status === "COMPLETED") {
        const assets = afterData.assets;
        const { transferId } = event.params;

        if (!assets || assets.length === 0) {
            logger.log(`Phiếu ${transferId} hoàn tất nhưng không có tài sản.`);
            return;
        }

        const batch = db.batch();
        const now = admin.firestore.FieldValue.serverTimestamp();

        assets.forEach((asset) => {
            if (asset.id) {
                const assetRef = db.collection("assets").doc(asset.id);
                batch.update(assetRef, { lastChecked: now });
            }
        });

        try {
            await batch.commit();
            logger.log(`Đã cập nhật ngày kiểm kê cho ${assets.length} tài sản từ phiếu ${transferId}.`);
        } catch (error) {
            logger.error(`Lỗi khi cập nhật tài sản từ phiếu ${transferId}:`, error);
        }
    }
});
