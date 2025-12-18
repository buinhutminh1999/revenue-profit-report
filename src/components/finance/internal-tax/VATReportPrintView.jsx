
import React, { forwardRef } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { formatCurrencyOrDash } from '../../../utils/currencyHelpers';

const VATReportPrintView = forwardRef(({ month, year, data, summaryRows, previousPeriodTax }, ref) => {
    const monthStr = `T${month} ${year}`;
    const quarterStr = `QUÝ ${Math.ceil(parseInt(month) / 3)}`;
    const formatCurrency = formatCurrencyOrDash;

    // Calculate period string (26/previous month - 25/current month)
    const periodString = React.useMemo(() => {
        if (!month || !year) return "";
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);

        // Start date: 26 of previous month
        let startMonth = m - 1;
        let startYear = y;
        if (startMonth === 0) {
            startMonth = 12;
            startYear = y - 1;
        }

        const startStr = `26/${startMonth.toString().padStart(2, '0')}/${startYear}`;
        const endStr = `25/${m.toString().padStart(2, '0')}/${y}`;

        return `${startStr}-${endStr}`;
    }, [month, year]);

    // Helper to render section rows (Output/Input)
    const renderSectionRows = (sectionData) => {
        return sectionData.items.map((item, index) => (
            <React.Fragment key={index}>
                {item.rows.map((row, rowIndex) => {
                    const rowTotal = parseCurrency(row.bk) + parseCurrency(row.bkct) + parseCurrency(row.bklx) + parseCurrency(row.kt) + parseCurrency(row.av);
                    return (
                        <tr key={`${index}-${rowIndex}`}>
                            {rowIndex === 0 && (
                                <>
                                    {index === 0 && (
                                        <td rowSpan={sectionData.items.reduce((acc, curr) => acc + curr.rows.length, 0)} className="center-align" style={{ verticalAlign: 'top', backgroundColor: '#fafafa' }}>
                                            {sectionData.stt}
                                        </td>
                                    )}
                                    {index === 0 && (
                                        <td rowSpan={sectionData.items.reduce((acc, curr) => acc + curr.rows.length, 0)} className="center-align" style={{ verticalAlign: 'top', fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                                            {sectionData.label}
                                        </td>
                                    )}
                                    <td rowSpan={item.rows.length} style={{ verticalAlign: 'middle', fontWeight: 'bold', paddingLeft: '8px' }}>
                                        {item.name}
                                    </td>
                                </>
                            )}
                            <td>{row.type}</td>
                            <td className="right-align">{row.bk}</td>
                            <td className="right-align">{row.bkct}</td>
                            <td className="right-align">{row.bklx}</td>
                            <td className="right-align">{row.kt}</td>
                            <td className="right-align">{row.av}</td>
                            <td className="right-align" style={{ fontWeight: 'bold' }}>{formatCurrency(rowTotal)}</td>
                        </tr>
                    );
                })}
            </React.Fragment>
        ));
    };

    // Helper to parse currency back to number for total calc (since data in rows is formatted)
    const parseCurrency = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(val.replace(/\./g, '').replace(/,/g, '.')) || 0;
    };

    // Calculate Total Deductible Tax Row
    const renderCalculatedTotal = () => {
        const inputRaw = data.input.rawTotalTax || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };
        const outputRaw = data.output.rawTotalTax || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };
        const prevTax = previousPeriodTax || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };
        const adjustment = summaryRows['adjustment_1pct'] || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };

        const calcBk = prevTax.bk + inputRaw.bk + adjustment.bk - outputRaw.bk;
        const calcBkct = prevTax.bkct + inputRaw.bkct + adjustment.bkct - outputRaw.bkct;
        const calcBklx = prevTax.bklx + inputRaw.bklx + adjustment.bklx - outputRaw.bklx;
        const calcKt = prevTax.kt + inputRaw.kt + adjustment.kt - outputRaw.kt;
        const calcAv = prevTax.av + inputRaw.av + adjustment.av - outputRaw.av;
        const calcTotal = calcBk + calcBkct + calcBklx + calcKt + calcAv;

        return (
            <tr className="summary-row">
                <td colSpan={4} className="right-align bold" style={{ paddingLeft: '8px' }}>TỔNG TIỀN THUẾ ĐẦU CÒN ĐƯỢC KHẤU TRỪ</td>
                <td className="right-align bold">{formatCurrency(calcBk)}</td>
                <td className="right-align bold">{formatCurrency(calcBkct)}</td>
                <td className="right-align bold">{formatCurrency(calcBklx)}</td>
                <td className="right-align bold">{formatCurrency(calcKt)}</td>
                <td className="right-align bold">{formatCurrency(calcAv)}</td>
                <td className="right-align bold">{formatCurrency(calcTotal)}</td>
            </tr>
        );
    };

    // Calculated Debt Invoice Row
    const renderDebtInvoiceRow = (conf) => {
        const rateObj = summaryRows['config_debt_rate'] || { value: 8 };
        const rate = rateObj.value;
        const pendingProjectRow = summaryRows['pending_project'] || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };

        const calculateValue = (val) => {
            if (!val) return 0;
            return (val / 1.08) * (rate / 100);
        };

        const total = ['bk', 'bkct', 'bklx', 'kt', 'av'].reduce((acc, key) => acc + calculateValue(pendingProjectRow[key]), 0);

        return (
            <tr key={conf.key}>
                <td colSpan={4} className="right-align bold" style={{ paddingLeft: '8px' }}>
                    {conf.label} ({rate}%)
                </td>
                {['bk', 'bkct', 'bklx', 'kt', 'av'].map(company => (
                    <td key={company} className="right-align">
                        {formatCurrency(calculateValue(pendingProjectRow[company]))}
                    </td>
                ))}
                <td className="right-align bold">{formatCurrency(total)}</td>
            </tr>
        );
    };

    return (
        <div ref={ref} className="vat-print-view">
            <style type="text/css" media="print">
                {`
                    @page { 
                        size: landscape; 
                        margin: 12mm 10mm;
                    }
                    .vat-print-view { 
                        font-family: "Times New Roman", serif; 
                        color: #000; 
                        background: white; 
                        width: 100%; 
                        line-height: 1.4;
                    }
                    .vat-print-view table { 
                        border-collapse: collapse; 
                        width: 100%; 
                        margin-bottom: 15px; 
                        font-size: 10.5px;
                        page-break-inside: auto;
                    }
                    .vat-print-view thead { 
                        display: table-header-group;
                    }
                    .vat-print-view tbody { 
                        display: table-row-group;
                    }
                    .vat-print-view tr { 
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    .vat-print-view th, .vat-print-view td { 
                        border: 1px solid #333; 
                        padding: 6px 4px;
                        vertical-align: middle;
                    }
                    .vat-print-view th { 
                        background-color: #f5f5f5 !important; 
                        text-align: center; 
                        font-weight: bold; 
                        font-size: 10px;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .vat-print-view .center-align { text-align: center; }
                    .vat-print-view .right-align { text-align: right; padding-right: 8px; }
                    .vat-print-view .bold { font-weight: bold; }
                    .vat-print-view .header-title { 
                        text-align: center; 
                        font-size: 18px; 
                        font-weight: bold; 
                        margin-bottom: 20px; 
                        margin-top: 5px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        padding-bottom: 8px;
                        border-bottom: 2px solid #333;
                    }
                    .vat-print-view .section-total { 
                        background-color: #e0e0e0 !important; 
                        font-weight: bold;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .vat-print-view .summary-row {
                        background-color: #d0d0d0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .vat-print-view .section-total td {
                        font-size: 11px;
                    }
                    .vat-print-view tbody td {
                        word-wrap: break-word;
                    }
                    .vat-print-view .signature-section { 
                        margin-top: 40px; 
                        page-break-inside: avoid;
                        padding-top: 20px;
                    }
                    .vat-print-view .signature-date {
                        text-align: right;
                        margin-bottom: 15px;
                        font-style: italic;
                        font-size: 11px;
                    }
                    .vat-print-view .signature-grid { 
                        display: grid; 
                        grid-template-columns: repeat(4, 1fr); 
                        text-align: center; 
                        gap: 30px;
                        margin-top: 40px;
                    }
                    .vat-print-view .signature-title { 
                        font-weight: bold; 
                        margin-bottom: 80px;
                        font-size: 11px;
                        text-transform: uppercase;
                    }
                    .vat-print-view .summary-table-container {
                        margin-top: 50px;
                        page-break-before: always;
                    }
                    .vat-print-view .summary-table-title {
                        text-align: center;
                        font-size: 15px;
                        font-weight: bold;
                        margin-bottom: 18px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        padding-bottom: 6px;
                        border-bottom: 2px solid #333;
                    }
                    .vat-print-view .summary-table {
                        font-size: 11px;
                    }
                    .vat-print-view .summary-table th {
                        font-size: 11px;
                        padding: 8px 6px;
                    }
                    .vat-print-view .summary-table td {
                        padding: 7px 6px;
                    }
                `}
            </style>

            <div className="header-title">
                BÁO CÁO TÌNH HÌNH HÓA ĐƠN VAT {periodString}
            </div>

            <table>
                <thead>
                    <tr>
                        <th rowSpan={2}>STT</th>
                        <th rowSpan={2} style={{ width: '60px' }}>HÓA ĐƠN</th>
                        <th rowSpan={2} style={{ width: '200px' }}>NỘI DUNG</th>
                        <th rowSpan={2}>CHI TIẾT</th>
                        <th>BÁCH KHOA</th>
                        <th>BÁCH KHOA<br />CHÂU THÀNH</th>
                        <th>BÁCH KHOA<br />LONG XUYÊN</th>
                        <th>KIẾN TẠO</th>
                        <th>AN VƯƠNG</th>
                        <th>TỔNG CỘNG</th>
                    </tr>
                    <tr>
                        <th>{monthStr}</th>
                        <th>{monthStr}</th>
                        <th>{quarterStr}</th>
                        <th>{quarterStr}</th>
                        <th>{quarterStr}</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {/* Previous Period Tax */}
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <td colSpan={4} className="right-align bold" style={{ paddingLeft: '8px' }}>Tiền thuế còn được khấu trừ kỳ trước</td>
                        <td className="right-align">{formatCurrency(previousPeriodTax.bk)}</td>
                        <td className="right-align">{formatCurrency(previousPeriodTax.bkct)}</td>
                        <td className="right-align">{formatCurrency(previousPeriodTax.bklx)}</td>
                        <td className="right-align">{formatCurrency(previousPeriodTax.kt)}</td>
                        <td className="right-align">{formatCurrency(previousPeriodTax.av)}</td>
                        <td className="right-align bold">{formatCurrency(previousPeriodTax.bk + previousPeriodTax.bkct + previousPeriodTax.bklx + previousPeriodTax.kt + previousPeriodTax.av)}</td>
                    </tr>

                    {/* Output Section */}
                    {renderSectionRows(data.output)}

                    {/* Output Total */}
                    <tr className="section-total">
                        <td colSpan={4} className="center-align">TỔNG TIỀN THUẾ ĐẦU RA</td>
                        <td className="right-align">{data.output.totalTax.bk}</td>
                        <td className="right-align">{data.output.totalTax.bkct}</td>
                        <td className="right-align">{data.output.totalTax.bklx}</td>
                        <td className="right-align">{data.output.totalTax.kt}</td>
                        <td className="right-align">{data.output.totalTax.av}</td>
                        <td className="right-align">{formatCurrency(parseCurrency(data.output.totalTax.bk) + parseCurrency(data.output.totalTax.bkct) + parseCurrency(data.output.totalTax.bklx) + parseCurrency(data.output.totalTax.kt) + parseCurrency(data.output.totalTax.av))}</td>
                    </tr>

                    {/* Input Section */}
                    {renderSectionRows(data.input)}

                    {/* Input Total */}
                    <tr className="section-total">
                        <td colSpan={4} className="center-align">TỔNG TIỀN THUẾ ĐẦU VÀO</td>
                        <td className="right-align">{data.input.totalTax.bk}</td>
                        <td className="right-align">{data.input.totalTax.bkct}</td>
                        <td className="right-align">{data.input.totalTax.bklx}</td>
                        <td className="right-align">{data.input.totalTax.kt}</td>
                        <td className="right-align">{data.input.totalTax.av}</td>
                        <td className="right-align">{formatCurrency(parseCurrency(data.input.totalTax.bk) + parseCurrency(data.input.totalTax.bkct) + parseCurrency(data.input.totalTax.bklx) + parseCurrency(data.input.totalTax.kt) + parseCurrency(data.input.totalTax.av))}</td>
                    </tr>

                    {/* Summary Rows */}
                    {[
                        { key: 'pending_project', label: 'CÒN PHẢI XUẤT CHO CÔNG TRÌNH (LUỸ KẾ)', hideTotal: true },
                        { key: 'borrowed_blx', label: 'CÔNG TRÌNH MƯỢN BLX', hideTotal: true },
                        { key: 'pending_project_blx', label: 'CÒN PHẢI XUẤT CHO DỰ ÁN BLX (LUỸ KẾ)', hideTotal: true },
                        { key: 'adjustment_1pct', label: 'Điều chỉnh tăng/giảm thuế GTGT, Tạm nộp 1%', hideTotal: true },
                        { key: 'pending_project_branch', label: 'CÒN PHẢI XUẤT CHO CÔNG TRÌNH CHI NHÁNH (Luỹ kế)', hideTotal: true },
                        { key: 'excess_input_stock', label: 'ĐẦU VÀO DƯ CỦA CÔNG TRÌNH TRONG KHO (KHÔNG BAO GỒM CN, CPQL) (LUỸ KẾ)', hideTotal: true },
                        { key: 'excess_input_other', label: 'ĐẦU VÀO DƯ KHÁC chưa phân bổ- KHO', hideTotal: true },
                        { key: 'nmbtct_external', label: 'NMBTCT CÒN PHẢI XUẤT BÁN HÀNG BÊN NGOÀI T01', hideTotal: true },
                        { key: 'nmbtct_internal', label: 'NMBTCT CÒN PHẢI XUẤT BÁN HÀNG CÔNG TRÌNH NỘI BỘ T01 luỹ kế', hideTotal: true },
                        { key: 'payable_prev_quarter', label: 'Số phải nộp của Quý trước', hideTotal: true },
                        // Special entries handled below
                        { key: 'total_debt_invoice', label: 'TỔNG CỘNG CÁC CTY NỢ HOÁ ĐƠN', hideTotal: true, isCalculated: true },
                        { key: 'tax_percentage_bear', label: 'TIỀN % THUẾ CHỊU', hideTotal: true }
                    ].map(conf => {
                        if (conf.isCalculated && conf.key === 'total_debt_invoice') {
                            return renderDebtInvoiceRow(conf);
                        }

                        // Standard row
                        const rowData = summaryRows[conf.key] || { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };

                        const rowNode = (
                            <tr key={conf.key}>
                                <td colSpan={4} className="right-align bold" style={{ paddingLeft: '8px' }}>{conf.label}</td>
                                <td className="right-align">{formatCurrency(rowData.bk)}</td>
                                <td className="right-align">{formatCurrency(rowData.bkct)}</td>
                                <td className="right-align">{formatCurrency(rowData.bklx)}</td>
                                <td className="right-align">{formatCurrency(rowData.kt)}</td>
                                <td className="right-align">{formatCurrency(rowData.av)}</td>
                                <td className="right-align bold">
                                    {!conf.hideTotal && formatCurrency(rowData.bk + rowData.bkct + rowData.bklx + rowData.kt + rowData.av)}
                                </td>
                            </tr>
                        );

                        if (conf.key === 'payable_prev_quarter') {
                            return (
                                <React.Fragment key={conf.key}>
                                    {rowNode}
                                    {renderCalculatedTotal()}
                                </React.Fragment>
                            );
                        }
                        return rowNode;
                    })}
                </tbody>
            </table>

            {/* Signature Section */}
            <div className="signature-section">
                <div className="signature-date">
                    Long Xuyên, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </div>
                <div className="signature-grid">
                    <div>
                        <div className="signature-title">T. GIÁM ĐỐC</div>
                    </div>
                    <div>
                        <div className="signature-title">TP KẾ TOÁN</div>
                    </div>
                    <div>
                        <div className="signature-title">KIỂM SOÁT</div>
                    </div>
                    <div>
                        <div className="signature-title">NGƯỜI LẬP</div>
                    </div>
                </div>
            </div>

            {/* Summary Revenue-Tax Table */}
            <div className="summary-table-container">
                <div className="summary-table-title">
                    BẢNG TỔNG HỢP DOANH THU - THUẾ
                </div>
                <table className="summary-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>THÁNG {month}</th>
                            <th style={{ width: '23%', textAlign: 'right' }}>Doanh thu</th>
                            <th style={{ width: '23%', textAlign: 'right' }}>Thuế</th>
                            <th style={{ width: '24%', textAlign: 'right' }}>Sau thuế</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* OUTPUT SECTION */}
                        <tr>
                            <td style={{ fontWeight: 'bold', paddingLeft: '8px' }}>ĐẦU RA ĐÃ XUẤT</td>
                            <td className="right-align" style={{ fontWeight: 'bold' }}>
                                {formatCurrency(data.output.rawTotalTax?.factoryOutput?.revenue || 0)}
                            </td>
                            <td className="right-align" style={{ fontWeight: 'bold' }}>
                                {formatCurrency(data.output.rawTotalTax?.factoryOutput?.tax || 0)}
                            </td>
                            <td className="right-align" style={{ fontWeight: 'bold' }}>
                                {formatCurrency(data.output.rawTotalTax?.factoryOutput?.payment || 0)}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ paddingLeft: '28px' }}>Đầu ra xuất VAT</td>
                            <td className="right-align">
                                {formatCurrency(data.output.rawTotalTax?.factoryOutput?.revenue || 0)}
                            </td>
                            <td className="right-align">
                                {formatCurrency(data.output.rawTotalTax?.factoryOutput?.tax || 0)}
                            </td>
                            <td className="right-align">
                                {formatCurrency(data.output.rawTotalTax?.factoryOutput?.payment || 0)}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ paddingLeft: '28px' }}>Đầu ra bán cho công trình nội bộ</td>
                            <td className="right-align">-</td>
                            <td className="right-align">-</td>
                            <td className="right-align">-</td>
                        </tr>
                        <tr>
                            <td colSpan={4} style={{ height: '15px', border: 'none', background: 'transparent' }}></td>
                        </tr>

                        {/* INPUT SECTION */}
                        <tr>
                            <td style={{ fontWeight: 'bold', paddingLeft: '8px' }}>ĐẦU VÀO</td>
                            <td className="right-align" style={{ fontWeight: 'bold' }}>
                                {formatCurrency(data.input.rawTotalTax?.factoryInput?.revenue || 0)}
                            </td>
                            <td className="right-align" style={{ fontWeight: 'bold' }}>
                                {formatCurrency(data.input.rawTotalTax?.factoryInput?.tax || 0)}
                            </td>
                            <td className="right-align" style={{ fontWeight: 'bold' }}>
                                {formatCurrency(data.input.rawTotalTax?.factoryInput?.payment || 0)}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ paddingLeft: '28px' }}>ĐẦU VÀO CUNG ỨNG</td>
                            <td className="right-align">
                                {formatCurrency(data.input.rawTotalTax?.factoryInput?.revenue || 0)}
                            </td>
                            <td className="right-align">
                                {formatCurrency(data.input.rawTotalTax?.factoryInput?.tax || 0)}
                            </td>
                            <td className="right-align">
                                {formatCurrency(data.input.rawTotalTax?.factoryInput?.payment || 0)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default VATReportPrintView;
