const { db } = require("../config/firebase");

// Default settings nếu chưa có trong Firestore
const DEFAULT_SETTINGS = {
    transfers: {
        prefix: "PLC",
        yearFormat: "YYYY",
        numberPadding: 5,
        separator: "-"
    },
    asset_requests: {
        prefix: "PYC",
        yearFormat: "YYYY",
        numberPadding: 5,
        separator: "-"
    },
    inventory_reports: {
        prefix: "PBC",
        yearFormat: "YYYY",
        numberPadding: 5,
        separator: "-"
    }
};

/**
 * Lấy cấu hình mã phiếu từ Firestore
 * @param {string} type - Loại phiếu: 'transfers', 'asset_requests', 'inventory_reports'
 * @returns {Promise<object>} Cấu hình cho loại phiếu
 */
async function getDocumentNumberSettings(type) {
    try {
        const doc = await db.collection("settings").doc("documentNumberSettings").get();
        if (!doc.exists) {
            return DEFAULT_SETTINGS[type] || DEFAULT_SETTINGS.transfers;
        }
        const data = doc.data();
        return data[type] || DEFAULT_SETTINGS[type] || DEFAULT_SETTINGS.transfers;
    } catch (error) {
        console.error("Error getting document number settings:", error);
        return DEFAULT_SETTINGS[type] || DEFAULT_SETTINGS.transfers;
    }
}

/**
 * Format mã phiếu hiển thị
 * @param {object} settings - Cấu hình { prefix, yearFormat, numberPadding, separator }
 * @param {number} counter - Số thứ tự
 * @returns {string} Mã phiếu formatted
 */
function formatDisplayId(settings, counter) {
    const { prefix, yearFormat, numberPadding, separator } = settings;

    const currentYear = new Date().getFullYear();
    const year = yearFormat === "YY"
        ? String(currentYear).slice(-2)
        : String(currentYear);

    const number = String(counter).padStart(numberPadding || 5, "0");

    return `${prefix}${separator}${year}${separator}${number}`;
}

module.exports = {
    DEFAULT_SETTINGS,
    getDocumentNumberSettings,
    formatDisplayId
};
