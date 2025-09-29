/* eslint-disable no-console */
const nodemailer = require("nodemailer");
const { getAuth: getAdminAuth } = require("firebase-admin/auth");
// --- Imports v2 ---
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const {
    onDocumentCreated,
    onDocumentDeleted,
    onDocumentUpdated
} = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");

setGlobalOptions({
    region: "asia-southeast1",
    cpu: "gcf_gen1",
    secrets: ["GMAIL_SMTP_USER", "GMAIL_SMTP_APP_PASSWORD", "BK_INGEST_SECRET"],
});

const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { closeQuarterAndCarryOver } = require("./dataProcessing");


admin.initializeApp();

const db = admin.firestore();
// ==== REPLACE FROM HERE (email/env/config helpers) ====
const BK_INGEST_SECRET = defineSecret("BK_INGEST_SECRET");
const { onSchedule } = require("firebase-functions/v2/scheduler");

// ENV secrets (Gmail)
const gmailUser = process.env.GMAIL_SMTP_USER; // ví dụ: yourname@gmail.com
const gmailPass = process.env.GMAIL_SMTP_APP_PASSWORD; // app password 16 ký tự

// URL frontend cho ActionCodeSettings (điền bằng biến môi trường nếu có)
const FRONTEND_URL =
    process.env.FRONTEND_URL || "https://revenue-profit-report.vercel.app";
// Khi test local, tạm đặt FRONTEND_URL=http://localhost:3000

// Transporter Gmail (App Password)
const gmailTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465, // SSL
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
});

// ActionCodeSettings: nơi người dùng quay về sau khi reset/verify
const DEFAULT_ACS = {
    url: `${FRONTEND_URL}/login`,
    handleCodeInApp: true,
};
// ✅ THAY THẾ TOÀN BỘ HÀM TEMPLATE CŨ BẰNG HÀM "BULLETPROOF" NÀY
/**
 * Tạo template email mời với độ tương thích cao nhất (bulletproof).
 * @param {string} displayName Tên người nhận.
 * @param {string} actionLink URL để tạo mật khẩu.
 * @returns {string} Chuỗi HTML của email.
 */
function createModernInviteEmailHtml(displayName, actionLink) {
    // --- TÙY CHỈNH THƯƠNG HIỆU ---
    const companyName = "Công ty Cổ phần Xây dựng Bách Khoa";
    // Logo của công ty bạn
    const logoUrl = "https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png";
    const primaryColor = "#1a73e8"; // Màu chủ đạo
    const year = new Date().getFullYear();
    // ----------------------------

    return `
    <!DOCTYPE html>
    <html lang="vi" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>Lời mời tham gia hệ thống</title>
        <style>
            /* General Styles */
            body {
                font-family: Arial, sans-serif;
                margin: 0 !important;
                padding: 0 !important;
                background-color: #f4f7f6;
            }
            h1 { font-size: 24px; color: #333333; font-weight: bold; }
            p { font-size: 16px; color: #555555; line-height: 1.7; }

            /* Dark Mode Overrides */
            @media (prefers-color-scheme: dark) {
                body { background-color: #121212 !important; }
                .email-card { background-color: #1e1e1e !important; }
                h1 { color: #e0e0e0 !important; }
                p, .footer-text { color: #bbbbbb !important; }
                .divider-line { border-top-color: #444444 !important; }
                .fallback-link a { color: #82a5ff !important; }
            }
        </style>
    </head>
    <body style="margin: 0 !important; padding: 0 !important; background-color: #f4f7f6;">
        <div style="display: none; max-height: 0; overflow: hidden;">
            Chào mừng bạn đến với hệ thống của ${companyName}. Hãy tạo mật khẩu để bắt đầu.
        </div>
    
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td style="padding: 20px 0;">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 30px;" class="email-card">
                        
                        <tr>
                            <td align="center" style="padding-bottom: 20px; border-bottom: 1px solid #dddddd;" class="divider-line">
                                <img src="${logoUrl}" alt="${companyName} Logo" width="140" style="max-width: 140px;" />
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 30px 0;">
                                <h1>Chào mừng bạn, ${displayName}!</h1>
                                <p>Một tài khoản đã được tạo cho bạn tại hệ thống của <strong>${companyName}</strong>. Để hoàn tất thiết lập, vui lòng nhấn vào nút bên dưới để tạo mật khẩu đầu tiên.</p>
                            </td>
                        </tr>

                        <tr>
                            <td align="center">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="background-color: ${primaryColor}; border-radius: 8px;">
                                            <a href="${actionLink}" target="_blank" style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; display: inline-block;">
                                                Tạo Mật Khẩu & Đăng Nhập
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding-top: 30px; border-top: 1px solid #dddddd; margin-top: 30px;" class="divider-line">
                                <p class="fallback-link" style="font-size: 12px; text-align: center; color: #888888;">
                                    Nếu nút không hoạt động, sao chép link sau vào trình duyệt:<br/>
                                    <a href="${actionLink}" target="_blank" style="color: #888888;">${actionLink.substring(0, 50)}...</a>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <td align="center" style="padding-top: 20px;">
                                 <p class="footer-text" style="font-size: 12px; color: #888888;">&copy; ${year} ${companyName}. All Rights Reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;
}
// Tạo link verify/reset bằng Admin SDK
async function createActionLink(type, email, acs = DEFAULT_ACS) {
    const auth = getAdminAuth();
    if (type === "VERIFY") return auth.generateEmailVerificationLink(email, acs);
    if (type === "RESET") return auth.generatePasswordResetLink(email, acs);
    throw new HttpsError("invalid-argument", "type phải là VERIFY hoặc RESET");
}

// Gửi mail qua Gmail
async function sendWithGmail({ to, subject, html, fromName = "Bách Khoa" }) {
    if (!gmailUser || !gmailPass) {
        throw new HttpsError("failed-precondition", "Chưa cấu hình GMAIL_SMTP_USER / GMAIL_SMTP_APP_PASSWORD");
    }
    const from = `"${fromName}" <${gmailUser}>`;
    return gmailTransporter.sendMail({
        from,
        to,
        subject,
        html,
        text: html.replace(/<[^>]*>/g, ""),
        replyTo: gmailUser,
        headers: { "X-Priority": "1 (Highest)", "X-MSMail-Priority": "High", "Importance": "High" },
    });
}

// ==== REPLACE UNTIL HERE ====


/** ----------------- Helpers chung (v2) ----------------- **/

/** Đảm bảo đã đăng nhập (dùng auth object của v2) */
function ensureSignedIn(auth) {
    if (!auth) {
        throw new HttpsError("unauthenticated", "Bạn phải đăng nhập.");
    }
}

/** Kiểm tra quyền admin (dùng auth object của v2) */
async function ensureAdmin(auth) {
    ensureSignedIn(auth);

    const token = auth.token || {};
    if (token.admin === true) return;

    const uid = auth.uid;
    const snap = await db.collection("users").doc(uid).get();
    const data = snap.exists ? snap.data() : null;
    if (!data || data.role !== "admin") {
        throw new HttpsError("permission-denied", "Bạn không có quyền admin.");
    }
}


/**
 * Ghi audit log tối ưu:
 *  - Ưu tiên lấy email/name từ token của callable (nếu có)
 *  - Chỉ fallback gọi getUser khi cần
 *  - Ghi thêm origin, severity, ip, userAgent
 *
 * @param {string} action           - Mã hành động, ví dụ "USER_ROLE_SET"
 * @param {string|object} actor     - uid hoặc { uid, email?, name? }
 * @param {object|null} target      - Thực thể tác động { type, id, ... } hoặc null
 * @param {object} details          - Chi tiết bổ sung
 * @param {object} opts             - { request?, origin?, severity? }
 */
async function writeAuditLog(
    action,
    actor,
    target = null,
    details = {},
    opts = {}
) {
    try {
        const { request, origin = "unspecified", severity = "INFO" } = opts;

        // Chuẩn hóa actor
        const actorInfo =
            typeof actor === "string" ?
                { uid: actor } :
                actor && typeof actor === "object" ?
                    { ...actor } :
                    {};

        // Lấy thông tin từ auth token (callable)
        const token = request?.auth?.token;
        if (!actorInfo.uid && request?.auth?.uid) {
            actorInfo.uid = request.auth.uid;
        }
        if (!actorInfo.email && token?.email) actorInfo.email = token.email;
        if (!actorInfo.name && token?.name) actorInfo.name = token.name;

        // Fallback nhẹ sang Admin SDK nếu thiếu email/name
        if (actorInfo.uid && (!actorInfo.email || !actorInfo.name)) {
            try {
                const ur = await admin.auth().getUser(actorInfo.uid);
                actorInfo.email = actorInfo.email || ur.email || null;
                actorInfo.name = actorInfo.name || ur.displayName || null;
            } catch (e) {
                logger.debug(
                    "writeAuditLog: getUser fallback skipped:",
                    e.message
                );
            }
        }

        // Bổ sung ngữ cảnh HTTP (chỉ có ở callable)
        const ip = request?.rawRequest?.ip || null;
        const ua = request?.rawRequest?.headers?.["user-agent"] || null;

        await db.collection("audit_logs").add({
            action,
            actor: actorInfo.uid ? actorInfo : { uid: "unknown" },
            target: target || null,
            details: details || {},
            origin,
            severity, // INFO | WARNING | ERROR
            ip,
            userAgent: ua,
            timestamp: FieldValue.serverTimestamp(),
            readBy: [],
        });
    } catch (e) {
        // Không để audit làm fail nghiệp vụ chính
        logger.warn("writeAuditLog warning:", e?.message || e);
    }
}


/** ----------------- Cloud Functions (Callable - v2) ----------------- **/

exports.setUserRole = onCall(async (request) => {
    await ensureAdmin(request.auth);

    const { uid, role } = request.data || {};
    if (
        !uid ||
        typeof uid !== "string" ||
        !["admin", "manager", "user"].includes(role)
    ) {
        throw new HttpsError("invalid-argument", "Thiếu uid/role hợp lệ.");
    }

    const claims = { admin: role === "admin", manager: role === "manager" };

    try {
        await admin.auth().setCustomUserClaims(uid, claims);
        await db.collection("users").doc(uid).set({ role }, { merge: true });

        await writeAuditLog(
            "USER_ROLE_SET",
            request.auth.uid,
            { type: "user", id: uid },
            { role, claims },
            { request, origin: "callable:setUserRole" }
        );

        return { ok: true, claims };
    } catch (e) {
        console.error("setUserRole error:", e);
        throw new HttpsError("internal", e?.message || "Không gán được role.");
    }
});

exports.deleteUserByUid = onCall(async (request) => {
    await ensureAdmin(request.auth);

    const { uid } = request.data || {};
    if (!uid || typeof uid !== "string") {
        throw new HttpsError("invalid-argument", "Thiếu uid hợp lệ.");
    }
    if (uid === request.auth.uid) {
        throw new HttpsError(
            "failed-precondition",
            "Không thể tự xoá tài khoản đang đăng nhập."
        );
    }

    try {
        try {
            await admin.auth().deleteUser(uid);
        } catch (err) {
            if (err.code !== "auth/user-not-found") {
                throw new HttpsError(
                    "internal",
                    `Xoá Auth thất bại: ${err.message}`
                );
            }
        }

        await db.collection("users").doc(uid).delete();

        await writeAuditLog(
            "USER_DELETED",
            request.auth.uid,
            { type: "user", id: uid },
            {},
            { request, origin: "callable:deleteUserByUid", severity: "WARNING" }
        );

        return { ok: true };
    } catch (e) {
        console.error("deleteUserByUid error:", e);
        throw new HttpsError(
            "internal",
            e?.message || "Xoá người dùng thất bại."
        );
    }
});


// ==== THAY THẾ HÀM inviteUser ====
exports.inviteUser = onCall(async (request) => {
    await ensureAdmin(request.auth);

    const { email, displayName, role, primaryDepartmentId, managedDepartmentIds } = request.data;
    if (!email || !displayName) {
        throw new HttpsError("invalid-argument", "Vui lòng cung cấp đầy đủ email và tên hiển thị.");
    }

    try {
        // 1) Tạo user trên Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            displayName,
            emailVerified: false,
        });

        // 2) Ghi thông tin user vào Firestore
        await db.collection("users").doc(userRecord.uid).set({
            email,
            displayName,
            role: role || "nhan-vien",
            primaryDepartmentId: primaryDepartmentId || null,
            managedDepartmentIds: managedDepartmentIds || [],
            createdAt: FieldValue.serverTimestamp(),
        });

        // 3) Tạo link để người dùng tạo mật khẩu đầu tiên
        const actionLink = await createActionLink("RESET", email, DEFAULT_ACS);

        // 4) GỌI HÀM TEMPLATE MỚI
        const emailHtml = createModernInviteEmailHtml(displayName, actionLink);

        // 5) Gửi mail bằng transporter của bạn (Gmail)
        await sendWithGmail({
            to: email,
            subject: `[Bách Khoa] Lời mời tham gia hệ thống và tạo mật khẩu`, // Tiêu đề rõ ràng, chuyên nghiệp hơn
            html: emailHtml,
        });

        // 6) Ghi log kiểm toán
        await writeAuditLog(
            "USER_CREATED_AND_INVITED",
            request.auth.uid,
            { type: "user", id: userRecord.uid, name: displayName },
            { email, role },
            { request, origin: "callable:inviteUser" }
        );

        return { success: true, message: `Đã tạo tài khoản & gửi lời mời thành công tới ${email}.` };
    } catch (error) {
        logger.error("Lỗi khi mời người dùng:", error);
        if (error.code === "auth/email-already-exists") {
            throw new HttpsError("already-exists", "Email này đã được sử dụng.");
        }
        throw new HttpsError("internal", error.message || "Đã xảy ra lỗi khi tạo lời mời.");
    }
});


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

// ====================================================================
// HÀM 1: TẠO PHIẾU LUÂN CHUYỂN
// ====================================================================
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
            const year = new Date().getFullYear();
            const displayId = `PLC-${year}-${String(newCounterValue).padStart(5, "0")}`;

            const fromDeptSnap = await tx.get(db.collection("departments").doc(fromDeptId));
            const toDeptSnap = await tx.get(db.collection("departments").doc(toDeptId));
            const userSnap = await tx.get(db.collection("users").doc(uid));

            if (!fromDeptSnap.exists || !toDeptSnap.exists) {
                throw new Error("Phòng ban không tồn tại.");
            }

            for (const item of assets) {
                const assetRef = db.collection("assets").doc(item.id);
                const assetSnap = await tx.get(assetRef);
                if (!assetSnap.exists) throw new Error(`Tài sản không tồn tại: ${item.name}`);

                const aData = assetSnap.data();
                const availableQty = Number(aData.quantity || 0) - Number(aData.reserved || 0);
                if (item.quantity > availableQty) {
                    throw new Error(`"${item.name}" vượt tồn khả dụng trên server (${item.quantity} > ${availableQty}).`);
                }
            }

            for (const item of assets) {
                tx.update(db.collection("assets").doc(item.id), {
                    reserved: admin.firestore.FieldValue.increment(item.quantity)
                });
            }

            const transferRef = db.collection("transfers").doc();
            tx.set(transferRef, {
                maPhieuHienThi: displayId,
                from: fromDeptSnap.data().name,
                to: toDeptSnap.data().name,
                fromDeptId,
                toDeptId,
                assets,
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
// File: functions/index.js (v2)

// ====================================================================
// HÀM 1: THAY THẾ TOÀN BỘ HÀM createAssetRequest CŨ BẰNG HÀM NÀY
// ====================================================================
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
                // ... (Logic cho "ADD" không thay đổi)
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
                // ... (Logic cho "DELETE" không thay đổi)
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

            // ✅ BẮT ĐẦU CASE MỚI CHO VIỆC GIẢM SỐ LƯỢNG
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
            // ✅ KẾT THÚC CASE MỚI

            case "BATCH_ADD": {
                // ... (Logic cho "BATCH_ADD" không thay đổi)
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

// ====================================================================
// HÀM 3: TẠO BÁO CÁO KIỂM KÊ (SỬA LỖI TRẠNG THÁI BAN ĐẦU)
// ====================================================================
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
            const year = new Date().getFullYear();
            const displayId = `PBC-${year}-${String(newCounterValue).padStart(5, "0")}`;

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

        await writeAuditLog("REPORT_CREATED_VIA_FUNC", uid, { type: "inventory_report", id: result.reportId }, { type, displayId: result.displayId }, { request });

        return { ok: true, reportId: result.reportId, displayId: result.displayId };
    } catch (error) {
        logger.error("Lỗi khi tạo báo cáo kiểm kê:", error);
        throw new HttpsError("internal", error.message || "Không thể tạo báo cáo trên server.");
    }
});

// TÌM VÀ THAY THẾ TOÀN BỘ HÀM NÀY
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
            // ... (Logic "reject" không thay đổi)
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
            // eslint-disable-next-line brace-style
        }

        // ✅ THÊM TOÀN BỘ KHỐI NÀY VÀO
        else if (status === "PENDING_BLOCK_LEADER") {
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

/**
 * [GIAI ĐOẠN 2 - v2] Tự động cập nhật ngày kiểm kê khi báo cáo kiểm kê hoàn tất.
 */
exports.onReportCompleted = onDocumentUpdated("inventory_reports/{reportId}", async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    if (beforeData.status !== "COMPLETED" && afterData.status === "COMPLETED") {
        const assets = afterData.assets;
        const { reportId } = event.params;

        if (!assets || assets.length === 0) {
            logger.log(`Báo cáo ${reportId} hoàn tất nhưng không có tài sản.`);
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
            logger.log(`Đã cập nhật ngày kiểm kê cho ${assets.length} tài sản từ báo cáo ${reportId}.`);
        } catch (error) {
            logger.error(`Lỗi khi cập nhật tài sản từ báo cáo ${reportId}:`, error);
        }
    }
});
// ====================================================================
// NEW: FUNCTION ĐỂ XÓA YÊU CẦU THAY ĐỔI TÀI SẢN (CHỈ ADMIN)
// ====================================================================
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
// ====================================================================
// NEW (optional): Callable xoá báo cáo kiểm kê (chỉ Admin)
// ====================================================================
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

// Thêm toàn bộ hàm mới này vào file functions/index.js của bạn

// ====================================================================
// HÀM MỚI: THÊM TÀI SẢN HÀNG LOẠT TRỰC TIẾP (CHỈ ADMIN)
// ====================================================================
exports.batchAddAssetsDirectly = onCall(async (request) => {
    // 1. Đảm bảo người thực hiện là Admin
    await ensureAdmin(request.auth);
    const { uid } = request.auth;
    const { assetsData } = request.data;

    // 2. Kiểm tra dữ liệu đầu vào
    if (!Array.isArray(assetsData) || assetsData.length === 0) {
        throw new HttpsError("invalid-argument", "Thiếu dữ liệu tài sản.");
    }
    if (assetsData.length > 200) { // Đặt giới hạn để tránh quá tải
        throw new HttpsError("invalid-argument", "Chỉ có thể thêm tối đa 200 tài sản mỗi lần.");
    }

    try {
        const batch = db.batch();
        const userSnap = await db.collection("users").doc(uid).get();
        const creatorName = userSnap.data()?.displayName || request.auth.token.email || "Admin";

        assetsData.forEach((asset) => {
            // 3. Validation cho từng tài sản
            if (!asset.name || !asset.departmentId || !asset.unit || !asset.quantity) {
                // Trong thực tế, bạn có thể log lỗi này thay vì quăng lỗi để không làm hỏng cả batch
                // Nhưng để đơn giản, chúng ta sẽ quăng lỗi
                throw new HttpsError("invalid-argument", `Tài sản "${asset.name || "không tên"}" thiếu thông tin cần thiết.`);
            }

            const newAssetRef = db.collection("assets").doc(); // Tự động tạo ID
            batch.set(newAssetRef, {
                ...asset, // Bao gồm name, quantity, unit, departmentId, managementBlock,...
                createdBy: { uid, name: creatorName }, // Ghi lại người tạo
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                reserved: 0, // Giá trị mặc định
            });
        });

        // 4. Thực hiện ghi hàng loạt
        await batch.commit();

        // 5. Ghi log kiểm toán
        await writeAuditLog(
            "ASSET_BATCH_ADDED_DIRECTLY",
            uid,
            null, // Không có target cụ thể, đây là hành động hàng loạt
            { count: assetsData.length, departmentId: assetsData[0]?.departmentId },
            { request, origin: "callable:batchAddAssetsDirectly" }
        );

        return { ok: true, message: `Đã thêm ${assetsData.length} tài sản.` };
    } catch (error) {
        logger.error("Lỗi khi thêm tài sản hàng loạt trực tiếp:", error);
        throw new HttpsError("internal", error.message || "Không thể thêm tài sản lên server.");
    }
});


/* ===================== BK Agent: ingest & status ===================== */

function validSignature(rawBody, header, secret) {
    if (!header || !header.toLowerCase().startsWith("sha256=")) return false;
    const sigHex = header.slice("sha256=".length).trim().toLowerCase();
    const macHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    // so sánh an toàn với buffer dạng HEX, bắt buộc cùng độ dài
    const sigBuf = Buffer.from(sigHex, "hex");
    const macBuf = Buffer.from(macHex, "hex");
    if (sigBuf.length !== macBuf.length) return false;
    try {
        return crypto.timingSafeEqual(sigBuf, macBuf);
    } catch {
        return false;
    }
}

exports.ingestEvent = onRequest({ secrets: [BK_INGEST_SECRET], cors: true }, async (req, res) => {
    try {
        const secret = BK_INGEST_SECRET.value?.() || process.env.BK_INGEST_SECRET;
        if (!secret) return res.status(500).send("server-secret-missing");

        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
        if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) return res.status(400).send("rawBody-missing");
        if ((req.get("content-type") || "").indexOf("application/json") === -1) {
            return res.status(415).send("unsupported-media-type");
        }

        const sig = req.get("X-BK-Signature") || req.get("x-bk-signature");
        const ok = validSignature(req.rawBody, sig, secret);
        if (!ok) return res.status(401).send("invalid-signature");

        const { machineId, eventId, recordId, createdAt } = req.body || {};
        if (!machineId || !eventId || !createdAt) return res.status(400).send("bad-request");

        const created = new Date(createdAt);

        await db.collection("machineEvents").add({
            machineId,
            eventId: Number(eventId),
            recordId: recordId ?? null,
            createdAt: admin.firestore.Timestamp.fromDate(created), // ✅ Timestamp
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            src: "agent-powershell",
        });

        return res.status(200).send("ok");
    } catch (e) {
        console.error(e);
        return res.status(500).send("error");
    }
});

exports.onEventWrite = onDocumentCreated("machineEvents/{docId}", async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { machineId, eventId, createdAt, recordId } = data;
    const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const ref = db.collection("machineStatus").doc(machineId);

    const prevSnap = await ref.get();
    const prev = prevSnap.exists ? prevSnap.data() : {};

    const prevLastEventAt = prev.lastEventAt?.toDate ? prev.lastEventAt.toDate() : null;
    const DEDUP_WINDOW_MS = 10 * 1000;
    const isDuplicate =
        prev.lastEventId === Number(eventId) &&
        prevLastEventAt &&
        Math.abs(created - prevLastEventAt) <= DEDUP_WINDOW_MS;

    if (isDuplicate) return;

    const ts = admin.firestore.Timestamp.fromDate(created);
    const update = {
        lastEventId: Number(eventId),
        lastEventAt: ts, // ✅ Timestamp
        lastSeenAt: ts, // ✅ Timestamp
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastRecordId: recordId ?? prev.lastRecordId ?? null,
    };

    // ✅ Thêm 506/507
    const ONLINE_EVENTS = new Set([6005, 7001, 107, 4801, 506]); // resume/unlock + laptop resume
    const OFFLINE_EVENTS = new Set([6006, 6008, 1074, 42, 4800, 507]); // shutdown/sleep/lock + laptop sleep

    if (ONLINE_EVENTS.has(Number(eventId))) {
        update.isOnline = true;
        if (Number(eventId) === 6005) {
            const prevShutdownAt = prev.lastShutdownAt?.toDate ? prev.lastShutdownAt.toDate() : null;
            if (!prevShutdownAt || prevShutdownAt <= created) {
                update.lastBootAt = ts; // ✅ Timestamp
            }
        }
    } else if (OFFLINE_EVENTS.has(Number(eventId))) {
        update.isOnline = false;
        update.lastShutdownAt = ts; // ✅ Timestamp
        update.lastShutdownKind =
            Number(eventId) === 6008 ? "unexpected" :
                Number(eventId) === 6006 ? "clean" :
                    Number(eventId) === 42 ? "sleep" :
                        Number(eventId) === 507 ? "sleep" :
                            Number(eventId) === 4800 ? "lock" : "user";
    }

    await ref.set(update, { merge: true });
});

exports.getComputerUsageStats = onCall({ cors: true }, async (request) => {
    ensureSignedIn(request.auth);
    const { machineId, date } = request.data || {};
    if (!machineId) throw new HttpsError("invalid-argument", "Vui lòng cung cấp machineId.");

    const TZ = "Asia/Ho_Chi_Minh";
    const nowTz = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
    const base = date ?
        new Date(new Date(`${date}T00:00:00`).toLocaleString("en-US", { timeZone: TZ })) :
        nowTz;

    const dayStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);

    const isToday =
        nowTz.getFullYear() === base.getFullYear() &&
        nowTz.getMonth() === base.getMonth() &&
        nowTz.getDate() === base.getDate();

    const statusDoc = await db.collection("machineStatus").doc(machineId).get();
    const status = statusDoc.exists ? statusDoc.data() : {};
    const lastBootAt = status.lastBootAt?.toDate?.() ?? null;
    const lastShutdownAt = status.lastShutdownAt?.toDate?.() ?? null;
    const lastSeenAt = status.lastSeenAt?.toDate?.() ?? nowTz;
    const isOnlineNow = !!status.isOnline;

    const snap = await db.collection("machineEvents")
        .where("machineId", "==", machineId)
        .where("createdAt", ">=", dayStart)
        .where("createdAt", "<=", dayEnd)
        .orderBy("createdAt", "asc")
        .get();

    const events = snap.docs.map((d) => d.data());

    // ✅ Bổ sung laptop resume/sleep
    const START_EVENTS = new Set([6005, 107, 4801, 506]); // +506
    const STOP_EVENTS = new Set([6006, 6008, 1074, 42, 4800, 507]); // +507


    const sessions = [];
    let lastStartTime = null;

    const hasStartToday = events.some((e) => START_EVENTS.has(Number(e.eventId)));
    if (!hasStartToday && isToday && isOnlineNow) {
        if (!lastShutdownAt || lastShutdownAt < dayStart) {
            lastStartTime = dayStart;
        } else {
            lastStartTime = (lastBootAt && lastBootAt >= dayStart) ? lastBootAt : dayStart;
        }
    }

    for (const ev of events) {
        const t = ev.createdAt.toDate();
        const id = Number(ev.eventId);

        if (START_EVENTS.has(id)) {
            if (lastStartTime) sessions.push({ start: lastStartTime, end: t });
            lastStartTime = t;
        } else if (STOP_EVENTS.has(id)) {
            if (lastStartTime) {
                sessions.push({ start: lastStartTime, end: t });
                lastStartTime = null;
            }
        }
    }

    if (lastStartTime) {
        let endAnchor = isToday ? lastSeenAt : dayEnd;
        if (endAnchor < dayStart) endAnchor = dayStart;
        if (endAnchor > dayEnd) endAnchor = dayEnd;
        sessions.push({ start: lastStartTime, end: endAnchor });
    }

    const totalUsageSeconds = Math.round(
        sessions.reduce((acc, s) => acc + Math.max(0, (s.end - s.start) / 1000), 0)
    );

    const firstStartAt = sessions.length ? sessions[0].start.toISOString() : null;
    const lastEndAt = sessions.length ? sessions[sessions.length - 1].end.toISOString() : null;

    return { totalUsageSeconds, firstStartAt, lastEndAt, isOnline: isOnlineNow };
});

exports.cronMarkStaleOffline = onSchedule(
    { schedule: "every 5 minutes", timeZone: "Asia/Ho_Chi_Minh" },
    async () => {
        const now = new Date();

        // 🔹 Lấy cấu hình từ Firestore
        const cfgSnap = await db.collection("app_config").doc("agent").get();
        const hb = cfgSnap.exists ? Number(cfgSnap.data()?.heartbeatMinutes) : 10;
        const stalenessMin = (hb > 0 ? hb : 10) + 2; // dự phòng +2

        const cutoff = new Date(now.getTime() - stalenessMin * 60 * 1000);

        const snap = await db.collection("machineStatus")
            .where("isOnline", "==", true)
            .get();

        const batch = db.batch();
        let count = 0;

        snap.forEach((doc) => {
            const d = doc.data();
            const lastSeen = d.lastSeenAt?.toDate?.();
            if (!lastSeen || lastSeen < cutoff) {
                batch.set(doc.ref, {
                    isOnline: false,
                    lastShutdownAt: lastSeen || now,
                    lastShutdownKind: "stale",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                count++;
            }
        });

        if (count > 0) await batch.commit();
        logger.log(`[cronMarkStaleOffline] Marked ${count} machines offline (stale, cutoff ${stalenessMin} phút).`);
    }
);


