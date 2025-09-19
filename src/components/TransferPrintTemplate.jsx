import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

// --- Theme & Styles ---
const theme = {
    colors: {
        primary: "#0d6efd",
        text: "#212529",
        textSecondary: "#6c757d",
        border: "#dee2e6",
        background: "#f8f9fa",
        success: "#198754",
        successLight: "#e8f3ec",
    },
    font: {
        family: "'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        size: "13px",
    },
    spacing: {
        small: "4px",
        medium: "8px",
        large: "16px",
        xlarge: "24px",
    },
};

const styles = {
    page: {
        width: "210mm",
        minHeight: "297mm",
        padding: "15mm",
        backgroundColor: "white",
        fontFamily: theme.font.family,
        fontSize: theme.font.size,
        color: theme.colors.text,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottom: `2px solid ${theme.colors.text}`,
        paddingBottom: theme.spacing.large,
    },
    companyName: {
        margin: 0,
        textTransform: "uppercase",
        fontWeight: 700,
        fontSize: "16px",
    },
    companyInfo: {
        margin: `${theme.spacing.small} 0 0`,
        fontSize: "11px",
        color: theme.colors.textSecondary,
        lineHeight: 1.5,
    },
    headerRight: {
        textAlign: "center",
    },
    qrLabel: {
        fontSize: "10px",
        margin: `${theme.spacing.medium} 0 0`,
        color: theme.colors.textSecondary,
    },
    titleSection: {
        textAlign: "center",
        margin: `${theme.spacing.xlarge} 0`,
    },
    title: {
        fontSize: "26px",
        fontWeight: "bold",
        margin: 0,
        textTransform: "uppercase",
        color: theme.colors.primary,
    },
    subTitle: {
        margin: `${theme.spacing.medium} 0`,
        fontSize: "13px",
        color: theme.colors.textSecondary,
        fontStyle: "italic",
    },
    documentId: {
        fontWeight: 600,
        fontSize: "13px",
    },
    infoTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: theme.spacing.xlarge,
        fontSize: '13px',
    },
    infoLabel: {
        textAlign: 'left',
        fontWeight: 600,
        padding: `${theme.spacing.medium} 0`,
        width: '150px'
    },
    infoValue: {
        textAlign: 'left',
        padding: `${theme.spacing.medium} ${theme.spacing.medium}`,
        borderBottom: `1px dotted ${theme.colors.border}`,
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "13px",
        border: `1px solid ${theme.colors.border}`,
    },
    th: {
        padding: `10px ${theme.spacing.medium}`,
        border: `1px solid ${theme.colors.border}`,
        fontWeight: 600,
        textAlign: "center",
        textTransform: "uppercase",
        fontSize: "12px",
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.background,
    },
    td: {
        padding: `12px ${theme.spacing.medium}`,
        border: `1px solid ${theme.colors.border}`,
        verticalAlign: "middle",
        textAlign: 'center'
    },
    signatureRow: {
        display: "flex",
        justifyContent: "space-around",
        gap: theme.spacing.large,
        marginTop: "40px",
        textAlign: "center",
    },
    signatureCol: {
        flex: 1,
        padding: `0 ${theme.spacing.medium}`,
    },
    signatureRole: {
        fontWeight: "bold",
        textTransform: "uppercase",
        marginBottom: theme.spacing.medium,
        fontSize: "13px",
        color: theme.colors.textSecondary,
    },
    signatureBox: {
        height: "60px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
    signaturePlaceholder: {
        border: `2px dashed ${theme.colors.border}`,
        borderRadius: "4px",
        color: theme.colors.textSecondary,
        fontStyle: "italic",
        fontSize: "12px",
    },
    signatureContent: {
        backgroundColor: theme.colors.successLight,
        border: `1px solid ${theme.colors.success}`,
        borderRadius: "4px",
    },
    signatureStatus: {
        color: theme.colors.success,
        fontWeight: "bold",
        fontSize: "12px",
        margin: 0,
    },
    signatureTime: {
        fontSize: "10px",
        color: theme.colors.textSecondary,
        margin: `${theme.spacing.small} 0 0`,
    },
    signatureName: {
        fontWeight: 600,
        marginTop: theme.spacing.large,
        fontSize: "15px",
        minHeight: "20px",
    },
    footer: {
        marginTop: "auto",
        paddingTop: theme.spacing.large,
        borderTop: `1px solid ${theme.colors.border}`,
        textAlign: "center",
        fontSize: "10px",
        color: "#aaa",
    },
};

// --- Helper Functions ---
const fullTime = (ts) => {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (!d || Number.isNaN(+d)) return "";
    return d.toLocaleString("vi-VN", { timeStyle: "medium", dateStyle: "short" });
};

const formatDate = (ts) => {
    if (!ts) return { day: "..", month: "..", year: "...." };
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return {
        day: String(d.getDate()).padStart(2, "0"),
        month: String(d.getMonth() + 1).padStart(2, "0"),
        year: d.getFullYear(),
    };
};

const formatNumber = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '–';
    return num.toLocaleString('vi-VN');
};

// --- Child Component for Signatures ---
const SignatureDisplay = ({ signature, role }) => (
    <>
        <b style={styles.signatureRole}>{role}</b>
        {signature ? (
            <div style={{ ...styles.signatureBox, ...styles.signatureContent }}>
                <p style={styles.signatureStatus}>✔ Đã ký điện tử</p>
                <p style={styles.signatureTime}>{fullTime(signature.signedAt)}</p>
            </div>
        ) : (
            <div style={{ ...styles.signatureBox, ...styles.signaturePlaceholder }}>
                <span>(Chưa ký)</span>
            </div>
        )}
        <p style={styles.signatureName}>{signature?.name || "..................................."}</p>
    </>
);


// --- Main Print Component ---
export const TransferPrintTemplate = React.forwardRef(({ transfer, company }, ref) => {
    if (!transfer) return null;

    const createdDate = formatDate(transfer.date);
    const { signatures = {} } = transfer;
    const totalQty = (transfer.assets || []).reduce((s, a) => s + Number(a.quantity || 0), 0);

    const qrValue = typeof window !== 'undefined'
        ? `${window.location.origin}/transfers/${transfer.id}`
        : `/transfers/${transfer.id}`;

    return (
        <div ref={ref} style={styles.page}>
            <header style={styles.header}>
                <div>
                {console.log('styles',styles)}
                    <h3 style={styles.companyName}>{company?.name || 'TÊN CÔNG TY'}</h3>
                    <p style={styles.companyInfo}>
                        Địa chỉ: {company?.address || '................................'}<br />
                        Điện thoại: {company?.phone || '..................'}
                    </p>
                </div>
                <div style={styles.headerRight}>
                    <QRCodeSVG value={qrValue} size={80} level="H" />
                    <p style={styles.qrLabel}>Quét để xem & duyệt</p>
                </div>
            </header>

            <section style={styles.titleSection}>
                <h1 style={styles.title}>Phiếu Luân Chuyển Tài Sản</h1>
                <p style={styles.subTitle}>
                    Ngày {createdDate.day} tháng {createdDate.month} năm {createdDate.year}
                </p>
                <p style={styles.documentId}>
                    Mã phiếu: {transfer.maPhieuHienThi || transfer.id?.slice(0, 8).toUpperCase()}
                </p>
            </section>

            <main>
                <table style={styles.infoTable}>
                    <tbody>
                        <tr>
                            <td style={styles.infoLabel}>Từ phòng/bộ phận:</td>
                            <td style={styles.infoValue}><b>{transfer.from}</b></td>
                        </tr>
                        <tr>
                            <td style={styles.infoLabel}>Đến phòng/bộ phận:</td>
                            <td style={styles.infoValue}><b>{transfer.to}</b></td>
                        </tr>
                        <tr>
                            <td style={styles.infoLabel}>Người tạo phiếu:</td>
                            <td style={styles.infoValue}>{transfer.createdBy?.name}</td>
                        </tr>
                    </tbody>
                </table>

                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ ...styles.th, width: '5%' }}>STT</th>
                            <th style={{ ...styles.th, width: '40%' }}>Tên tài sản</th>
                            <th style={{ ...styles.th, width: '20%' }}>Kích thước</th>
                            <th style={{ ...styles.th, width: '10%' }}>ĐVT</th>
                            <th style={{ ...styles.th, width: '10%' }}>Số lượng</th>
                            <th style={{ ...styles.th, width: '25%' }}>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(transfer.assets || []).map((asset, index) => (
                            <tr key={asset.id || index}>
                                <td style={styles.td}>{index + 1}</td>
                                <td style={{ ...styles.td, textAlign: 'left' }}>
                                    <b>{asset.name}</b>
                                </td>
                                <td style={styles.td}>{asset.size || '–'}</td>
                                <td style={styles.td}>{asset.unit || ''}</td>
                                <td style={{ ...styles.td, fontWeight: '500' }}>{formatNumber(Number(asset.quantity || 0))}</td>
                                <td style={{ ...styles.td, textAlign: 'left' }}>{asset.notes || ''}</td>

                            </tr>
                        ))}

                    </tbody>
                </table>

                <p style={{ marginTop: '15px', fontStyle: 'italic', color: theme.colors.textSecondary }}>
                    Tổng số loại tài sản: {transfer.assets?.length || 0} • Tổng số lượng: {formatNumber(totalQty)}
                </p>
            </main>

            <section className="no-break" style={styles.signatureRow}>
                <div style={styles.signatureCol}>
                    <SignatureDisplay signature={signatures.sender} role="Phòng Chuyển" />
                </div>
                <div style={styles.signatureCol}>
                    <SignatureDisplay signature={signatures.receiver} role="Phòng Nhận" />
                </div>
                <div style={styles.signatureCol}>
                    <SignatureDisplay signature={signatures.admin} role="P. Hành chính" />
                </div>
            </section>

            <footer style={styles.footer} className="no-break">
                <p>In từ hệ thống Quản lý Tài sản • {new Date().toLocaleString('vi-VN')}</p>
            </footer>

            <style>{`
                @media print {
                    html, body { margin:0 !important; padding:0 !important; }
                    .no-break {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
});