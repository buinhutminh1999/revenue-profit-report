import React from "react";
import { QRCodeSVG } from "qrcode.react";

// --- Theme & Styles ---
// Quản lý tập trung các giá trị thiết kế (màu sắc, font, khoảng cách)
// Giúp dễ dàng thay đổi toàn bộ giao diện sau này.
const theme = {
    colors: {
        primary: "#0d6efd", // Màu xanh dương chủ đạo
        text: "#212529", // Màu chữ chính
        textSecondary: "#6c757d", // Màu chữ phụ
        border: "#dee2e6", // Màu viền
        background: "#f8f9fa", // Màu nền nhẹ
        success: "#198754", // Màu xanh lá cho trạng thái thành công
        successLight: "#e8f3ec", // Màu nền xanh lá nhạt
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
        fontSize: "24px",
        fontWeight: "bold",
        margin: 0,
        textTransform: "uppercase",
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
        backgroundColor: theme.colors.background,
        padding: `${theme.spacing.medium} ${theme.spacing.large}`,
        border: `1px solid ${theme.colors.border}`,
        borderBottom: "none",
        borderRadius: "6px 6px 0 0",
        margin: "0",
        fontSize: "15px",
        fontWeight: 600,
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        border: `1px solid ${theme.colors.border}`,
        fontSize: "12px",
    },
    th: {
        border: `1px solid ${theme.colors.border}`, // <<< THAY ĐỔI: Kẻ khung đầy đủ cho header
        padding: theme.spacing.medium,
        fontWeight: 600,
        backgroundColor: theme.colors.background,
        textAlign: "left",
        verticalAlign: "middle",
    },
    td: {
        border: `1px solid ${theme.colors.border}`, // <<< THAY ĐỔI: Kẻ khung đầy đủ cho các ô
        padding: theme.spacing.medium,
        textAlign: "left",
        height: "auto",
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
        marginBottom: theme.spacing.large,
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
        fontSize: "14px",
        minHeight: "20px",
    },
    footer: {
        marginTop: "40px", // Thay 'auto' bằng một khoảng cách cụ thể, ví dụ 40px
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
                    {fullTime(signature.signedAt)}
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
    ({ report, company }, ref) => {
        // Dùng useMemo để chỉ tính toán lại khi report thay đổi, tối ưu hiệu năng
        const processedData = React.useMemo(() => {
            if (!report) return null;

            const departmentMap = {};
            if (
                report?.departmentMap &&
                typeof report.departmentMap === "object"
            ) {
                Object.assign(departmentMap, report.departmentMap);
            }
            if (Array.isArray(report?.departments)) {
                for (const d of report.departments) {
                    if (d?.id && d?.name) departmentMap[d.id] = d.name;
                }
            }

            const resolveDeptName = (asset) => {
                if (asset?.departmentName) return asset.departmentName;
                const id =
                    asset?.departmentId ||
                    (asset?.department && typeof asset.department === "object"
                        ? asset.department.id
                        : null);
                return departmentMap[id] || "Chưa phân loại";
            };

            const assetsByDept = (report.assets || []).reduce((acc, asset) => {
                const deptName = resolveDeptName(asset);
                if (!acc[deptName]) acc[deptName] = [];
                acc[deptName].push(asset);
                return acc;
            }, {});

            const sortedDeptNames = Object.keys(assetsByDept).sort((a, b) =>
                a.localeCompare(b, "vi")
            );

            const grandTotal = (report.assets || []).reduce(
                (sum, asset) => sum + Number(asset?.quantity || 0),
                0
            );

            return { sortedDeptNames, assetsByDept, grandTotal };
        }, [report]);

        if (!report || !processedData) return null;

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
                        {report.title || "BIÊN BẢN KIỂM KÊ TÀI SẢN"}
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
                        const deptTotal = assets.reduce(
                            (s, a) => s + Number(a?.quantity || 0),
                            0
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
                                            <th
                                                style={{
                                                    ...styles.th,
                                                    width: "7%",
                                                    textAlign: "center",
                                                }}
                                            >
                                                STT
                                            </th>
                                            <th
                                                style={{
                                                    ...styles.th,
                                                    width: "45%",
                                                }}
                                            >
                                                Tên tài sản
                                            </th>
                                            <th
                                                style={{
                                                    ...styles.th,
                                                    width: "10%",
                                                    textAlign: "center",
                                                }}
                                            >
                                                ĐVT
                                            </th>
                                            <th
                                                style={{
                                                    ...styles.th,
                                                    width: "13%",
                                                    textAlign: "right",
                                                }}
                                            >
                                                Số lượng
                                            </th>
                                            <th
                                                style={{
                                                    ...styles.th,
                                                    width: "25%",
                                                }}
                                            >
                                                Ghi chú
                                            </th>
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
                                                <td
                                                    style={{
                                                        ...styles.td,
                                                        textAlign: "center",
                                                    }}
                                                >
                                                    {index + 1}
                                                </td>
                                                <td style={styles.td}>
                                                    {asset.name}
                                                </td>
                                                <td
                                                    style={{
                                                        ...styles.td,
                                                        textAlign: "center",
                                                    }}
                                                >
                                                    {asset.unit || ""}
                                                </td>
                                                <td
                                                    style={{
                                                        ...styles.td,
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    {Number(
                                                        asset.quantity || 0
                                                    ).toLocaleString("vi-VN")}
                                                </td>
                                                <td style={styles.td}>
                                                    {asset.notes || ""}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr style={styles.totalRow}>
                                            <td
                                                colSpan={3}
                                                style={{
                                                    ...styles.td,
                                                    textAlign: "right",
                                                }}
                                            >
                                                Cộng phòng ban:
                                            </td>
                                            <td
                                                style={{
                                                    ...styles.td,
                                                    textAlign: "right",
                                                }}
                                            >
                                                {deptTotal.toLocaleString(
                                                    "vi-VN"
                                                )}
                                            </td>
                                            <td style={styles.td}></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}

                    <div className="no-break" style={styles.grandTotalWrapper}>
                        <table style={styles.grandTotalTable}>
                            <tbody>
                                <tr style={styles.totalRow}>
                                    <td
                                        style={{
                                            ...styles.td,
                                            textAlign: "right",
                                        }}
                                    >
                                        TỔNG CỘNG:
                                    </td>
                                    <td
                                        style={{
                                            ...styles.td,
                                            width: "30%",
                                            textAlign: "right",
                                            fontSize: "14px",
                                        }}
                                    >
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

                {/* CSS Fix for printing */}
                <style>{`
        @page {
          size: A4;
          margin: 10mm 10mm 12mm 10mm; /* có lề đáy để đặt footer cố định */
        }

        @media print {
          html, body { margin:0 !important; padding:0 !important; }

          .print-page {
            box-shadow:none;
            width:210mm !important;
            min-height:auto !important;
            padding:0 !important; /* bỏ padding vì đã có @page margin */
            margin:0 !important;
          }

          /* Phòng ban có thể tách trang */
          .dept-section {
            break-inside:auto;
            page-break-inside:auto;
            margin: 0 0 12px 0;
          }

          /* Bảng tách trang đẹp: lặp lại header, tránh vỡ dòng */
          table { page-break-inside:auto; }
          tr, td, th { page-break-inside:avoid; break-inside:avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }

          /* Chữ ký giữ nguyên khối (nếu muốn) */
          .no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Footer cố định đáy mỗi trang, không cho ngắt trước */
          #asset-footer {
            position: fixed;
            bottom: 6mm;
            left: 0;
            right: 0;
            text-align: center;
            page-break-before: avoid;
          }
        }
            `}</style>
            </div>
        );
    }
);