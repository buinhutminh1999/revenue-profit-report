// src/components/TransferPrintTemplate.jsx
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/** Hiển thị chữ ký điện tử / placeholder */
const SignatureDisplay = ({ signature, role }) => {
  // format thời gian ký
  const fullTime = (ts) => {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (!d || Number.isNaN(+d)) return '';
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (!signature) {
    return (
      <>
        <b>{role}</b>
        <div style={styles.signaturePlaceholder}>
          <i>(Chưa ký)</i>
        </div>
        <p style={styles.signatureName}>......................................</p>
      </>
    );
  }

  return (
    <>
      <b>{role}</b>
      <div style={styles.signatureContent}>
        <p style={styles.signatureStatus}>
          <span style={styles.checkIcon}>✔</span> Đã ký điện tử
        </p>
        <p style={styles.signatureTime}>
          Lúc: {fullTime(signature.signedAt)}
          {signature.uid ? ` • UID: ${signature.uid}` : ''}
        </p>
      </div>
      <p style={styles.signatureName}>{signature.name}</p>
    </>
  );
};

export const TransferPrintTemplate = React.forwardRef(({ transfer, company }, ref) => {
  if (!transfer) return null;

  const formatDate = (ts) => {
    if (!ts) return { day: '...', month: '...', year: '...' };
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return {
      day: String(d.getDate()).padStart(2, '0'),
      month: String(d.getMonth() + 1).padStart(2, '0'),
      year: d.getFullYear(),
    };
  };

  const createdDate = formatDate(transfer.date);
  const { signatures = {} } = transfer;

  const nf = new Intl.NumberFormat('vi-VN');
  const totalQty = (transfer.assets || []).reduce((s, a) => s + Number(a.quantity || 0), 0);

  // QR code value: an toàn với SSR
  const qrValue =
    typeof window !== 'undefined'
      ? `${window.location.origin}/transfers/${transfer.id}`
      : `/transfers/${transfer.id}`;

  return (
    <div ref={ref} style={styles.page}>
      {/* Watermark trạng thái (nếu chưa hoàn tất) */}
      {transfer.status !== 'COMPLETED' && (
        <div
          style={{
            position: 'fixed',
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 72,
            fontWeight: 800,
            color: '#0002',
            letterSpacing: 8,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {transfer.status === 'PENDING_ADMIN' ? 'ĐANG DUYỆT' : 'NHÁP'}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.companyName}>{company?.name || 'CÔNG TY CP XÂY DỰNG BÁCH KHOA'}</h3>
          <p style={styles.companyInfo}>
            Địa chỉ: {company?.address || 'Số 39, Đường Trần Hưng Đạo, Phường Long Xuyên, An Giang'}
            <br />
            Điện thoại: {company?.phone || '0296 3835 787'}
          </p>
        </div>
        <div style={styles.headerRight}>
          <QRCodeSVG value={qrValue} size={80} level="H" includeMargin={false} />
          <p style={styles.qrLabel}>Quét để xem online</p>
        </div>
      </div>

      {/* Tiêu đề */}
      <div style={styles.titleSection}>
        <h1 style={styles.title}>PHIẾU LUÂN CHUYỂN TÀI SẢN</h1>
        <p style={styles.subTitle}>
          Ngày {createdDate.day} tháng {createdDate.month} năm {createdDate.year}
        </p>
        <p style={styles.documentId}>Mã phiếu: #{transfer.id.slice(0, 8).toUpperCase()}</p>
      </div>

      {/* Thông tin chung */}
      <table style={styles.infoTable}>
        <tbody>
          <tr>
            <td style={styles.infoLabel}>Từ phòng/bộ phận:</td>
            <td style={styles.infoValue}>{transfer.from}</td>
          </tr>
          <tr>
            <td style={styles.infoLabel}>Đến phòng/bộ phận:</td>
            <td style={styles.infoValue}>{transfer.to}</td>
          </tr>
          <tr>
            <td style={styles.infoLabel}>Người tạo phiếu:</td>
            <td style={styles.infoValue}>{transfer.createdBy?.name}</td>
          </tr>
          {transfer.note ? (
            <tr>
              <td style={styles.infoLabel}>Ghi chú:</td>
              <td style={styles.infoValue}>{transfer.note}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* Bảng tài sản */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: '40px' }}>STT</th>
            <th style={{ ...styles.th, width: '40%', textAlign: 'left' }}>Tên tài sản</th>
            <th style={styles.th}>Kích thước</th>
            <th style={styles.th}>ĐVT</th>
            <th style={{ ...styles.th, width: '80px' }}>Số lượng</th>
          </tr>
        </thead>
        <tbody>
          {(transfer.assets || []).map((asset, index) => (
            <tr key={asset.id || index}>
              <td style={styles.td}>{index + 1}</td>
              <td style={{ ...styles.td, textAlign: 'left', padding: '8px 10px' }}>{asset.name}</td>
              <td style={styles.td}>{asset.size || '–'}</td>
              <td style={styles.td}>{asset.unit}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{nf.format(asset.quantity)}</td>
            </tr>
          ))}
          {/* Dòng trống để bảng đủ dài/đẹp hơn khi ít item */}
          {Array.from({ length: Math.max(0, 8 - (transfer.assets || []).length) }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td style={styles.td}>
                <span style={{ color: '#fff' }}>.</span>
              </td>
              <td style={styles.td}></td>
              <td style={styles.td}></td>
              <td style={styles.td}></td>
              <td style={styles.td}></td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 10, fontStyle: 'italic' }}>
        Tổng số dòng: {transfer.assets?.length || 0} • Tổng số lượng: {nf.format(totalQty)}
      </p>

      {/* Chữ ký */}
      <div className="no-break" style={styles.signatureRow}>
        <div style={styles.signatureCol}>
          <SignatureDisplay signature={signatures.sender} role="Phòng Chuyển" />
        </div>
        <div style={styles.signatureCol}>
          <SignatureDisplay signature={signatures.receiver} role="Phòng Nhận" />
        </div>
        <div style={styles.signatureCol}>
          <SignatureDisplay signature={signatures.admin} role="P. Hành chính" />
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p>Generated by AppName • {new Date().toLocaleString('vi-VN')}</p>
      </div>

      {/* Quy tắc in: ngắt trang, lặp header, màu sắc, lề… */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr, td, th { page-break-inside: avoid; }
          .no-break { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
});

// Styles
const styles = {
  page: {
    width: '210mm',
    minHeight: '297mm',
    padding: '15mm',
    margin: '0 auto',
    backgroundColor: 'white',
    fontFamily:
      "'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Liberation Sans', 'Noto Sans', sans-serif",
    fontSize: '12px',
    color: '#212529',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '2px solid #000',
    paddingBottom: '10px',
  },
  companyName: { margin: 0, textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px' },
  companyInfo: { margin: '4px 0 0', fontSize: '10px', color: '#555', lineHeight: 1.4 },
  headerRight: { textAlign: 'center' },
  qrLabel: { fontSize: '9px', margin: '4px 0 0', color: '#666' },

  titleSection: { textAlign: 'center', margin: '25px 0' },
  title: { fontSize: '22px', fontWeight: '700', margin: 0, textTransform: 'uppercase' },
  subTitle: { margin: '5px 0', fontSize: '11px', color: '#444' },
  documentId: { fontWeight: '600', fontSize: '11px', color: '#444' },

  infoTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' },
  infoLabel: { textAlign: 'left', fontWeight: '600', padding: '4px 0', width: '150px' },
  infoValue: { textAlign: 'left', padding: '4px 0', borderBottom: '1px dotted #ccc' },

  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: {
    border: '1px solid #999',
    padding: '10px 8px',
    fontWeight: '600',
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
  },
  td: { border: '1px solid #999', padding: '8px', textAlign: 'center', height: '32px' },

  signatureRow: { display: 'flex', gap: 16, marginTop: 32, textAlign: 'center' },
  signatureCol: { flex: 1, padding: '0 8px' },

  signaturePlaceholder: {
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    color: '#999',
  },
  signatureContent: {
    border: '1px solid #28a745',
    borderRadius: '4px',
    backgroundColor: '#f0fff4',
    padding: '8px',
    margin: '8px 0',
    height: '60px',
    boxSizing: 'border-box',
  },
  signatureStatus: {
    color: '#28a745',
    fontWeight: 'bold',
    fontSize: '11px',
    margin: '0 0 5px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: { marginRight: '5px', fontSize: '14px', lineHeight: 1 },
  signatureTime: { fontSize: '10px', color: '#555', margin: 0 },
  signatureName: { fontWeight: '600', marginTop: '10px', fontSize: '13px' },

  footer: {
    marginTop: 'auto',
    paddingTop: '10px',
    borderTop: '1px solid #eee',
    textAlign: 'center',
    fontSize: '9px',
    color: '#aaa',
  },
};
