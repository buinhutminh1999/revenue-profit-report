import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

// --- Theme & Styles (Không đổi) ---
const theme = {
    colors: {
        primary: "#0d6efd", accent: "#e9ecef", text: "#212529",
        textSecondary: "#6c757d", border: "#dee2e6", background: "#f8f9fa",
        success: "#198754", successLight: "#d1e7dd", error: "#dc3545", errorLight: "#f8d7da",
        warning: "#ffc107", warningLight: "#fff3cd",
    },
    font: { family: "'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", size: "14px" },
    spacing: { small: "4px", medium: "8px", large: "16px", xlarge: "24px" },
};

const styles = {
    page: {
        width: "210mm", minHeight: "297mm", padding: "15mm", backgroundColor: "white",
        fontFamily: theme.font.family, fontSize: theme.font.size, color: theme.colors.text,
        boxSizing: "border-box", display: "flex", flexDirection: "column",
    },
    header: {
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        borderBottom: `2px solid ${theme.colors.text}`, paddingBottom: theme.spacing.large,
    },
    companyName: { margin: 0, textTransform: "uppercase", fontWeight: 700, fontSize: "16px" },
    companyInfo: { margin: `${theme.spacing.small} 0 0`, fontSize: "11px", color: theme.colors.textSecondary, lineHeight: 1.5 },
    headerRight: { textAlign: "center" },
    qrLabel: { fontSize: "10px", margin: `${theme.spacing.medium} 0 0`, color: theme.colors.textSecondary },
    titleSection: { textAlign: "center", margin: `${theme.spacing.xlarge} 0` },
    title: { fontSize: "26px", fontWeight: "bold", margin: 0, textTransform: "uppercase", color: theme.colors.primary },
    subTitle: { margin: `${theme.spacing.medium} 0`, fontSize: "13px", color: theme.colors.textSecondary, fontStyle: "italic" },
    documentId: { fontWeight: 600, fontSize: "13px" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "13px", border: `1px solid ${theme.colors.border}` },
    td: { padding: `12px ${theme.spacing.medium}`, border: `1px solid ${theme.colors.border}`, textAlign: "left", verticalAlign: "top" },
    tdHeader: { fontWeight: 'bold', width: '30%', backgroundColor: theme.colors.background, color: theme.colors.textSecondary },
    signatureRow: { display: "flex", justifyContent: "space-around", gap: theme.spacing.large, marginTop: "40px", textAlign: "center", pageBreakInside: "avoid" },
    signatureCol: { flex: 1, padding: `0 ${theme.spacing.medium}` },
    signatureRole: { fontWeight: "bold", textTransform: "uppercase", marginBottom: theme.spacing.medium, fontSize: "13px", color: theme.colors.textSecondary },
    signatureBox: {
        height: "60px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    },
    signaturePlaceholder: {
        border: `2px dashed ${theme.colors.border}`, borderRadius: "4px", color: theme.colors.textSecondary,
        fontStyle: "italic", fontSize: "12px",
    },
    signatureContent: {
        backgroundColor: theme.colors.successLight, border: `1px solid ${theme.colors.success}`, borderRadius: "4px",
    },
    signatureStatus: { color: theme.colors.success, fontWeight: "bold", fontSize: "12px", margin: 0 },
    signatureTime: { fontSize: "10px", color: theme.colors.textSecondary, margin: `${theme.spacing.small} 0 0` },
    signatureName: { fontWeight: 600, marginTop: theme.spacing.large, fontSize: "15px", minHeight: "20px" },
    footer: {
        marginTop: "auto", paddingTop: theme.spacing.large, borderTop: `1px solid ${theme.colors.border}`,
        textAlign: "center", fontSize: "10px", color: "#aaa", pageBreakInside: "avoid",
    },
};

// --- Helper Functions ---
const fullTime = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("vi-VN", { timeStyle: "medium", dateStyle: "short" });
};

// --- Child Component for Signatures ---
const SignatureDisplay = ({ signature, role }) => (
    <>
        <b style={styles.signatureRole}>{role}</b>
        {signature ? (
            <div style={{ ...styles.signatureBox, ...styles.signatureContent }}>
                <p style={styles.signatureStatus}>✔ Đã ký điện tử</p>
                <p style={styles.signatureTime}>{fullTime(signature.approvedAt)}</p>
            </div>
        ) : (
            <div style={{ ...styles.signatureBox, ...styles.signaturePlaceholder }}>
                <span>(Chưa ký)</span>
            </div>
        )}
        <p style={styles.signatureName}>{signature?.name || "..."}</p>
    </>
);

// --- Main Print Component ---
export const RequestPrintTemplate = React.forwardRef(({ request, company }, ref) => {
    if (!request) return null;

    const { assetData, signatures = {}, requester } = request;

    const qrValue =
        typeof window !== "undefined"
            ? `${window.location.origin}/asset-requests/${request.id}`
            : `/asset-requests/${request.id}`;

    // --- LOGIC MỚI ĐỂ XỬ LÝ THÔNG TIN DỰA TRÊN LOẠI YÊU CẦU ---
    const getRequestTypeInfo = () => {
        switch (request.type) {
            case 'ADD': return {
                title: 'PHIẾU YÊU CẦU BỔ SUNG TÀI SẢN',
                label: 'YÊU CẦU THÊM MỚI',
                quantityLabel: 'Số lượng',
                color: theme.colors.success,
                bg: theme.colors.successLight
            };
            case 'DELETE': return {
                title: 'BIÊN BẢN THANH LÝ TÀI SẢN',
                label: 'YÊU CẦU XÓA TOÀN BỘ',
                quantityLabel: 'Số lượng hiện có',
                color: theme.colors.error,
                bg: theme.colors.errorLight
            };
            case 'REDUCE_QUANTITY': return {
                title: 'BIÊN BẢN GIẢM SỐ LƯỢNG TÀI SẢN',
                label: 'YÊU CẦU GIẢM SỐ LƯỢNG',
                quantityLabel: 'Số lượng cần giảm',
                color: '#664d03',
                bg: theme.colors.warningLight
            };
            default: return {
                title: 'PHIẾU YÊU CẦU THAY ĐỔI TÀI SẢN',
                label: 'YÊU CẦU THAY ĐỔI',
                quantityLabel: 'Số lượng',
                color: theme.colors.text,
                bg: theme.colors.accent
            };
        }
    };

    const requestInfo = getRequestTypeInfo();

    return (
        <div ref={ref} className="print-page" style={styles.page}>
            <div style={styles.header}>
                <div>
                    <h3 style={styles.companyName}>{company?.name || "TÊN CÔNG TY"}</h3>
                    <p style={styles.companyInfo}>
                        Địa chỉ: {company?.address || "................................"}<br />
                        Điện thoại: {company?.phone || ".................."}
                    </p>
                </div>
                <div style={styles.headerRight}>
                    <QRCodeSVG value={qrValue} size={80} level="H" />
                    <p style={styles.qrLabel}>Quét để xem & duyệt</p>
                </div>
            </div>

            <section style={styles.titleSection}>
                {/* Tiêu đề động */}
                <h1 style={styles.title}>{requestInfo.title}</h1>
                <p style={styles.subTitle}>Ngày tạo: {fullTime(request.createdAt)}</p>
                <p style={styles.documentId}>
                    Mã phiếu: {request.maPhieuHienThi || request.id?.slice(0, 8).toUpperCase()}
                </p>
            </section>

            <main>
                <table style={styles.table}>
                    <tbody>
                        <tr>
                            <td style={{ ...styles.td, ...styles.tdHeader }}>Loại yêu cầu</td>
                            <td style={{ ...styles.td, backgroundColor: requestInfo.bg, color: requestInfo.color, fontWeight: 'bold' }}>
                                {requestInfo.label}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...styles.td, ...styles.tdHeader }}>Người yêu cầu</td>
                            <td style={{ ...styles.td }}>{requester?.name || 'Không rõ'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...styles.td, ...styles.tdHeader }}>Tên tài sản</td>
                            <td style={{ ...styles.td }}>{assetData?.name}</td>
                        </tr>
                        <tr>
                            <td style={{ ...styles.td, ...styles.tdHeader }}>Phòng ban</td>
                            <td style={{ ...styles.td }}>{request.departmentName}</td>
                        </tr>
                        <tr>
                            <td style={{ ...styles.td, ...styles.tdHeader }}>Khối Quản lý</td>
                            <td style={{ ...styles.td }}>{request.managementBlock || '—'}</td>
                        </tr>
                        <tr>
                            {/* Nhãn số lượng động */}
                            <td style={{ ...styles.td, ...styles.tdHeader }}>{requestInfo.quantityLabel}</td>
                            <td style={{ ...styles.td }}>{assetData?.quantity} {assetData?.unit}</td>
                        </tr>
                        <tr>
                            <td style={{ ...styles.td, ...styles.tdHeader }}>Mô tả</td>
                            <td style={{ ...styles.td, whiteSpace: 'pre-wrap' }}>{assetData?.description || '—'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...styles.td, ...styles.tdHeader }}>Ghi chú</td>
                            <td style={{ ...styles.td, whiteSpace: 'pre-wrap' }}>{assetData?.notes || '—'}</td>
                        </tr>
                    </tbody>
                </table>
            </main>

            <section style={styles.signatureRow}>
                <div style={styles.signatureCol}>
                    <SignatureDisplay
                        signature={signatures.hc}
                        role="P. Hành chính"
                    />
                </div>
                <div style={styles.signatureCol}>
                    <SignatureDisplay
                        signature={signatures.blockLeader}
                        role={request.managementBlock ? `${request.managementBlock} duyệt` : 'Lãnh đạo Khối'}
                    />
                </div>
                <div style={styles.signatureCol}>
                    <SignatureDisplay
                        signature={signatures.kt}
                        role="P. Kế toán"
                    />
                </div>
            </section>

            <footer style={styles.footer}>
                <p>In từ hệ thống Quản lý Tài sản • {new Date().toLocaleString("vi-VN")}</p>
            </footer>

            <style>{`
                @page {
                    size: A4;
                    margin: 15mm; 
                }
                @media print {
                    html, body {
                        width: 210mm;
                        height: 297mm;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    .print-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        min-height: initial !important; 
                        page-break-after: always;
                    }
                }
            `}</style>
        </div>
    );
});