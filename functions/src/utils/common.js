const { db } = require("../config/firebase");

/**
 * Tìm tài sản trùng khớp (cùng tên, đơn vị, kích thước, phòng ban) BÊN TRONG một transaction.
 * @param {admin.firestore.Transaction} tx - Transaction đang chạy.
 * @param {object} assetData - Dữ liệu tài sản cần kiểm tra.
 * @returns {Promise<admin.firestore.DocumentSnapshot | null>}
 */
async function findMatchingAsset(tx, assetData) {
    const { name, unit = "", size = "", departmentId } = assetData;
    if (!name || !departmentId) {
        // Nếu dữ liệu đầu vào không hợp lệ, trả về null
        return null;
    }

    // Chuẩn hóa dữ liệu để query chính xác
    const normalizedName = name.trim();
    const normalizedUnit = (unit || "").trim();
    const normalizedSize = (size || "").trim();

    const assetsRef = db.collection("assets");
    const q = assetsRef
        .where("departmentId", "==", departmentId)
        .where("name", "==", normalizedName)
        .where("unit", "==", normalizedUnit)
        .where("size", "==", normalizedSize)
        .limit(1); // Chỉ cần tìm 1 cái là đủ

    // Dùng tx.get() để đảm bảo an toàn trong transaction
    const snapshot = await tx.get(q);

    if (snapshot.empty) {
        return null;
    }

    return snapshot.docs[0]; // Trả về document đầu tiên tìm thấy
}

module.exports = {
    findMatchingAsset
};
