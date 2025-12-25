const nodemailer = require("nodemailer");
const { getAuth: getAdminAuth } = require("firebase-admin/auth");
const { HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// ENV secrets (Gmail)
const gmailUser = process.env.GMAIL_SMTP_USER; // ví dụ: yourname@gmail.com
const gmailPass = process.env.GMAIL_SMTP_APP_PASSWORD; // app password 16 ký tự

// ENV secret (Resend)
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// URL frontend cho ActionCodeSettings (điền bằng biến môi trường nếu có)
const FRONTEND_URL =
    process.env.FRONTEND_URL || "https://revenue-profit-report.vercel.app";

// Transporter Gmail (App Password) với cấu hình tối ưu
const gmailTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465, // SSL
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
    tls: {
        // Không reject unauthorized để tránh lỗi certificate
        rejectUnauthorized: false,
    },
    // Cấu hình connection pool để tăng hiệu suất
    pool: true,
    maxConnections: 1,
    maxMessages: 3,
    // Rate limiting
    rateDelta: 1000,
    rateLimit: 5,
});

// ActionCodeSettings: nơi người dùng quay về sau khi reset/verify
const DEFAULT_ACS = {
    url: `${FRONTEND_URL}/login`,
    handleCodeInApp: true,
};

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
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="format-detection" content="telephone=no" />
        <title>Lời mời tham gia hệ thống - ${companyName}</title>
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
                                <img src="${logoUrl}" alt="${companyName} Logo" width="140" style="max-width: 140px; height: auto; display: block;" />
                                <div style="font-size: 18px; font-weight: bold; color: #333; margin-top: 10px;">${companyName}</div>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 30px 0;">
                                <h1>Chào mừng bạn, ${displayName}!</h1>
                                <p>Xin chào,</p>
                                <p>Bạn đã được mời tham gia hệ thống quản lý của <strong>${companyName}</strong>. Tài khoản của bạn đã được tạo sẵn và bạn chỉ cần thiết lập mật khẩu để bắt đầu sử dụng.</p>
                                <p>Vui lòng nhấn vào nút bên dưới để thiết lập mật khẩu và đăng nhập vào hệ thống:</p>
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

/**
 * Tạo template email đặt lại mật khẩu
 * @param {string} email Email người dùng
 * @param {string} actionLink URL để đặt lại mật khẩu
 * @returns {string} Chuỗi HTML của email
 */
function createPasswordResetEmailHtml(email, actionLink) {
    const companyName = "Công ty Cổ phần Xây dựng Bách Khoa";
    const logoUrl = "https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png";
    const primaryColor = "#1a73e8";
    const year = new Date().getFullYear();

    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Đặt lại mật khẩu - ${companyName}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: Arial, sans-serif;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td style="padding: 20px 0;">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 30px;">
                        
                        <tr>
                            <td align="center" style="padding-bottom: 20px; border-bottom: 1px solid #dddddd;">
                                <img src="${logoUrl}" alt="${companyName} Logo" width="120" style="max-width: 120px; height: auto;" />
                                <div style="font-size: 16px; font-weight: bold; color: #333; margin-top: 10px;">${companyName}</div>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 30px 0;">
                                <h1 style="font-size: 22px; color: #333; margin: 0 0 20px 0;">Yêu cầu đặt lại mật khẩu</h1>
                                <p style="font-size: 15px; color: #555; line-height: 1.6;">Xin chào,</p>
                                <p style="font-size: 15px; color: #555; line-height: 1.6;">
                                    Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${email}</strong>.
                                </p>
                                <p style="font-size: 15px; color: #555; line-height: 1.6;">
                                    Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.
                                </p>
                                <p style="font-size: 15px; color: #555; line-height: 1.6;">
                                    Nhấn vào nút bên dưới để đặt lại mật khẩu:
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td align="center">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="background-color: ${primaryColor}; border-radius: 8px;">
                                            <a href="${actionLink}" target="_blank" style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; display: inline-block;">
                                                Đặt lại mật khẩu
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding-top: 30px; border-top: 1px solid #dddddd; margin-top: 30px;">
                                <p style="font-size: 12px; text-align: center; color: #888888;">
                                    Link này sẽ hết hạn sau 1 giờ.<br/>
                                    Nếu nút không hoạt động, sao chép link sau vào trình duyệt:<br/>
                                    <a href="${actionLink}" style="color: #888888; word-break: break-all;">${actionLink.substring(0, 60)}...</a>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <td align="center" style="padding-top: 20px;">
                                 <p style="font-size: 12px; color: #888888;">&copy; ${year} ${companyName}. All Rights Reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;
}

/**
 * Tạo link verify/reset bằng Admin SDK
 */
async function createActionLink(type, email, acs = DEFAULT_ACS) {
    const auth = getAdminAuth();
    if (type === "VERIFY") return auth.generateEmailVerificationLink(email, acs);
    if (type === "RESET") return auth.generatePasswordResetLink(email, acs);
    throw new HttpsError("invalid-argument", "type phải là VERIFY hoặc RESET");
}

/**
 * Tạo plain text version tốt hơn từ HTML
 */
function htmlToPlainText(html) {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove style tags
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove script tags
        .replace(/<[^>]+>/g, "") // Remove all HTML tags
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ") // Multiple spaces to single
        .replace(/\n\s*\n/g, "\n\n") // Multiple newlines to double
        .trim();
}

/**
 * Gửi mail qua Gmail với cấu hình tối ưu để tránh spam
 */
async function sendWithGmail({ to, subject, html, fromName = "Bách Khoa", plainText = null, retries = 2 }) {
    if (!gmailUser || !gmailPass) {
        throw new HttpsError("failed-precondition", "Chưa cấu hình GMAIL_SMTP_USER / GMAIL_SMTP_APP_PASSWORD");
    }

    // Tạo plain text version nếu chưa có
    const textContent = plainText || htmlToPlainText(html);

    // Tạo Message-ID duy nhất
    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(2, 15)}@${gmailUser.split("@")[1]}>`;

    const from = `"${fromName}" <${gmailUser}>`;

    // Tạo Return-Path header (quan trọng cho deliverability)
    const returnPath = gmailUser;

    const mailOptions = {
        from,
        to,
        subject,
        html,
        text: textContent,
        replyTo: gmailUser,
        returnPath: returnPath,
        encoding: "UTF-8",
        headers: {
            // Headers chuẩn RFC 5322 (không set Content-Type/Transfer-Encoding vì nodemailer tự xử lý)
            "Message-ID": messageId,
            "Date": new Date().toUTCString(),

            // Headers để cải thiện deliverability
            "X-Mailer": "Bach Khoa ERP System",
            "X-Priority": "3", // Normal priority (1=Highest, 3=Normal, 5=Lowest)
            "Importance": "Normal",

            // Headers để tránh spam filters (transactional email)
            "X-Auto-Response-Suppress": "All", // Tránh auto-reply
            "X-Entity-Ref-ID": messageId, // Tracking ID
            "Precedence": "bulk", // Đánh dấu email giao dịch

            // List-Unsubscribe - Gmail thích email có header này
            "List-Unsubscribe": `<mailto:${gmailUser}?subject=Unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        // Cấu hình bổ sung cho nodemailer
        priority: "normal",
        disableUrlAccess: false,
        disableFileAccess: false,
    };

    // Retry logic với exponential backoff
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await gmailTransporter.sendMail(mailOptions);
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, attempt) * 1000;
                logger.warn(`Gửi email thất bại (lần thử ${attempt + 1}/${retries + 1}), thử lại sau ${delay}ms:`, error.message);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    // Nếu tất cả retry đều thất bại
    logger.error("Gửi email thất bại sau tất cả các lần thử:", lastError);
    throw lastError;
}

/**
 * Gửi mail qua Resend API (deliverability tốt hơn Gmail)
 * @param {Object} options - Email options
 * @param {string} options.to - Email người nhận
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.html - Nội dung HTML
 * @param {string} [options.fromName] - Tên người gửi
 * @param {string} [options.plainText] - Nội dung text thuần
 */
async function sendWithResend({ to, subject, html, fromName = "Bách Khoa System", plainText = null }) {
    if (!RESEND_API_KEY) {
        logger.warn("RESEND_API_KEY chưa được cấu hình, fallback về Gmail");
        // Fallback về Gmail nếu không có Resend key
        return sendWithGmail({ to, subject, html, fromName, plainText });
    }

    const textContent = plainText || htmlToPlainText(html);

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: `${fromName} <onboarding@resend.dev>`, // Resend default domain
                to: [to],
                subject,
                html,
                text: textContent,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            logger.error("Resend API error:", data);
            throw new Error(data.message || "Resend API failed");
        }

        logger.info(`Email sent successfully via Resend to ${to}`, { id: data.id });
        return data;
    } catch (error) {
        logger.error("Lỗi khi gửi email qua Resend:", error);
        // Fallback về Gmail nếu Resend thất bại
        logger.warn("Fallback về Gmail...");
        return sendWithGmail({ to, subject, html, fromName, plainText });
    }
}

module.exports = {
    createModernInviteEmailHtml,
    createPasswordResetEmailHtml,
    createActionLink,
    htmlToPlainText,
    sendWithGmail,
    sendWithResend,
    DEFAULT_ACS
};
