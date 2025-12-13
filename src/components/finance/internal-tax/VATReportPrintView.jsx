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
    // Helper to format currency
    const fmt = (val) => {
        if (val === 0 || val === '0' || val === '-') return '-';
        if (val === undefined || val === null) return '-';
        if (typeof val === 'number') return formatCurrencyOrDash(val);
        if (val === '0') return '-';
        return val;
    };

    // Helper to calculate row total
    const calcRowTotal = (row) => {
        return parseCurrency(row.bk) + parseCurrency(row.bkct) + parseCurrency(row.bklx) + parseCurrency(row.kt) + parseCurrency(row.av);
    };

    // Helper to calculate total from object
    const calcObjTotal = (obj) => {
        return parseCurrency(obj?.bk) + parseCurrency(obj?.bkct) + parseCurrency(obj?.bklx) + parseCurrency(obj?.kt) + parseCurrency(obj?.av);
    };

    const monthStr = month && year ? `T${month} ${year}` : "T-- ----";
    const quarterStr = month ? `QUÝ ${Math.ceil(parseInt(month) / 3)}` : "QUÝ -";

    // Prepare Calculated Deductible Tax Data
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

    const renderSectionRows = (sectionData) => {
        const totalRows = sectionData.items.reduce((acc, item) => acc + item.rows.length, 0);

        return (
            <>
                {sectionData.items.map((item, itemIndex) => (
                    <React.Fragment key={itemIndex}>
                        {/* First Row of Item */}
                        <tr>
                            {itemIndex === 0 && (
                                <>
                                    <td className="center bold" rowSpan={totalRows} style={{ verticalAlign: 'top' }}>{sectionData.stt}</td>
                                    <td className="center bold" rowSpan={totalRows} style={{ verticalAlign: 'top' }}>{sectionData.label}</td>
                                </>
                            )}
                            <td rowSpan={item.rows.length} style={{ maxWidth: '200px', verticalAlign: 'middle' }}>{item.name}</td>

                            <td>{item.rows[0].type}</td>
                            <td className="right">{fmt(item.rows[0].bk)}</td>
                            <td className="right">{fmt(item.rows[0].bkct)}</td>
                            <td className="right">{fmt(item.rows[0].bklx)}</td>
                            <td className="right">{fmt(item.rows[0].kt)}</td>
                            <td className="right">{fmt(item.rows[0].av)}</td>
                            <td className="right bold">{fmt(calcRowTotal(item.rows[0]))}</td>
                        </tr>

                        {/* Remaining rows of item */}
                        {item.rows.slice(1).map((row, idx) => (
                            <tr key={idx}>
                                <td>{row.type}</td>
                                <td className="right">{fmt(row.bk)}</td>
                                <td className="right">{fmt(row.bkct)}</td>
                                <td className="right">{fmt(row.bklx)}</td>
                                <td className="right">{fmt(row.kt)}</td>
                                <td className="right">{fmt(row.av)}</td>
                                <td className="right bold">{fmt(calcRowTotal(row))}</td>
                            </tr>
                        ))}
                    </React.Fragment>
                ))}

                {/* Section Total */}
                <tr className="section-total">
                    <td colSpan={4} className="center bold">{sectionData.totalTax.label}</td>
                    <td className="right bold">{fmt(sectionData.totalTax.bk)}</td>
                    <td className="right bold">{fmt(sectionData.totalTax.bkct)}</td>
                    <td className="right bold">{fmt(sectionData.totalTax.bklx)}</td>
                    <td className="right bold">{fmt(sectionData.totalTax.kt)}</td>
                    <td className="right bold">{fmt(sectionData.totalTax.av)}</td>
                    <td className="right bold">{fmt(calcObjTotal(sectionData.totalTax))}</td>
                </tr>
            </>
        );
    };

    return (
        <div className="vat-report-print-view only-print">

            {/* SINGLE TABLE STRUCTURE - No Repeating Headers */}
            <table className="print-table">
                <tbody>
                    {/* 1. REPORT TITLE ROW */}
                    <tr style={{ border: 'none' }}>
                        <th colSpan="10" style={{ border: 'none', fontSize: '18px', padding: '15px 0', textTransform: 'uppercase', textAlign: 'center', background: 'white', color: 'black' }}>
                            BÁO CÁO TÌNH HÌNH HÓA ĐƠN VAT {periodString}
                        </th>
                    </tr>

                    {/* 2. HEADER ROWS (Moved to body so they don't repeat/float) */}
                    <tr>
                        <th rowSpan="2" style={{ width: '40px' }}>STT</th>
                        <th rowSpan="2" style={{ width: '80px' }}>HÓA ĐƠN</th>
                        <th rowSpan="2" style={{ width: '200px' }}>NỘI DUNG</th>
                        <th rowSpan="2">CHI TIẾT</th>
                        <th>BÁCH KHOA</th>
                        <th>BÁCH KHOA<br />CHÂU THÀNH</th>
                        <th>BÁCH KHOA<br />LONG XUYÊN</th>
                        <th>KIẾN TẠO</th>
                        <th>AN VƯƠNG</th>
                        <th style={{ width: '80px' }} rowSpan="2">TỔNG CỘNG</th>
                    </tr>
                    <tr>
                        <th>{monthStr}</th>
                        <th>{monthStr}</th>
                        <th>{quarterStr}</th>
                        <th>{quarterStr}</th>
                        <th>{quarterStr}</th>
                    </tr>

                    {/* 3. DATA START */}
                    {/* PREVIOUS PERIOD TAX */}
                    <tr>
                        <td colSpan="4" className="right bold">Tiền thuế còn được khấu trừ kỳ trước</td>
                        <td className="right">{fmt(previousPeriodTax.bk)}</td>
                        <td className="right">{fmt(previousPeriodTax.bkct)}</td>
                        <td className="right">{fmt(previousPeriodTax.bklx)}</td>
                        <td className="right">{fmt(previousPeriodTax.kt)}</td>
                        <td className="right">{fmt(previousPeriodTax.av)}</td>
                        <td className="right bold">{fmt(calcObjTotal(previousPeriodTax))}</td>
                    </tr>

                    {/* OUTPUT SECTION */}
                    {renderSectionRows(displayData.output)}

                    {/* INPUT SECTION */}
                    {renderSectionRows(displayData.input)}

                    {/* DYNAMIC SUMMARY ROWS */}
                    {summaryRowsConfig.map((conf) => {
                        const currentRowData = summaryRows[conf.key] || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };

                        // Render standard or calculated rows
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
                                <tr key={conf.key}>
                                    <td colSpan="4" className="right bold">
                                        {conf.label} (Tỉ lệ: {rate}%)
                                    </td>
                                    <td className="right">{fmt(debtRow.bk)}</td>
                                    <td className="right">{fmt(debtRow.bkct)}</td>
                                    <td className="right">{fmt(debtRow.bklx)}</td>
                                    <td className="right">{fmt(debtRow.kt)}</td>
                                    <td className="right">{fmt(debtRow.av)}</td>
                                    <td className="right bold"></td>
                                </tr>
                            );
                        } else {
                            const rowTotal = calcObjTotal(currentRowData);
                            rowContent = (
                                <tr key={conf.key}>
                                    <td colSpan="4" className="right bold">{conf.label}</td>
                                    <td className="right">{fmt(currentRowData.bk)}</td>
                                    <td className="right">{fmt(currentRowData.bkct)}</td>
                                    <td className="right">{fmt(currentRowData.bklx)}</td>
                                    <td className="right">{fmt(currentRowData.kt)}</td>
                                    <td className="right">{fmt(currentRowData.av)}</td>
                                    <td className="right bold">{!conf.hideTotal ? fmt(rowTotal) : ''}</td>
                                </tr>
                            );
                        }

                        // Determine if we need to render the Deductible Tax Total row
                        if (conf.key === 'payable_prev_quarter') {
                            return (
                                <React.Fragment key={conf.key}>
                                    {rowContent}
                                    <tr style={{ backgroundColor: '#f0fdf4' }}>
                                        <td colSpan="4" className="right bold" style={{ fontWeight: 700 }}>TỔNG TIỀN THUẾ ĐẦU CÒN ĐƯỢC KHẤU TRỪ</td>
                                        <td className="right bold">{fmt(deductibleTax.bk)}</td>
                                        <td className="right bold">{fmt(deductibleTax.bkct)}</td>
                                        <td className="right bold">{fmt(deductibleTax.bklx)}</td>
                                        <td className="right bold">{fmt(deductibleTax.kt)}</td>
                                        <td className="right bold">{fmt(deductibleTax.av)}</td>
                                        <td className="right bold"></td>
                                    </tr>
                                </React.Fragment>
                            );
                        }

                        return rowContent;
                    })}

                </tbody>
            </table>

            {/* SIGNATURE SECTION */}
            <div className="signature-section" style={{ marginTop: '20px', pageBreakInside: 'avoid' }}>
                <table className="signature-table" style={{ border: 'none', width: '100%' }}>
                    <tbody>
                        <tr style={{ border: 'none' }}>
                            <td colSpan="3" style={{ border: 'none' }}></td>
                            <td style={{ border: 'none', textAlign: 'center', fontStyle: 'italic' }}>
                                Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                            </td>
                        </tr>
                        <tr style={{ border: 'none' }}>
                            <td style={{ border: 'none', textAlign: 'center', fontWeight: 'bold', width: '25%' }}>T. Giám đốc</td>
                            <td style={{ border: 'none', textAlign: 'center', fontWeight: 'bold', width: '25%' }}>TP Kế toán</td>
                            <td style={{ border: 'none', textAlign: 'center', fontWeight: 'bold', width: '25%' }}>Kiểm soát</td>
                            <td style={{ border: 'none', textAlign: 'center', fontWeight: 'bold', width: '25%' }}>Người lập</td>
                        </tr>
                        <tr style={{ border: 'none', height: '100px' }}>
                            <td style={{ border: 'none' }}></td>
                            <td style={{ border: 'none' }}></td>
                            <td style={{ border: 'none' }}></td>
                            <td style={{ border: 'none' }}></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* MONTHLY SUMMARY TABLE */}
            <div style={{ pageBreakBefore: 'always', marginTop: '30px' }}>
                <h3 className="center bold" style={{ fontSize: '14px', marginBottom: '10px' }}>BẢNG TỔNG HỢP DOANH THU - THUẾ</h3>
                <table className="print-table summary-table" style={{ width: '60%', margin: '0 auto' }}>
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
                        <tr>
                            <td colSpan="4" style={{ height: '10px', border: 'none', borderBottom: '1px solid #ccc' }}></td>
                        </tr>
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
