import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

// --- Helper Functions ---
const fullTime = (ts) => {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (!d || Number.isNaN(+d)) return "";
    return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
};
const formatDate = (ts) => {
    if (!ts) return { day: '..', month: '..', year: '....' };
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return { day: String(d.getDate()).padStart(2, '0'), month: String(d.getMonth() + 1).padStart(2, '0'), year: d.getFullYear() };
};
const formatCurrency = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '–';
    return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

// --- Child Component for Signatures ---
const SignatureDisplay = ({ signature, role }) => {
    if (!signature) {
        return (
            <>
                <b>{role}</b>
                <div style={styles.signaturePlaceholder}><i>(Chưa ký)</i></div>
                <p style={styles.signatureName}>......................................</p>
            </>
        );
    }
    return (
        <>
            <b>{role}</b>
            <div style={styles.signatureContent}>
                <p style={styles.signatureStatus}><span style={styles.checkIcon}>✔</span> Đã ký điện tử</p>
                <p style={styles.signatureTime}>Lúc: {fullTime(signature.signedAt)}</p>
            </div>
            <p style={styles.signatureName}>{signature.name}</p>
        </>
    );
};

// --- Main Print Component ---
export const AssetSummaryPrintTemplate = React.forwardRef(({ report, company }, ref) => {
    if (!report) return null;

    const createdDate = formatDate(report.createdAt);
    const { signatures = {} } = report;

    // Logic để nhóm tài sản theo phòng ban
    const assetsByDept = (report.assets || []).reduce((acc, asset) => {
        const deptName = asset.departmentName || 'Chưa phân loại';
        if (!acc[deptName]) {
            acc[deptName] = { assets: [], totalValue: 0 };
        }
        acc[deptName].assets.push(asset);
        acc[deptName].totalValue += (Number(asset.quantity || 0) * Number(asset.price || 0));
        return acc;
    }, {});

    const grandTotalValue = Object.values(assetsByDept).reduce((sum, dept) => sum + dept.totalValue, 0);

    const qrValue = typeof window !== 'undefined'
        ? `${window.location.origin}/inventory-reports/${report.id}`
        : `/inventory-reports/${report.id}`;

    return (
        <div ref={ref} style={styles.page}>
            <div style={styles.header}>
                <div>
                    <h3 style={styles.companyName}>{company?.name || 'CÔNG TY'}</h3>
                    <p style={styles.companyInfo}>Địa chỉ: {company?.address || '................................'}<br />Điện thoại: {company?.phone || '..................'}</p>
                </div>
                <div style={styles.headerRight}>
                    <QRCodeSVG value={qrValue} size={80} level="H" includeMargin={false} />
                    <p style={styles.qrLabel}>Quét để xem & duyệt</p>
                </div>
            </div>

            <div style={styles.titleSection}>
                <h1 style={styles.title}>{report.title || 'BÁO CÁO TỔNG HỢP TÀI SẢN'}</h1>
                <p style={styles.subTitle}>Ngày {createdDate.day} tháng {createdDate.month} năm {createdDate.year}</p>
                {/* MODIFIED: Sử dụng mã phiếu hiển thị */}
                <p style={styles.documentId}>Mã phiếu: {report.maPhieuHienThi || report.id?.slice(0, 8).toUpperCase()}</p>
            </div>
            
            {/* Lặp qua từng phòng ban và render bảng tài sản */}
            {Object.entries(assetsByDept).map(([deptName, { assets, totalValue }]) => (
                <div key={deptName} className="no-break" style={{ marginTop: '20px' }}>
                    <h4 style={styles.departmentHeader}>PHÒNG BAN: {deptName}</h4>
                    <table style={styles.table}>
                        <thead>
                             {/* MODIFIED: Cập nhật các cột trong bảng */}
                            <tr>
                                <th style={{ ...styles.th, width: '5%' }}>STT</th>
                                <th style={{ ...styles.th, width: '15%' }}>Mã tài sản</th>
                                <th style={{ ...styles.th, width: '30%', textAlign: 'left' }}>Tên tài sản</th>
                                <th style={{ ...styles.th, width: '5%' }}>SL</th>
                                <th style={{ ...styles.th, width: '15%' }}>Đơn giá</th>
                                <th style={{ ...styles.th, width: '15%' }}>Thành tiền</th>
                                <th style={{ ...styles.th, width: '15%' }}>Kết luận</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.map((asset, index) => (
                                <tr key={asset.id || index}>
                                    <td style={styles.td}>{index + 1}</td>
                                    <td style={styles.td}>{asset.code || '–'}</td>
                                    <td style={{ ...styles.td, textAlign: 'left', padding: '8px 10px' }}>{asset.name}</td>
                                    <td style={{ ...styles.td, textAlign: 'right' }}>{Number(asset.quantity || 0).toLocaleString('vi-VN')}</td>
                                    {/* ADDED: Cột Đơn giá */}
                                    <td style={{ ...styles.td, textAlign: 'right', paddingRight: '10px' }}>{formatCurrency(Number(asset.price || 0))}</td>
                                    <td style={{ ...styles.td, textAlign: 'right', paddingRight: '10px' }}>{formatCurrency(Number(asset.quantity || 0) * Number(asset.price || 0))}</td>
                                    {/* ADDED: Cột Kết luận (trống) */}
                                    <td style={styles.td}></td>
                                </tr>
                            ))}
                             {/* MODIFIED: Cập nhật hàng tổng cộng */}
                            <tr>
                                <td colSpan="5" style={{...styles.td, textAlign: 'right', fontWeight: 'bold', paddingRight: '10px'}}>TỔNG CỘNG ({deptName})</td>
                                <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', paddingRight: '10px', backgroundColor: '#f8f9fa'}}>{formatCurrency(totalValue)}</td>
                                <td style={styles.td}></td>
                            </tr>
                        </tbody>
                    </table>
                     {/* ADDED: Phần kết luận và các lưu ý */}
                    <div className="no-break" style={styles.conclusionSection}>
                        <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', textTransform: 'uppercase' }}>Kết luận:</h4>
                        <ol style={styles.conclusionList}>
                            <li><b>Sở hữu và quản lý tài sản:</b> Hai bên thống nhất rằng số tài sản trên đang thuộc quản lý và sở hữu của Phòng Cung ứng.</li>
                            <li><b>Trách nhiệm bảo quản tài sản:</b> Phòng Cung ứng có trách nhiệm bảo quản tài sản này và đảm bảo tài sản luôn trong tình trạng tốt, không bị hư hỏng hoặc mất mát.</li>
                            <li><b>Quy trình luân chuyển tài sản:</b> Trong trường hợp có luân chuyển tài sản, phải có biên bản luân chuyển được Ban Tổng Giám đốc duyệt và chuyển kịp thời cho Phòng Hành chính để cập nhật lại thông tin tài sản của phòng mình.</li>
                            <li><b>Hư hỏng tài sản:</b> Các tài sản trên nếu có hư hỏng, phải đề xuất Phòng Hành chính kiểm tra và khắc phục sửa chữa nếu cần thiết.</li>
                        </ol>
                    </div>
                </div>
            ))}

            {/* Chỉ hiển thị tổng giá trị toàn công ty nếu có nhiều hơn 1 phòng ban */}
            {Object.keys(assetsByDept).length > 1 && (
                <div style={styles.grandTotal}>
                    <p><strong>TỔNG GIÁ TRỊ TÀI SẢN TOÀN CÔNG TY: {formatCurrency(grandTotalValue)}</strong></p>
                </div>
            )}

            <div className="no-break" style={{ marginTop: '40px' }}>
                 {/* MODIFIED: Cập nhật tên các bên ký */}
                <div style={styles.signatureRow}>
                    <div style={styles.signatureCol}><SignatureDisplay signature={signatures.hc} role="Bên giao" /></div>
                    <div style={styles.signatureCol}><SignatureDisplay signature={signatures.kt} role="Bên nhận" /></div>
                    <div style={styles.signatureCol}><SignatureDisplay signature={signatures.director} role="Ban Tổng giám đốc" /></div>
                </div>
            </div>

            <div style={styles.footer}>
                <p>In từ hệ thống Quản lý Tài sản • {new Date().toLocaleString('vi-VN')}</p>
            </div>
            
            <style>{`@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .no-break { page-break-inside: avoid; } }`}</style>
        </div>
    );
});

const styles = {
    page: { width: '210mm', minHeight: '297mm', padding: '15mm', margin: '0 auto', backgroundColor: 'white', fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", fontSize: '12px', color: '#212529', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '10px' },
    companyName: { margin: 0, textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px' },
    companyInfo: { margin: '4px 0 0', fontSize: '10px', color: '#555', lineHeight: 1.4 },
    headerRight: { textAlign: 'center' },
    qrLabel: { fontSize: '9px', margin: '4px 0 0', color: '#666' },
    titleSection: { textAlign: 'center', margin: '25px 0' },
    title: { fontSize: '22px', fontWeight: '700', margin: 0, textTransform: 'uppercase' },
    subTitle: { margin: '5px 0', fontSize: '11px', color: '#444' },
    documentId: { fontWeight: '600', fontSize: '12px', color: '#444' },
    infoTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '12px' },
    infoLabel: { textAlign: 'left', fontWeight: '600', padding: '4px 0', width: '150px' },
    infoValue: { textAlign: 'left', padding: '4px 0', borderBottom: '1px dotted #ccc' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
    th: { border: '1px solid #999', padding: '8px 6px', fontWeight: '600', backgroundColor: '#f8f9fa', textAlign: 'center', verticalAlign: 'middle' },
    td: { border: '1px solid #999', padding: '6px', textAlign: 'center', height: 'auto', verticalAlign: 'middle' },
    signatureRow: { display: 'flex', gap: 16, marginTop: 16, textAlign: 'center' },
    signatureCol: { flex: 1, padding: '0 8px' },
    signaturePlaceholder: { height: '50px', margin: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#999', borderBottom: '1px dotted #ccc' },
    signatureContent: { border: '1px solid #28a745', borderRadius: '4px', backgroundColor: '#f0fff4', padding: '8px', margin: '8px 0', height: '50px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    signatureStatus: { color: '#28a745', fontWeight: 'bold', fontSize: '11px', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    checkIcon: { marginRight: '5px', fontSize: '14px', lineHeight: 1 },
    signatureTime: { fontSize: '10px', color: '#555', margin: 0 },
    signatureName: { fontWeight: '600', marginTop: '8px', fontSize: '13px', minHeight: '18px' },
    footer: { marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '9px', color: '#aaa', pageBreakInside: 'avoid' },
    departmentHeader: {
        backgroundColor: '#e9ecef',
        padding: '8px 12px',
        border: '1px solid #adb5bd',
        borderBottom: 'none',
        borderRadius: '4px 4px 0 0',
        margin: '0',
        fontSize: '14px',
    },
    grandTotal: {
        marginTop: '25px',
        paddingTop: '15px',
        borderTop: '2px solid #000',
        textAlign: 'right',
        fontSize: '14px'
    },
    // ADDED: Styles for conclusion section
    conclusionSection: {
        marginTop: '20px',
        fontSize: '11px',
        textAlign: 'justify',
    },
    conclusionList: {
        margin: 0,
        paddingLeft: '20px',
        lineHeight: 1.6,
        listStylePosition: 'outside'
    }
};