// src/components/print-templates/ReportPrintTemplate.jsx
// Print template for inventory reports (báo cáo kiểm kê tài sản)

import React, { useMemo } from 'react';
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
        size: "11px",
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
        padding: "10mm 15mm",
        backgroundColor: "white",
        fontFamily: theme.font.family,
        fontSize: theme.font.size,
        color: theme.colors.text,
        boxSizing: "border-box",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottom: `2px solid ${theme.colors.text}`,
        paddingBottom: theme.spacing.medium,
        marginBottom: theme.spacing.medium,
    },
    companyName: {
        margin: 0,
        textTransform: "uppercase",
        fontWeight: 700,
        fontSize: "14px",
    },
    companyInfo: {
        margin: `${theme.spacing.small} 0 0`,
        fontSize: "10px",
        color: theme.colors.textSecondary,
        lineHeight: 1.4,
    },
    headerRight: {
        textAlign: "center",
    },
    qrLabel: {
        fontSize: "9px",
        margin: `${theme.spacing.small} 0 0`,
        color: theme.colors.textSecondary,
    },
    titleSection: {
        textAlign: "center",
        marginBottom: theme.spacing.large,
    },
    title: {
        fontSize: "18px",
        fontWeight: "bold",
        margin: 0,
        textTransform: "uppercase",
        color: theme.colors.primary,
    },
    subTitle: {
        margin: `${theme.spacing.small} 0`,
        fontSize: "11px",
        color: theme.colors.textSecondary,
    },
    documentId: {
        fontWeight: 600,
        fontSize: "11px",
    },
    infoSection: {
        marginBottom: theme.spacing.medium,
        fontSize: "11px",
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
    },
    infoItem: {
        marginRight: theme.spacing.large,
    },
    departmentHeader: {
        backgroundColor: theme.colors.background,
        padding: `${theme.spacing.small} ${theme.spacing.medium}`,
        fontWeight: 700,
        fontSize: "11px",
        marginTop: theme.spacing.medium,
        marginBottom: theme.spacing.small,
        borderLeft: `3px solid ${theme.colors.primary}`,
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "10px",
        marginBottom: theme.spacing.small,
    },
    th: {
        padding: "4px 4px",
        border: `1px solid ${theme.colors.border}`,
        fontWeight: 600,
        textAlign: "center",
        fontSize: "9px",
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.background,
    },
    td: {
        padding: "3px 4px",
        border: `1px solid ${theme.colors.border}`,
        verticalAlign: "middle",
        textAlign: "center",
        fontSize: "9px",
    },
    signatureRow: {
        display: "flex",
        justifyContent: "space-around",
        gap: theme.spacing.medium,
        marginTop: "30px",
        textAlign: "center",
        pageBreakInside: "avoid",
    },
    signatureCol: {
        flex: 1,
        padding: `0 ${theme.spacing.small}`,
    },
    signatureRole: {
        fontWeight: "bold",
        textTransform: "uppercase",
        marginBottom: theme.spacing.small,
        fontSize: "10px",
        color: theme.colors.textSecondary,
    },
    signatureBox: {
        height: "40px",
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
        fontSize: "9px",
    },
    signatureContent: {
        backgroundColor: theme.colors.successLight,
        border: `1px solid ${theme.colors.success}`,
        borderRadius: "4px",
    },
    signatureStatus: {
        color: theme.colors.success,
        fontWeight: "bold",
        fontSize: "9px",
        margin: 0,
    },
    signatureTime: {
        fontSize: "8px",
        color: theme.colors.textSecondary,
        margin: `${theme.spacing.small} 0 0`,
    },
    signatureName: {
        fontWeight: 600,
        marginTop: theme.spacing.small,
        fontSize: "11px",
        minHeight: "16px",
    },
    footer: {
        marginTop: "auto",
        paddingTop: theme.spacing.medium,
        borderTop: `1px solid ${theme.colors.border}`,
        textAlign: "center",
        fontSize: "9px",
        color: "#aaa",
        pageBreakInside: "avoid",
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

const formatInspectionDate = (inspectionDate) => {
    if (!inspectionDate) return '–';
    const d = inspectionDate?.toDate ? inspectionDate.toDate() : new Date(inspectionDate);
    if (isNaN(d.getTime())) return '–';
    return d.toLocaleDateString('vi-VN');
};

// --- Signature Display Component ---
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
export const ReportPrintTemplate = React.forwardRef(({ report, company, assets = [] }, ref) => {
    if (!report) return null;

    const createdDate = formatDate(report.createdAt);
    const { signatures = {} } = report;

    // Get report type display
    const reportTypeLabel = report.type === 'SUMMARY_REPORT'
        ? 'Toàn bộ công ty'
        : (report.departmentName || report.blockName || 'Không xác định');

    const qrValue = typeof window !== 'undefined'
        ? `${window.location.origin}/inventory-reports/${report.id}`
        : `/inventory-reports/${report.id}`;

    // Group assets by department
    const groupedAssets = useMemo(() => {
        const groups = {};
        assets.forEach(asset => {
            const deptName = asset.departmentName || 'Không xác định';
            if (!groups[deptName]) {
                groups[deptName] = [];
            }
            groups[deptName].push(asset);
        });
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], 'vi'));
    }, [assets]);

    // Calculate total quantity
    const totalQuantity = assets.reduce((sum, a) => sum + Number(a.quantity || 0), 0);

    return (
        <div ref={ref} style={styles.page}>
            <header style={styles.header}>
                <div>
                    <h3 style={styles.companyName}>{company?.name || 'CÔNG TY CỔ PHẦN XÂY DỰNG BÁCH KHOA'}</h3>
                    <p style={styles.companyInfo}>
                        Địa chỉ: {company?.address || '................................'}<br />
                        Điện thoại: {company?.phone || '..................'}
                    </p>
                </div>
                <div style={styles.headerRight}>
                    <QRCodeSVG value={qrValue} size={60} level="H" />
                    <p style={styles.qrLabel}>Quét để xem chi tiết</p>
                </div>
            </header>

            <section style={styles.titleSection}>
                <h1 style={styles.title}>Báo Cáo Kiểm Kê Tài Sản</h1>
                <p style={styles.subTitle}>
                    Ngày {createdDate.day} tháng {createdDate.month} năm {createdDate.year}
                </p>
                <p style={styles.documentId}>
                    Mã phiếu: {report.maPhieuHienThi || report.id?.slice(0, 8).toUpperCase()}
                </p>
            </section>

            <section style={styles.infoSection}>
                <span style={styles.infoItem}><b>Phạm vi:</b> {reportTypeLabel}</span>
                <span style={styles.infoItem}><b>Ngày tạo:</b> {fullTime(report.createdAt)}</span>
                <span style={styles.infoItem}><b>Tổng:</b> {assets.length} loại, {totalQuantity} đơn vị</span>
            </section>

            <main>
                {groupedAssets.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px' }}>Không có dữ liệu tài sản</p>
                ) : (
                    groupedAssets.map(([deptName, deptAssets], groupIndex) => {
                        let runningIndex = 0;
                        // Calculate starting index for this department
                        for (let i = 0; i < groupIndex; i++) {
                            runningIndex += groupedAssets[i][1].length;
                        }

                        return (
                            <div key={deptName} style={{ pageBreakInside: 'avoid' }}>
                                <div style={styles.departmentHeader}>
                                    PHÒNG BAN: {deptName.toUpperCase()} ({deptAssets.length} tài sản)
                                </div>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: '5%' }}>STT</th>
                                            <th style={{ ...styles.th, width: '40%' }}>Tên tài sản</th>
                                            <th style={{ ...styles.th, width: '15%' }}>Kích thước</th>
                                            <th style={{ ...styles.th, width: '8%' }}>SL</th>
                                            <th style={{ ...styles.th, width: '8%' }}>ĐVT</th>
                                            <th style={{ ...styles.th, width: '14%' }}>Ngày kiểm kê</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deptAssets.map((asset, index) => (
                                            <tr key={asset.id || `${deptName}-${index}`}>
                                                <td style={styles.td}>{runningIndex + index + 1}</td>
                                                <td style={{ ...styles.td, textAlign: 'left' }}>
                                                    <b>{asset.name}</b>
                                                </td>
                                                <td style={styles.td}>{asset.size || '–'}</td>
                                                <td style={styles.td}>{asset.quantity || 0}</td>
                                                <td style={styles.td}>{asset.unit || ''}</td>
                                                <td style={styles.td}>
                                                    {formatInspectionDate(asset.inspectionDate)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })
                )}
            </main>

            <section className="no-break" style={styles.signatureRow}>
                <div style={styles.signatureCol}>
                    <SignatureDisplay signature={signatures.hc} role="P. Hành chính" />
                </div>
                {report.type === 'BLOCK_INVENTORY' && (
                    <div style={styles.signatureCol}>
                        <SignatureDisplay signature={signatures.deptLeader} role="Lãnh đạo Phòng" />
                    </div>
                )}
                {report.type === 'SUMMARY_REPORT' && (
                    <div style={styles.signatureCol}>
                        <SignatureDisplay signature={signatures.kt} role="P. Kế toán" />
                    </div>
                )}
                <div style={styles.signatureCol}>
                    <SignatureDisplay signature={signatures.director} role="Ban TGĐ" />
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
