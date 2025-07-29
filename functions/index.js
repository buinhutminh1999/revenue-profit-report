// File: functions/index.js

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const {closeQuarterAndCarryOver} = require("./dataProcessing");

admin.initializeApp();

exports.manualCloseQuarter = functions
    .region("asia-southeast1")
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "Bạn phải đăng nhập để thực hiện chức năng này.",
            );
        }

        const {year, quarter} = data;
        if (!year || !quarter) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Vui lòng cung cấp đầy đủ năm và quý.",
            );
        }

        console.log(`Nhận yêu cầu khóa sổ Q${quarter}/${year} từ người dùng: ${context.auth.uid}`);

        try {
            const result = await closeQuarterAndCarryOver(year, quarter);
            return result;
        } catch (error) {
            console.error("Lỗi khi chạy closeQuarterAndCarryOver:", error);
            throw new functions.https.HttpsError(
                "internal",
                "Đã xảy ra lỗi ở máy chủ khi xử lý.",
                error.message,
            );
        }
    });
