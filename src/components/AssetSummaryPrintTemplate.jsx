import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// --- Theme & Styles ---
const theme = {
    colors: {
        primary: "#0d6efd",
        accent: "#e9ecef",
        text: "#212529",
        textSecondary: "#6c757d",
        border: "#dee2e6",
        background: "#f8f9fa",
        success: "#198754",
        successLight: "#e8f3ec",
    },
    font: {
        family: "'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        size: "14px",
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
    departmentSection: {
        marginTop: theme.spacing.xlarge,
    },
    departmentHeader: {
        padding: `${theme.spacing.medium} 0`,
        borderBottom: `2px solid ${theme.colors.text}`,
        margin: `0 0 ${theme.spacing.large} 0`,
        fontSize: "16px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        breakAfter: 'avoid',
        pageBreakAfter: 'avoid',
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "13px",
        border: `1px solid ${theme.colors.border}`,
    },
    th: {
        padding: theme.spacing.medium,
        border: `1px solid ${theme.colors.border}`,
        fontWeight: 600,
        textAlign: "left",
        textTransform: "uppercase",
        fontSize: "12px",
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.background,
    },
    td: {
        padding: `12px ${theme.spacing.medium}`,
        border: `1px solid ${theme.colors.border}`,
        textAlign: "left",
        verticalAlign: "middle",
    },
    totalRow: {
        fontWeight: 700,
        backgroundColor: theme.colors.background,
    },
    grandTotalWrapper: {
        marginTop: theme.spacing.large,
        display: "flex",
        justifyContent: "flex-end",
    },
    grandTotalTable: {
        width: "50%",
        borderCollapse: "collapse",
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
        marginTop: "40px",
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
    return d.toLocaleString("vi-VN", {
        timeStyle: "medium",
        dateStyle: "short",
    });
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

// --- Child Component for Signatures ---
const SignatureDisplay = ({ signature, role }) => (
    <>
        <b style={styles.signatureRole}>{role}</b>
        {signature ? (
            <div style={{ ...styles.signatureBox, ...styles.signatureContent }}>
                <p style={styles.signatureStatus}>✔ Đã ký điện tử</p>
                <p style={styles.signatureTime}>
                    {fullTime(signature.approvedAt || signature.signedAt)}
                </p>
            </div>
        ) : (
            <div
                style={{
                    ...styles.signatureBox,
                    ...styles.signaturePlaceholder,
                }}
            >
                <span>(Chưa ký)</span>
            </div>
        )}
        <p style={styles.signatureName}>{signature?.name || "..."}</p>
    </>
);


// --- Main Print Component ---
export const AssetSummaryPrintTemplate = React.forwardRef(
    ({ report, company, departments }, ref) => {
        
        // Thay thế khối useMemo hiện tại (từ dòng 110 đến 130) bằng mã sau:
const processedData = useMemo(() => {
    if (!report?.assets || !Array.isArray(departments)) {
        return { sortedDeptNames: [], assetsByDept: {}, grandTotal: 0 };
    }

    const departmentMap = new Map(
        departments.map(d => [d.id, d.name])
    );

    // Lọc tài sản có số lượng > 0 trước khi nhóm
    const filteredAssets = report.assets.filter(asset => Number(asset.quantity || 0) > 0);

    const assetsByDept = filteredAssets.reduce((acc, asset) => { // Dùng filteredAssets
        const deptName = departmentMap.get(asset.departmentId) || "Chưa phân loại";
        if (!acc[deptName]) {
            acc[deptName] = [];
        }
        acc[deptName].push(asset);
        return acc;
    }, {});

    const sortedDeptNames = Object.keys(assetsByDept).sort((a, b) => a.localeCompare(b, "vi"));
    // Tổng số loại tài sản (sau khi lọc số lượng = 0)
    const totalAssetTypes = filteredAssets.length; 

    return { sortedDeptNames, assetsByDept, grandTotal: totalAssetTypes };
    
}, [report, departments]);

        if (!report || !processedData) {
             // Thêm một điểm return an toàn ở đây
             return <div ref={ref}>Đang tải dữ liệu...</div>;
        }

        const { sortedDeptNames, assetsByDept, grandTotal } = processedData;
        const createdDate = formatDate(report.createdAt);
        const { signatures = {} } = report;

        const qrValue =
            typeof window !== "undefined"
                ? `${window.location.origin}/inventory-reports/${report.id}`
                : `/inventory-reports/${report.id}`;

        return (
            <div ref={ref} className="print-page" style={styles.page}>
                <header style={styles.header}>
                    <div>
                        <h3 style={styles.companyName}>
                            {company?.name || "TÊN CÔNG TY"}
                        </h3>
                        <p style={styles.companyInfo}>
                            Địa chỉ:{" "}
                            {company?.address ||
                                "................................"}
                            <br />
                            Điện thoại: {company?.phone || ".................."}
                        </p>
                    </div>
                    <div style={styles.headerRight}>
                        <QRCodeSVG value={qrValue} size={80} level="H" />
                        <p style={styles.qrLabel}>Quét để xem & duyệt</p>
                    </div>
                </header>

                <section style={styles.titleSection}>
                    <h1 style={styles.title}>
                        {"BẢNG KÊ KHAI TÀI SẢN"}
                    </h1>
                    <p style={styles.subTitle}>
                        Ngày {createdDate.day} tháng {createdDate.month} năm{" "}
                        {createdDate.year}
                    </p>
                    <p style={styles.documentId}>
                        Mã phiếu:{" "}
                        {report.maPhieuHienThi ||
                            report.id?.slice(0, 8).toUpperCase()}
                    </p>
                </section>

                <main>
                    {sortedDeptNames.map((deptName) => {
                        const assets = assetsByDept[deptName]
                            .slice()
                            .sort((a, b) =>
                                (a.name || "").localeCompare(b.name || "", "vi")
                            );

                        return (
                            <div
                                key={deptName}
                                className="dept-section"
                                style={styles.departmentSection}
                            >
                                <h4 style={styles.departmentHeader}>
                                    PHÒNG BAN: {deptName}
                                </h4>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: "7%", textAlign: "center" }}>STT</th>
                                            <th style={{ ...styles.th, width: "45%" }}>Tên tài sản</th>
                                            <th style={{ ...styles.th, width: "12%" }}>Kích thước</th>
                                            <th style={{ ...styles.th, width: "10%", textAlign: "center" }}>ĐVT</th>
                                            <th style={{ ...styles.th, width: "13%", textAlign: "right" }}>Số lượng</th>
                                            <th style={{ ...styles.th, width: "25%", textAlign: "center" }}>Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assets.map((asset, index) => (
                                            <tr
                                                key={
                                                    asset.id ||
                                                    `${deptName}-${index}`
                                                }
                                            >
                                                <td style={{ ...styles.td, textAlign: "center" }}>
                                                    {index + 1}
                                                </td>
                                                <td style={styles.td}>
                                                    {asset.name}
                                                </td>
                                                <td style={styles.td}>{asset.size || ""}</td>
                                                <td style={{ ...styles.td, textAlign: "center" }}>
                                                    {asset.unit || ""}
                                                </td>
                                                <td style={{ ...styles.td, textAlign: "right" }}>
                                                    {Number(
                                                        asset.quantity || 0
                                                    ).toLocaleString("vi-VN")}
                                                </td>
                                                <td style={styles.td}>
                                                    {asset.notes || ""}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}

                    <div className="no-break" style={styles.grandTotalWrapper}>
                        <table style={styles.grandTotalTable}>
                            <tbody>
                                <tr style={styles.totalRow}>
                                    <td style={{ ...styles.td, textAlign: "right" }}>
                                        Tổng số loại tài sản:
                                    </td>
                                    <td style={{ ...styles.td, width: "30%", textAlign: "right", fontSize: "14px" }}>
                                        {grandTotal.toLocaleString("vi-VN")}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </main>
                
                <section className="no-break" style={styles.signatureRow}>
                    <div style={styles.signatureCol}>
                        <SignatureDisplay
                            signature={signatures.hc}
                            role="P.HC"
                        />
                    </div>
                    <div style={styles.signatureCol}>
                        <SignatureDisplay
                            signature={signatures.kt}
                            role="P.KT"
                        />
                    </div>
                    <div style={styles.signatureCol}>
                        <SignatureDisplay
                            signature={signatures.director}
                            role="Ban Tổng giám đốc"
                        />
                    </div>
                </section>

                <footer style={styles.footer} className="no-break">
                    <p>
                        In từ hệ thống Quản lý Tài sản •{" "}
                        {new Date().toLocaleString("vi-VN")}
                    </p>
                </footer>

                <style>{`
@page {
    size: A4;
    margin: 10mm 10mm 12mm 10mm;
}
@media print {
    html, body { margin:0 !important; padding:0 !important; }
    .print-page {
        box-shadow: none;
        width: 100% !important;
        min-height: auto !important;
        padding: 0 !important;
        margin: 0 !important;
    }
    .dept-section table tbody tr:nth-child(even) {
        background-color: #f8f9fa;
    }
    table { page-break-inside:auto; }
    tr, td, th { page-break-inside:avoid; break-inside:avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    .no-break {
        break-inside: avoid;
        page-break-inside: avoid;
    }
}
`}</style>
            </div>
        );
    }
);