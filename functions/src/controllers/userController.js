const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin, FieldValue } = require("../config/firebase");
const { ensureAdmin } = require("../utils/auth");
const { writeAuditLog } = require("../utils/audit");
const {
    createActionLink,
    createModernInviteEmailHtml,
    sendWithGmail,
    DEFAULT_ACS
} = require("../utils/email");
const logger = require("firebase-functions/logger");

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

        // 5) Tạo plain text version tốt hơn
        const companyName = "Công ty Cổ phần Xây dựng Bách Khoa";
        const plainTextContent = `Chào mừng bạn, ${displayName}!

Xin chào,

Bạn đã được mời tham gia hệ thống quản lý của ${companyName}. Tài khoản của bạn đã được tạo sẵn và bạn chỉ cần thiết lập mật khẩu để bắt đầu sử dụng.

Vui lòng truy cập link sau để thiết lập mật khẩu và đăng nhập vào hệ thống:

${actionLink}

Nếu link trên không hoạt động, bạn có thể sao chép toàn bộ link trên và dán vào thanh địa chỉ trình duyệt web của bạn.

Link này sẽ hết hạn sau 24 giờ. Nếu bạn gặp vấn đề, vui lòng liên hệ với quản trị viên hệ thống.

Trân trọng,
Đội ngũ ${companyName}
Hệ thống Quản lý`.trim();

        // 6) Gửi mail bằng transporter với cấu hình tối ưu
        // Subject line không dùng dấu ngoặc vuông để tránh spam filter
        await sendWithGmail({
            to: email,
            subject: `Bách Khoa - Lời mời tham gia hệ thống và tạo mật khẩu`,
            html: emailHtml,
            plainText: plainTextContent,
            fromName: "Bách Khoa - Hệ thống Quản lý",
        });

        // 7) Ghi log kiểm toán
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
