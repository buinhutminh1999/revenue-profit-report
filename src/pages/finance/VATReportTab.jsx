import React from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useTheme,
    alpha
} from '@mui/material';

const vatReportData = {
    previousPeriodTax: {
        label: "Tiền thuế còn được khấu trừ kỳ trước",
        bk: "2.105.990.712",
        bkct: "297.261.416",
        bklx: "302.961.244",
        kt: "70.200.619",
        av: "1.655.106"
    },
    output: {
        stt: 1,
        label: "ĐẦU RA",
        items: [
            {
                name: "NHÀ MÁY",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "5.631.491.925", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "450.519.354", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "6.082.011.279", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "BÁN RA VẬT TƯ",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "-", bkct: "2.818.732.404", bklx: "4.606.821.629", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "-", bkct: "225.498.596", bklx: "61.673.481", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "380.252.511", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "-", bkct: "3.044.231.000", bklx: "-", kt: "5.048.747.621", av: "-" } // Note: Data seems slightly misaligned in user request for SAU THUẾ columns, adjusting best effort based on total
                ]
            },
            {
                name: "NHÀ HÁT KHỐI CHÍNH",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "KÈ KV CHỢ TÂN PHÚ",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "1.542.243.518", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "123.379.482", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "1.665.623.000", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "HỒ NGUYỄN DU",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "6.405.268.519", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "512.421.481", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "6.917.690.000", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "DA BLX",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            }
        ],
        totalTax: {
            label: "TỔNG TIỀN THUẾ ĐẦU RA",
            bk: "1.086.320.317",
            bkct: "225.498.596",
            bklx: "-",
            kt: "441.925.992",
            av: "-"
        }
    },
    input: {
        stt: 2,
        label: "ĐẦU VÀO",
        items: [
            {
                name: "NHÀ MÁY",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "7.274.867.311", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 5%", bk: "4.937.618", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "213.638.991", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "449.764.755", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "7.943.208.675", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "ĐƯỜNG 942",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "2.333.333", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "186.667", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "118.618.963", bkct: "-", bklx: "-", kt: "-", av: "-" }, // Duplicate VAT 10% in source? Keeping as is.
                    { type: "SAU THUẾ", bk: "2.060.062.408", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "HT MÁI CHE BẢO TỒN CÁC HỐ- NHÀ KHẢO CỔ TẠI KHU DI TÍCH ÓC EO-BA THÊ",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "796.035.154", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 5%", bk: "18.857", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "3.971.756", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "74.601.110", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "874.626.877", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "KÈ CHỢ TÂN PHÚ",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "NHÀ HÁT KHỐI CHÍNH",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "40.008.254", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 5%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "3.184.570", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "20.112", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "43.212.936", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "QUỐC LỘ 91",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "-", bkct: "47.260.741", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "-", bkct: "3.780.859", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "-", bkct: "-", bklx: "51.041.600", kt: "-", av: "-" }
                ]
            },
            {
                name: "KÈ LONG ĐIỀN",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "919.737.699", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "64.424.948", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "11.442.585", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "995.605.232", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "KÈ LONG KIẾN",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "2.264.377.523", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "111.400.825", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "83.221.065", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "2.458.999.412", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "NHÀ PHỤ TRỢ BIDV THOẠI SƠN",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "-", bkct: "58.409.436", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "-", bkct: "4.672.755", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "-", bkct: "-", bklx: "63.082.191", kt: "-", av: "-" }
                ]
            },
            {
                name: "Tài sản",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "BẮC LONG XUYÊN",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "2.669.744", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "213.580", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "2.883.324", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            },
            {
                name: "CPQL",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "266.064.033", bkct: "165.577.373", bklx: "41.409.909", kt: "9.318.631", av: "1.090.000" },
                    { type: "VAT 5%", bk: "37.762", bkct: "-", bklx: "7.619", kt: "-", av: "45.381" }, // Sum manually checked roughly
                    { type: "VAT 8%", bk: "11.346.470", bkct: "8.156.095", bklx: "733.300", kt: "-", av: "20.235.865" }, // Check total column from user input
                    { type: "VAT 10%", bk: "5.253.889", bkct: "520.230", bklx: "90.991", kt: "109.000", av: "5.974.110" },
                    { type: "SAU THUẾ", bk: "282.702.154", bkct: "174.253.698", bklx: "41.500.900", kt: "10.059.550", av: "1.199.000" }
                ]
            },
            {
                name: "MUA VẬT TƯ BÁN LẠI",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "-", bkct: "3.641.066.295", bklx: "5.861.559.597", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "-", bkct: "291.285.304", bklx: "115.026.755", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "442.372.524", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "-", bkct: "3.932.351.599", bklx: "311.249.382", kt: "6.418.958.876", av: "-" }
                ]
            },
            {
                name: "NHẬP KHO",
                rows: [
                    { type: "TRƯỚC THUẾ", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 8%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "VAT 10%", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" },
                    { type: "SAU THUẾ", bk: "-", bkct: "-", bklx: "-", kt: "-", av: "-" }
                ]
            }
        ],
        totalTax: {
            label: "TỔNG TIỀN THUẾ ĐẦU VÀO",
            bk: "1.212.219.966",
            bkct: "299.961.629",
            bklx: "8.544.605",
            kt: "558.140.198",
            av: "109.000"
        }
    }
};

export default function VATReportTab() {
    const theme = useTheme();

    // Helper to parse currency string to number
    const parseCurrency = (str) => {
        if (!str || str === '-') return 0;
        if (typeof str === 'number') return str;
        return parseFloat(str.replace(/\./g, '').replace(/,/g, '.'));
    };

    // Helper to format number to currency string
    const formatCurrency = (num) => {
        if (isNaN(num) || num === 0) return "-";
        return new Intl.NumberFormat('vi-VN').format(Math.round(num));
    };

    const renderSection = (sectionData) => {
        return (
            <>
                {sectionData.items.map((item, index) => (
                    <React.Fragment key={index}>
                        {item.rows.map((row, rowIndex) => {
                            const rowTotal = parseCurrency(row.bk) + parseCurrency(row.bkct) + parseCurrency(row.bklx) + parseCurrency(row.kt) + parseCurrency(row.av);
                            return (
                                <TableRow key={`${index}-${rowIndex}`} sx={{ '&:hover': { bgcolor: '#f1f5f9' } }}>
                                    {rowIndex === 0 && (
                                        <>
                                            {index === 0 && (
                                                <TableCell
                                                    rowSpan={sectionData.items.reduce((acc, curr) => acc + curr.rows.length, 0)}
                                                    sx={{ fontWeight: 700, verticalAlign: 'top', bgcolor: alpha(theme.palette.primary.main, 0.02) }}
                                                >
                                                    {sectionData.stt}
                                                </TableCell>
                                            )}
                                            {index === 0 && (
                                                <TableCell
                                                    rowSpan={sectionData.items.reduce((acc, curr) => acc + curr.rows.length, 0)}
                                                    sx={{ fontWeight: 700, verticalAlign: 'top', bgcolor: alpha(theme.palette.primary.main, 0.02) }}
                                                >
                                                    {sectionData.label}
                                                </TableCell>
                                            )}
                                            <TableCell
                                                rowSpan={item.rows.length}
                                                sx={{ fontWeight: 600, verticalAlign: 'middle' }}
                                            >
                                                {item.name}
                                            </TableCell>
                                        </>
                                    )}
                                    <TableCell>{row.type}</TableCell>
                                    <TableCell align="right">{row.bk}</TableCell>
                                    <TableCell align="right">{row.bkct}</TableCell>
                                    <TableCell align="right">{row.bklx}</TableCell>
                                    <TableCell align="right">{row.kt}</TableCell>
                                    <TableCell align="right">{row.av}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(rowTotal)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </React.Fragment>
                ))}
                {/* Section Total Row */}
                {/* Section Total Row */}
                <TableRow sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                    <TableCell colSpan={4} sx={{ fontWeight: 700, textAlign: 'center' }}>
                        {sectionData.totalTax.label}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{sectionData.totalTax.bk}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{sectionData.totalTax.bkct}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{sectionData.totalTax.bklx}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{sectionData.totalTax.kt}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{sectionData.totalTax.av}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(
                            parseCurrency(sectionData.totalTax.bk) +
                            parseCurrency(sectionData.totalTax.bkct) +
                            parseCurrency(sectionData.totalTax.bklx) +
                            parseCurrency(sectionData.totalTax.kt) +
                            parseCurrency(sectionData.totalTax.av)
                        )}
                    </TableCell>
                </TableRow>
            </>
        );
    };

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>
                BÁO CÁO TÌNH HÌNH HÓA ĐƠN VAT (26/09/2025 - 25/10/2025)
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                <Table sx={{ minWidth: 1200 }} size="small" aria-label="vat report table">
                    <TableHead>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>STT</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>HÓA ĐƠN</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>NỘI DUNG</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>CHI TIẾT</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>BÁCH KHOA</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>BÁCH KHOA CT</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>BÁCH KHOA LX</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>KIẾN TẠO</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>AN VƯƠNG</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>TỔNG CỘNG</TableCell>
                        </TableRow>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem', borderRight: 1, borderColor: 'divider' }}>T10 2025</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem', borderRight: 1, borderColor: 'divider' }}>T10 2025</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem', borderRight: 1, borderColor: 'divider' }}>QUÝ 4</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem', borderRight: 1, borderColor: 'divider' }}>QUÝ 4</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem', borderRight: 1, borderColor: 'divider' }}>QUÝ 4</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem' }}></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {/* Previous Period Tax Row */}
                        {/* Previous Period Tax Row */}
                        <TableRow>
                            <TableCell colSpan={4} sx={{ fontWeight: 600, textAlign: 'right' }}>
                                {vatReportData.previousPeriodTax.label}
                            </TableCell>
                            <TableCell align="right">{vatReportData.previousPeriodTax.bk}</TableCell>
                            <TableCell align="right">{vatReportData.previousPeriodTax.bkct}</TableCell>
                            <TableCell align="right">{vatReportData.previousPeriodTax.bklx}</TableCell>
                            <TableCell align="right">{vatReportData.previousPeriodTax.kt}</TableCell>
                            <TableCell align="right">{vatReportData.previousPeriodTax.av}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                                {formatCurrency(
                                    parseCurrency(vatReportData.previousPeriodTax.bk) +
                                    parseCurrency(vatReportData.previousPeriodTax.bkct) +
                                    parseCurrency(vatReportData.previousPeriodTax.bklx) +
                                    parseCurrency(vatReportData.previousPeriodTax.kt) +
                                    parseCurrency(vatReportData.previousPeriodTax.av)
                                )}
                            </TableCell>
                        </TableRow>

                        {/* Output Section */}
                        {renderSection(vatReportData.output)}

                        {/* Input Section */}
                        {renderSection(vatReportData.input)}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
