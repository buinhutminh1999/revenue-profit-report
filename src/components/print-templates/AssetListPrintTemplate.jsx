import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// --- Theme & Styles (Không đổi) ---
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
        width: '60%',
        borderCollapse: 'collapse',
        marginBottom: theme.spacing.large,
        fontSize: '13px',
    },
    infoLabel: {
        textAlign: 'left',
        fontWeight: 600,
        padding: `${theme.spacing.small} 0`,
        width: '150px'
    },
    infoValue: {
        textAlign: 'left',
        padding: `${theme.spacing.small} ${theme.spacing.medium}`,
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
    conclusionSection: {
        marginTop: '25px',
        lineHeight: 1.6
    },
    conclusionTitle: {
        fontWeight: 'bold',
        fontSize: '14px',
        marginBottom: '10px'
    },
    conclusionPoint: {
        marginBottom: '8px',
        paddingLeft: '20px',
        textIndent: '-20px'
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
                <p style={styles.signatureTime}>{fullTime(signature.approvedAt || signature.signedAt)}</p>
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
export const AssetListPrintTemplate = React.forwardRef(({ report, company, departments }, ref) => {

    // 1. HOOK: TÍNH TOÁN VÀ NHÓM ASSETS (Vị trí 1 - Hợp lệ)
    const groupedAssets = useMemo(() => {
        if (!report?.assets || !departments) return [];

        const departmentMap = new Map(departments.map(d => [d.id, d.name]));
        const groups = new Map();

        const assetsToPrint = report.assets.filter(asset => Number(asset.quantity || 0) > 0);

        for (const asset of assetsToPrint) {
            const deptName = departmentMap.get(asset.departmentId) || "Phòng không xác định";
            if (!groups.has(deptName)) {
                groups.set(deptName, []);
            }
            groups.get(deptName).push(asset);
        }

        return Array.from(groups.entries())
            .map(([departmentName, assets]) => ({ departmentName, assets }))
            .sort((a, b) => a.departmentName.localeCompare(b.departmentName, 'vi'));

    }, [report?.assets, departments]);


    // 2. HOOK: TÍNH TOÁN TÊN VAI TRÒ CHỮ KÝ
    const leaderRoleName = useMemo(() => {
        if (!report?.blockName) {
            return "Phòng/Bộ phận";
        }
        if (report.blockName === 'Nhà máy') {
            return report.blockName; // Chỉ hiển thị "Nhà máy"
        }
        return `Phòng ${report.blockName}`; // Ví dụ: "Phòng Cung ứng"
    }, [report?.blockName]);


    // 3. ĐIỀU KIỆN RETURN SỚM
    if (!report || !departments) return null;

    const createdDate = formatDate(report.createdAt);
    const { signatures = {} } = report;

    // managementBlockName là tên Khối (Nhà máy) hoặc tên Phòng (Phòng Hành chính)
    const managementBlockName = report.blockName || report.departmentName;

    // ✅ Tên hiển thị: "Nhà máy" thì giữ nguyên, còn lại thêm "Phòng" phía trước
    const displayBlockName = report.blockName === 'Nhà máy'
        ? managementBlockName
        : (report.blockName ? `Phòng ${managementBlockName}` : managementBlockName);

    const qrValue = typeof window !== 'undefined'
        ? `${window.location.origin}/inventory-reports/${report.id}`
        : `/inventory-reports/${report.id}`;

    return (
        <div ref={ref} style={styles.page}>
            <header style={styles.header}>
                <div>
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
                <h1 style={styles.title}>{report.title || 'BIÊN BẢN KIỂM KÊ TÀI SẢN'}</h1>
                <p style={styles.subTitle}>
                    Ngày {createdDate.day} tháng {createdDate.month} năm {createdDate.year}
                </p>
                <p style={styles.documentId}>
                    Mã biên bản: {report.maPhieuHienThi || report.id?.slice(0, 8).toUpperCase()}
                </p>
            </section>

            <main>
                <table style={styles.infoTable}>
                    <tbody>
                        <tr>
                            <td style={styles.infoLabel}>Phòng kiểm kê:</td>
                            <td style={styles.infoValue}><b>{displayBlockName}</b></td>
                        </tr>
                        <tr>
                            <td style={styles.infoLabel}>Người lập biên bản:</td>
                            <td style={styles.infoValue}>{report.requester?.name}</td>
                        </tr>
                    </tbody>
                </table>

                <p style={{ margin: '20px 0 15px 0' }}>
                    Danh sách tài sản và công cụ được kiểm kê tại <b>{displayBlockName}</b> như sau:
                </p>

                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ ...styles.th, width: '5%' }}>STT</th>
                            <th style={{ ...styles.th, width: '35%', textAlign: 'left' }}>Tên tài sản</th>
                            <th style={{ ...styles.th, width: '15%' }}>Kích thước</th>
                            <th style={{ ...styles.th, width: '8%' }}>ĐVT</th>
                            <th style={{ ...styles.th, width: '7%' }}>SL</th>
                            <th style={{ ...styles.th, width: '30%', textAlign: 'left' }}>Ghi chú</th>
                        </tr>
                    </thead>

                    <tbody>
                        {groupedAssets.map(({ departmentName, assets }) => (
                            <React.Fragment key={departmentName}>
                                <tr style={{ backgroundColor: '#f0f0f0' }}>
                                    <td colSpan="6" style={{ ...styles.td, padding: '8px 12px', fontWeight: 700, textAlign: 'left', border: `1px solid ${theme.colors.border}` }}>
                                        {departmentName.toUpperCase()}
                                    </td>
                                </tr>
                                {assets.map((asset, index) => (
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
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>

                <p style={{ marginTop: '15px', fontStyle: 'italic', color: theme.colors.textSecondary }}>
                    Tổng cộng: {report.assets?.length || 0} loại tài sản.
                </p>

                <div style={styles.conclusionSection} className="no-break">
                    <div style={styles.conclusionTitle}>KẾT LUẬN:</div>
                    <div style={styles.conclusionPoint}>
                        <b>1. Sở hữu và quản lý tài sản:</b> Hai bên thống nhất rằng số tài sản trên đang thuộc quản lý và sở hữu của <b>{displayBlockName}</b>.
                    </div>
                    <div style={styles.conclusionPoint}>
                        <b>2. Trách nhiệm bảo quản tài sản:</b> <b>{displayBlockName}</b> có trách nhiệm bảo quản tài sản và đảm bảo tài sản luôn trong tình trạng tốt, không bị hư hỏng hoặc mất mát. Khi tài sản hư hỏng mất mát thì báo Phòng Hành chính xử lý.
                    </div>
                    <div style={styles.conclusionPoint}>
                        <b>3. Quy trình luân chuyển tài sản:</b> Trong trường hợp có luân chuyển tài sản, phải có biên bản luân chuyển để cập nhật lại thông tin tài sản của phòng mình.
                    </div>
                    <div style={styles.conclusionPoint}>
                        <b>4. Hư hỏng tài sản:</b> Các tài sản trên nếu có hư hỏng, phải đề xuất Phòng Hành chính kiểm tra và khắc phục sửa chữa nếu cần thiết.
                    </div>
                </div>
            </main>

            <section className="no-break" style={styles.signatureRow}>
                <div style={styles.signatureCol}>
                    <SignatureDisplay signature={signatures.hc} role="Phòng Hành chính" />
                </div>
                <div style={styles.signatureCol}>
                    <SignatureDisplay signature={signatures.deptLeader} role={leaderRoleName} />
                </div>
                <div style={styles.signatureCol}>
                    <SignatureDisplay signature={signatures.director} role="Ban Giám đốc" />
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