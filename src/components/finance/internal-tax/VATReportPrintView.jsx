import React from 'react';
import { parseCurrency, formatCurrencyOrDash } from '../../../utils/currencyHelpers';

const VATReportPrintView = ({
    month,
    year,
    periodString,
    previousPeriodTax,
    displayData,
    summaryRows,
    summaryRowsConfig
}) => {
    // --- HELPERS ---
    const fmt = (val) => {
        if (val === 0 || val === '0' || val === '-') return '-';
        if (val === undefined || val === null) return '-';
        if (typeof val === 'number') return formatCurrencyOrDash(val);
        if (val === '0') return '-';
        return val;
    };

    const calcRowTotal = (row) => {
        return parseCurrency(row.bk) + parseCurrency(row.bkct) + parseCurrency(row.bklx) + parseCurrency(row.kt) + parseCurrency(row.av);
    };

    const calcObjTotal = (obj) => {
        return parseCurrency(obj?.bk) + parseCurrency(obj?.bkct) + parseCurrency(obj?.bklx) + parseCurrency(obj?.kt) + parseCurrency(obj?.av);
    };

    const monthStr = month && year ? `T${month} ${year}` : "T-- ----";
    const quarterStr = month ? `QUÝ ${Math.ceil(parseInt(month) / 3)}` : "QUÝ -";

    // --- DATA CALCULATION ---
    const inputRaw = displayData.input.rawTotalTax || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };
    const outputRaw = displayData.output.rawTotalTax || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };
    const adjustment1pct = summaryRows['adjustment_1pct'] || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };

    const calculateDeductible = (col) => {
        return (previousPeriodTax[col] || 0) + (inputRaw[col] || 0) + (adjustment1pct[col] || 0) - (outputRaw[col] || 0);
    };

    const deductibleTax = {
        bk: calculateDeductible('bk'),
        bkct: calculateDeductible('bkct'),
        bklx: calculateDeductible('bklx'),
        kt: calculateDeductible('kt'),
        av: calculateDeductible('av')
    };

    // --- RENDERERS ---
    const SectionRows = ({ sectionData }) => {
        const totalRows = sectionData.items.reduce((acc, item) => acc + item.rows.length, 0);
        return (
            <>
                {sectionData.items.map((item, itemIndex) => (
                    <React.Fragment key={itemIndex}>
                        {/* First Row of Item */}
                        <tr>
                            {itemIndex === 0 && (
                                <>
                                    <td className="center bold highlight-bg" rowSpan={totalRows} style={{ verticalAlign: 'top', width: '30px' }}>{sectionData.stt}</td>
                                    <td className="center bold highlight-bg" rowSpan={totalRows} style={{ verticalAlign: 'top', width: '60px' }}>{sectionData.label}</td>
                                </>
                            )}
                            <td rowSpan={item.rows.length} className="cell-content">
                                {item.name}
                            </td>

                            <td className="center gray-bg">{item.rows[0].type}</td>
                            <td className="right">{fmt(item.rows[0].bk)}</td>
                            <td className="right">{fmt(item.rows[0].bkct)}</td>
                            <td className="right">{fmt(item.rows[0].bklx)}</td>
                            <td className="right">{fmt(item.rows[0].kt)}</td>
                            <td className="right">{fmt(item.rows[0].av)}</td>
                            <td className="right bold total-bg">{fmt(calcRowTotal(item.rows[0]))}</td>
                        </tr>

                        {/* Remaining rows of item */}
                        {item.rows.slice(1).map((row, idx) => (
                            <tr key={idx}>
                                <td className="center gray-bg">{row.type}</td>
                                <td className="right">{fmt(row.bk)}</td>
                                <td className="right">{fmt(row.bkct)}</td>
                                <td className="right">{fmt(row.bklx)}</td>
                                <td className="right">{fmt(row.kt)}</td>
                                <td className="right">{fmt(row.av)}</td>
                                <td className="right bold total-bg">{fmt(calcRowTotal(row))}</td>
                            </tr>
                        ))}
                    </React.Fragment>
                ))}

                {/* Section Total */}
                <tr className="row-section-total">
                    <td colSpan={4} className="center bold uppercase">{sectionData.totalTax.label}</td>
                    <td className="right bold">{fmt(sectionData.totalTax.bk)}</td>
                    <td className="right bold">{fmt(sectionData.totalTax.bkct)}</td>
                    <td className="right bold">{fmt(sectionData.totalTax.bklx)}</td>
                    <td className="right bold">{fmt(sectionData.totalTax.kt)}</td>
                    <td className="right bold">{fmt(sectionData.totalTax.av)}</td>
                    <td className="right bold total-bg">{fmt(calcObjTotal(sectionData.totalTax))}</td>
                </tr>
            </>
        );
    };

    return (
        <div className="new-print-layout only-print">
            <style>{`
                @media print {
                    @page { margin: 10mm 15mm; size: A4 landscape; }
                    
                    /* --- GLOBAL RESET FOR PRINT --- */
                    body, #root, #app, .App {
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        position: static !important;
                    }

                    .new-print-layout {
                        display: block !important;
                        font-family: "Roboto", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
                        color: #1a1a1a;
                        background: #fff;
                        width: 100%;
                        font-size: 10px;
                        padding-top: 20mm; /* INCREASED to prevent clipping */
                    }

                    /* --- TITLE SECTION --- */
                    .report-title-text {
                        font-size: 24px;
                        font-weight: 900;
                        text-transform: uppercase;
                        color: #000;
                        display: block;
                        text-align: center;
                        margin-bottom: 20px;
                        width: 100%;
                        position: relative;
                        z-index: 9999;
                    }

                    /* --- DATA TABLE STYLING --- */
                    .custom-print-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 10px;
                        margin-bottom: 10px;
                        border: 1px solid #444;
                        page-break-inside: auto;
                    }
                    
                    /* ALLOW BREAKING */
                    .custom-print-table tr {
                         page-break-inside: auto !important;
                         page-break-after: auto !important;
                    }
                    
                    .custom-print-table thead {
                        display: table-header-group; 
                    }

                    .custom-print-table th {
                        background-color: #f0f2f5 !important;
                        color: #111;
                        font-weight: 800;
                        text-transform: uppercase;
                        padding: 6px 4px;
                        border: 1px solid #444;
                        text-align: center;
                    }

                    .custom-print-table td {
                        border: 1px solid #999;
                        padding: 4px 4px;
                        vertical-align: middle;
                    }

                    /* --- UTILITY CLASSES --- */
                    .center { text-align: center; }
                    .right { text-align: right; }
                    .bold { font-weight: 700; }
                    .uppercase { text-transform: uppercase; }
                    
                    .highlight-bg { background-color: #fafafa !important; }
                    .gray-bg { background-color: #f5f5f5 !important; color: #333; }
                    .total-bg { background-color: #f0f0f0 !important; border-left: 2px solid #444 !important; font-weight: 800; }
                    .special-row td { background-color: #fffde7 !important; }
                    .row-section-total td { 
                        background-color: #e8f5e9 !important; 
                        border-top: 1px solid #000 !important;
                        border-bottom: 1px solid #000 !important;
                        color: #1b5e20;
                    }
                    
                    .cell-content { font-weight: 500; padding-left: 8px !important; }

                    /* --- SIGNATURE --- */
                    .signature-table {
                        width: 100%;
                        border: none;
                        margin-top: 30px;
                        page-break-inside: avoid;
                    }
                    .signature-table td {
                        border: none !important;
                        text-align: center;
                        vertical-align: top;
                        width: 25%;
                    }
                    .sig-title {
                        font-weight: bold;
                        font-size: 11px;
                        text-transform: uppercase;
                        margin-bottom: 60px;
                    }
                    .sig-date {
                        font-style: italic;
                        font-size: 11px;
                        margin-bottom: 5px;
                    }

                    /* --- SUMMARY PAGE --- */
                    .summary-page {
                        page-break-before: always;
                        padding-top: 40px;
                        text-align: center;
                    }
                    .summary-title {
                        font-size: 18px;
                        font-weight: 800;
                        text-transform: uppercase;
                        margin-bottom: 25px;
                        display: inline-block;
                        border-bottom: 2px solid #ccc;
                        padding-bottom: 10px;
                    }
                }
            `}</style>

            {/* TITLE DIV */}
            <div className="report-title-text">
                BÁO CÁO TÌNH HÌNH HÓA ĐƠN VAT {periodString}
            </div>

            {/* DATA TABLE */}
            <table className="custom-print-table">
                <thead>
                    <tr>
                        <th rowSpan="2" style={{ width: '40px' }}>STT</th>
                        <th rowSpan="2" style={{ width: '70px' }}>HÓA ĐƠN</th>
                        <th rowSpan="2">NỘI DUNG</th>
                        <th rowSpan="2" style={{ width: '60px' }}>CHI TIẾT</th>
                        <th>BÁCH KHOA</th>
                        <th>BÁCH KHOA<br />CHÂU THÀNH</th>
                        <th>BÁCH KHOA<br />LONG XUYÊN</th>
                        <th>KIẾN TẠO</th>
                        <th>AN VƯƠNG</th>
                        <th rowSpan="2" style={{ width: '90px', borderLeft: '2px solid #444' }}>TỔNG CỘNG</th>
                    </tr>
                    <tr>
                        <th>{monthStr}</th>
                        <th>{monthStr}</th>
                        <th>{quarterStr}</th>
                        <th>{quarterStr}</th>
                        <th>{quarterStr}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="highlight-bg">
                        <td colSpan="4" className="right bold uppercase" style={{ color: '#555' }}>Tiền thuế còn được khấu trừ kỳ trước</td>
                        <td className="right">{fmt(previousPeriodTax.bk)}</td>
                        <td className="right">{fmt(previousPeriodTax.bkct)}</td>
                        <td className="right">{fmt(previousPeriodTax.bklx)}</td>
                        <td className="right">{fmt(previousPeriodTax.kt)}</td>
                        <td className="right">{fmt(previousPeriodTax.av)}</td>
                        <td className="right bold total-bg">{fmt(calcObjTotal(previousPeriodTax))}</td>
                    </tr>

                    <SectionRows sectionData={displayData.output} />
                    <SectionRows sectionData={displayData.input} />

                    {/* DYNAMIC ROWS */}
                    {summaryRowsConfig.map((conf) => {
                        const currentRowData = summaryRows[conf.key] || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };
                        let rowContent;

                        if (conf.isCalculated && conf.key === 'total_debt_invoice') {
                            const rateObj = summaryRows['config_debt_rate'] || { value: 8 };
                            const rate = rateObj.value;
                            const pendingProjectRow = summaryRows['pending_project'] || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };
                            const calculateValue = (val) => (!val) ? 0 : (val / 1.08) * (rate / 100);
                            const debtRow = {
                                bk: calculateValue(pendingProjectRow.bk),
                                bkct: calculateValue(pendingProjectRow.bkct),
                                bklx: calculateValue(pendingProjectRow.bklx),
                                kt: calculateValue(pendingProjectRow.kt),
                                av: calculateValue(pendingProjectRow.av)
                            };

                            rowContent = (
                                <tr key={conf.key} className="special-row">
                                    <td colSpan="4" className="right bold uppercase">
                                        {conf.label} (Tỉ lệ: {rate}%)
                                    </td>
                                    <td className="right">{fmt(debtRow.bk)}</td>
                                    <td className="right">{fmt(debtRow.bkct)}</td>
                                    <td className="right">{fmt(debtRow.bklx)}</td>
                                    <td className="right">{fmt(debtRow.kt)}</td>
                                    <td className="right">{fmt(debtRow.av)}</td>
                                    <td className="right bold total-bg"></td>
                                </tr>
                            );
                        } else {
                            const rowTotal = calcObjTotal(currentRowData);
                            rowContent = (
                                <tr key={conf.key}>
                                    <td colSpan="4" className="right bold uppercase">{conf.label}</td>
                                    <td className="right">{fmt(currentRowData.bk)}</td>
                                    <td className="right">{fmt(currentRowData.bkct)}</td>
                                    <td className="right">{fmt(currentRowData.bklx)}</td>
                                    <td className="right">{fmt(currentRowData.kt)}</td>
                                    <td className="right">{fmt(currentRowData.av)}</td>
                                    <td className="right bold total-bg">{!conf.hideTotal ? fmt(rowTotal) : ''}</td>
                                </tr>
                            );
                        }

                        if (conf.key === 'payable_prev_quarter') {
                            return (
                                <React.Fragment key={conf.key}>
                                    {rowContent}
                                    <tr className="row-section-total">
                                        <td colSpan="4" className="right bold uppercase">TỔNG TIỀN THUẾ ĐẦU CÒN ĐƯỢC KHẤU TRỪ</td>
                                        <td className="right bold">{fmt(deductibleTax.bk)}</td>
                                        <td className="right bold">{fmt(deductibleTax.bkct)}</td>
                                        <td className="right bold">{fmt(deductibleTax.bklx)}</td>
                                        <td className="right bold">{fmt(deductibleTax.kt)}</td>
                                        <td className="right bold">{fmt(deductibleTax.av)}</td>
                                        <td className="right bold total-bg"></td>
                                    </tr>
                                </React.Fragment>
                            );
                        }
                        return rowContent;
                    })}
                </tbody>
            </table>

            {/* SIGNATURES AS TABLE */}
            <table className="signature-table">
                <tbody>
                    <tr>
                        <td>
                            <div className="sig-title">T. Giám đốc</div>
                        </td>
                        <td>
                            <div className="sig-title">TP Kế toán</div>
                        </td>
                        <td>
                            <div className="sig-title">Kiểm soát</div>
                        </td>
                        <td>
                            <div className="sig-date">Cần Thơ, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</div>
                            <div className="sig-title">Người lập</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* SUMMARY PAGE */}
            <div className="summary-page">
                <div className="summary-title">BẢNG TỔNG HỢP DOANH THU - THUẾ</div>
                <table className="custom-print-table" style={{ width: '85%', margin: '0 auto' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '25%' }}>THÁNG {month}</th>
                            <th style={{ width: '25%' }}>Doanh thu</th>
                            <th style={{ width: '25%' }}>Thuế</th>
                            <th style={{ width: '25%' }}>Sau thuế</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="bold">ĐẦU RA ĐÃ XUẤT</td>
                            <td className="right bold">{fmt((displayData.output.rawTotalTax.factoryOutput?.revenue || 0))}</td>
                            <td className="right bold">{fmt((displayData.output.rawTotalTax.factoryOutput?.tax || 0))}</td>
                            <td className="right bold">{fmt((displayData.output.rawTotalTax.factoryOutput?.payment || 0))}</td>
                        </tr>
                        <tr>
                            <td style={{ paddingLeft: '20px' }}>Đầu ra xuất VAT</td>
                            <td className="right">{fmt(displayData.output.rawTotalTax.factoryOutput?.revenue || 0)}</td>
                            <td className="right">{fmt(displayData.output.rawTotalTax.factoryOutput?.tax || 0)}</td>
                            <td className="right">{fmt(displayData.output.rawTotalTax.factoryOutput?.payment || 0)}</td>
                        </tr>
                        <tr>
                            <td style={{ paddingLeft: '20px' }}>Đầu ra bán cho công trình nội bộ</td>
                            <td className="right">-</td>
                            <td className="right">-</td>
                            <td className="right">-</td>
                        </tr>
                        <tr><td colSpan="4" style={{ height: '30px', border: 'none' }}></td></tr>

                        <tr>
                            <td className="bold">ĐẦU VÀO</td>
                            <td className="right bold">{fmt(displayData.input.rawTotalTax.factoryInput?.revenue || 0)}</td>
                            <td className="right bold">{fmt(displayData.input.rawTotalTax.factoryInput?.tax || 0)}</td>
                            <td className="right bold">{fmt(displayData.input.rawTotalTax.factoryInput?.payment || 0)}</td>
                        </tr>
                        <tr>
                            <td style={{ paddingLeft: '20px' }}>Đầu vào cung ứng</td>
                            <td className="right">{fmt(displayData.input.rawTotalTax.factoryInput?.revenue || 0)}</td>
                            <td className="right">{fmt(displayData.input.rawTotalTax.factoryInput?.tax || 0)}</td>
                            <td className="right">{fmt(displayData.input.rawTotalTax.factoryInput?.payment || 0)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VATReportPrintView;
