import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';

const ProfitReportQuarterPrintTemplate = React.forwardRef(({ rows, year, quarter, summaryTargets, summaryData }, ref) => {
    const toNum = (v) => Number(v) || 0;

    const formatNumber = (value) => {
        if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) return '';
        if (typeof value === 'number' && value === 0) return '';
        return Math.round(value).toLocaleString('vi-VN');
    };

    const formatPercent = (value) => {
        if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) return '';
        return `${value.toFixed(2)}%`;
    };

    const commonCellStyle = {
        border: '1px solid black',
        padding: '3px 5px',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '8pt',
        verticalAlign: 'middle'
    };

    const headerCellStyle = {
        ...commonCellStyle,
        fontWeight: 700,
        bgcolor: '#f5f5f5',
        textAlign: 'center',
        fontSize: '8pt'
    };

    const isGroupHeader = (name) => {
        if (!name) return false;
        const upperName = name.toUpperCase();
        return upperName.match(/^[IVX]+\./) ||
            upperName === 'TỔNG' ||
            upperName.startsWith('=>')
            || upperName.includes('LỢI NHUẬN RÒNG');
    };

    const renderSummaryTable = () => {
        if (!summaryData) return null;

        const {
            revenueXayDung, profitXayDung, costOverXayDung,
            revenueSanXuat, profitSanXuat, costOverSanXuat,
            revenueDauTu, profitDauTu, costOverDauTu,
        } = summaryData;

        const {
            revenueTargetXayDung, profitTargetXayDung,
            revenueTargetSanXuat, profitTargetSanXuat,
            revenueTargetDauTu, profitTargetDauTu,
        } = summaryTargets || {};

        const tableData = [
            {
                id: 'I',
                name: 'XÂY DỰNG',
                revenue: { target: revenueTargetXayDung, actual: revenueXayDung },
                profit: { target: profitTargetXayDung, actual: profitXayDung, costOver: costOverXayDung },
            },
            {
                id: 'II',
                name: 'SẢN XUẤT',
                revenue: { target: revenueTargetSanXuat, actual: revenueSanXuat },
                profit: { target: profitTargetSanXuat, actual: profitSanXuat, costOver: costOverSanXuat },
            },
            {
                id: 'III',
                name: 'ĐẦU TƯ',
                revenue: { target: revenueTargetDauTu, actual: revenueDauTu },
                profit: { target: profitTargetDauTu, actual: profitDauTu, costOver: costOverDauTu },
            },
        ];

        return (
            <TableContainer sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: '9pt', fontFamily: '"Times New Roman", Times, serif' }}>
                    A. TỔNG HỢP CHỈ TIÊU
                </Typography>
                <Table size="small" sx={{
                    tableLayout: 'auto',
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': commonCellStyle
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...headerCellStyle, width: '20%' }}></TableCell>
                            <TableCell sx={headerCellStyle}>CHỈ TIÊU</TableCell>
                            <TableCell sx={headerCellStyle}>THỰC TẾ</TableCell>
                            <TableCell sx={headerCellStyle}>ĐÁNH GIÁ (+/-)</TableCell>
                            <TableCell sx={headerCellStyle}>ĐÁNH GIÁ (%)</TableCell>
                            <TableCell sx={headerCellStyle}>CHI PHÍ VƯỢT</TableCell>
                            <TableCell sx={headerCellStyle}>LN SAU ĐIỀU CHỈNH</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tableData.map((item) => {
                            const revenueEvaluation = toNum(item.revenue.actual) - toNum(item.revenue.target);
                            const revenuePercent = toNum(item.revenue.target) === 0 ? 0 : (toNum(item.revenue.actual) / toNum(item.revenue.target)) * 100;
                            const profitEvaluation = toNum(item.profit.actual) - toNum(item.profit.target);
                            const profitPercent = toNum(item.profit.target) === 0 ? 0 : (toNum(item.profit.actual) / toNum(item.profit.target)) * 100;
                            const adjustedProfit = toNum(item.profit.actual) + toNum(item.profit.costOver);

                            return (
                                <React.Fragment key={item.name}>
                                    <TableRow sx={{ bgcolor: '#f0f0f0' }}>
                                        <TableCell sx={{ ...commonCellStyle, fontWeight: 700, textAlign: 'left' }}>
                                            {item.id}. {item.name}
                                        </TableCell>
                                        <TableCell colSpan={6} sx={commonCellStyle}></TableCell>
                                    </TableRow>
                                    {/* Doanh thu */}
                                    <TableRow>
                                        <TableCell sx={{ ...commonCellStyle, fontStyle: 'italic', pl: 3, textAlign: 'left' }}>
                                            Doanh thu
                                        </TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'right' }}>{formatNumber(item.revenue.target)}</TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'right' }}>{formatNumber(item.revenue.actual)}</TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'right' }}>{formatNumber(revenueEvaluation)}</TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'right' }}>{formatPercent(revenuePercent)}</TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'center' }}>-</TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'center' }}>-</TableCell>
                                    </TableRow>
                                    {/* Lợi nhuận */}
                                    <TableRow>
                                        <TableCell sx={{ ...commonCellStyle, fontStyle: 'italic', pl: 3, textAlign: 'left' }}>
                                            Lợi nhuận
                                        </TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'right' }}>{formatNumber(item.profit.target)}</TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'right' }}>{formatNumber(item.profit.actual)}</TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'right' }}>{formatNumber(profitEvaluation)}</TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'right' }}>{formatPercent(profitPercent)}</TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'right' }}>{formatNumber(item.profit.costOver)}</TableCell>
                                        <TableCell sx={{ ...commonCellStyle, textAlign: 'right', fontWeight: 700 }}>
                                            {formatNumber(adjustedProfit)}
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    return (
        <Box
            ref={ref}
            sx={{
                p: 2,
                bgcolor: 'white',
                color: 'black',
                width: '100%',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '10pt',
                '@media print': {
                    p: 1,
                    '@page': {
                        size: 'A4 landscape',
                        margin: '8mm'
                    }
                }
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 0.5, fontSize: '11pt', fontFamily: 'inherit' }}>
                    CÔNG TY CỔ PHẦN XÂY DỰNG BÁCH KHOA
                </Typography>
                <Typography sx={{ fontSize: '9pt', fontFamily: 'inherit' }}>
                    Địa chỉ: Số 39 Trần Hưng Đạo, Phường Long Xuyên, An Giang
                </Typography>
            </Box>

            {/* Title */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 0.5, fontSize: '13pt', fontFamily: 'inherit' }}>
                    BÁO CÁO LỢI NHUẬN QUÝ {quarter} NĂM {year}
                </Typography>
            </Box>

            {/* BẢNG 1: Tổng hợp chỉ tiêu */}
            {renderSummaryTable()}

            {/* BẢNG 2: Chi tiết */}
            <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: '9pt', fontFamily: '"Times New Roman", Times, serif' }}>
                B. CHI TIẾT CÁC CÔNG TRÌNH
            </Typography>
            <TableContainer sx={{ mb: 2 }}>
                <Table size="small" sx={{
                    tableLayout: 'auto',
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': commonCellStyle
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...headerCellStyle, width: '32%' }}>KHOẢN MỤC / CÔNG TRÌNH</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '11%' }}>DOANH THU</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '11%' }}>CHI PHÍ</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '11%' }}>LỢI NHUẬN</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '8%' }}>% LN</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '10%' }}>CP VƯỢT {quarter}</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '9%' }}>CHỈ TIÊU</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '8%' }}>GHI CHÚ</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows?.map((row, index) => {
                            const isHeader = isGroupHeader(row.name);
                            return (
                                <TableRow key={index}>
                                    <TableCell sx={{ fontWeight: isHeader ? 700 : 400, bgcolor: isHeader ? '#f0f0f0' : 'white' }}>
                                        {row.name}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: isHeader ? 700 : 400, bgcolor: isHeader ? '#f0f0f0' : 'white' }}>
                                        {formatNumber(row.revenue)}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: isHeader ? 700 : 400, bgcolor: isHeader ? '#f0f0f0' : 'white' }}>
                                        {formatNumber(row.cost)}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: isHeader ? 700 : 400, bgcolor: isHeader ? '#f0f0f0' : 'white' }}>
                                        {formatNumber(row.profit)}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: isHeader ? 700 : 400, bgcolor: isHeader ? '#f0f0f0' : 'white' }}>
                                        {row.percent != null ? formatPercent(row.percent) : ''}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: isHeader ? 700 : 400, bgcolor: isHeader ? '#f0f0f0' : 'white' }}>
                                        {formatNumber(row.costOverQuarter)}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: isHeader ? 700 : 400, bgcolor: isHeader ? '#f0f0f0' : 'white' }}>
                                        {formatNumber(row.target)}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '7pt', bgcolor: isHeader ? '#f0f0f0' : 'white' }}>
                                        {row.note || row.suggest || ''}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Date */}
            <Box sx={{ textAlign: 'right', mb: 2, pr: 4 }}>
                <Typography sx={{ fontSize: '9pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
                    ……….., ngày …… tháng …… năm 20……
                </Typography>
            </Box>

            {/* Signatures - 4 người ký */}
            <Stack direction="row" sx={{ justifyContent: 'space-between', px: 2, textAlign: 'center' }}>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '9pt', fontFamily: 'inherit' }}>NGƯỜI LẬP BIỂU</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '8pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '60px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '9pt', fontFamily: 'inherit' }}>TP. KẾ TOÁN</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '8pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '60px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '9pt', fontFamily: 'inherit' }}>QL. TÀI CHÍNH</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '8pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '60px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '9pt', fontFamily: 'inherit' }}>TỔNG GIÁM ĐỐC</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '8pt', fontFamily: 'inherit' }}>(Ký, họ tên, đóng dấu)</Typography>
                    <Box sx={{ height: '60px' }}></Box>
                </Box>
            </Stack>
        </Box>
    );
});

export default ProfitReportQuarterPrintTemplate;
