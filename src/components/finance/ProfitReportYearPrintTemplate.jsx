import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';

const ProfitReportYearPrintTemplate = React.forwardRef(({ rows, year, summaryTargets, summaryData }, ref) => {
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
        padding: '2px 4px',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '7pt',
        verticalAlign: 'middle'
    };

    const headerCellStyle = {
        ...commonCellStyle,
        fontWeight: 700,
        bgcolor: '#f5f5f5',
        textAlign: 'center',
        fontSize: '7pt'
    };

    const isGroupHeader = (name) => {
        if (!name) return false;
        const upperName = name.toUpperCase();
        return upperName.match(/^[IVX]+\./) ||
            upperName.match(/^[A-B]\./) ||
            upperName === 'IV. TỔNG' ||
            upperName.startsWith('=>');
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
                fontSize: '9pt',
                '@media print': {
                    p: 1,
                    '@page': {
                        size: 'A4 landscape',
                        margin: '6mm'
                    }
                }
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 0.5, fontSize: '10pt', fontFamily: 'inherit' }}>
                    CÔNG TY CỔ PHẦN XÂY DỰNG BÁCH KHOA
                </Typography>
                <Typography sx={{ fontSize: '8pt', fontFamily: 'inherit' }}>
                    Địa chỉ: Số 39 Trần Hưng Đạo, Phường Long Xuyên, An Giang
                </Typography>
            </Box>

            {/* Title */}
            <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Typography sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 0.5, fontSize: '12pt', fontFamily: 'inherit' }}>
                    BÁO CÁO LỢI NHUẬN NĂM {year}
                </Typography>
            </Box>

            {/* BẢNG 1: Tổng hợp chỉ tiêu */}
            {renderSummaryTable()}

            <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: '9pt', fontFamily: '"Times New Roman", Times, serif' }}>
                B. CHI TIẾT CÁC CÔNG TRÌNH - SẢN PHẨM
            </Typography>

            {/* Table */}
            <TableContainer sx={{ mb: 1 }}>
                <Table size="small" sx={{
                    tableLayout: 'auto',
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': commonCellStyle
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell rowSpan={2} sx={{ ...headerCellStyle, width: '3%' }}>STT</TableCell>
                            <TableCell rowSpan={2} sx={{ ...headerCellStyle, width: '20%' }}>CHỈ TIÊU</TableCell>
                            <TableCell colSpan={5} sx={{ ...headerCellStyle }}>DOANH THU</TableCell>
                            <TableCell colSpan={5} sx={{ ...headerCellStyle }}>CHI PHÍ</TableCell>
                            <TableCell colSpan={6} sx={{ ...headerCellStyle }}>LỢI NHUẬN</TableCell>
                            <TableCell rowSpan={2} sx={{ ...headerCellStyle, width: '5%' }}>% LN</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ ...headerCellStyle }}>CẢ NĂM</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q1</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q2</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q3</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q4</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>CẢ NĂM</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q1</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q2</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q3</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q4</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>CẢ NĂM</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q1</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q2</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q3</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Q4</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>LŨY KẾ</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows?.map((row, index) => {
                            const isHeader = isGroupHeader(row.name);
                            const cellBg = isHeader ? '#f0f0f0' : 'white';
                            const cellWeight = isHeader ? 700 : 400;
                            return (
                                <TableRow key={index}>
                                    <TableCell sx={{ textAlign: 'center', fontWeight: cellWeight, bgcolor: cellBg }}>
                                        {isHeader ? '' : index + 1}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: cellWeight, bgcolor: cellBg, fontSize: '7pt' }}>
                                        {row.name}
                                    </TableCell>
                                    {/* Doanh thu */}
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.revenue)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.revenueQ1)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.revenueQ2)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.revenueQ3)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.revenueQ4)}</TableCell>
                                    {/* Chi phí */}
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.cost)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.costQ1)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.costQ2)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.costQ3)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.costQ4)}</TableCell>
                                    {/* Lợi nhuận */}
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.profit)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.profitQ1)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.profitQ2)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.profitQ3)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.profitQ4)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>{formatNumber(row.costOverCumulative)}</TableCell>
                                    {/* % LN */}
                                    <TableCell sx={{ textAlign: 'right', fontWeight: cellWeight, bgcolor: cellBg }}>
                                        {row.percent != null ? formatPercent(row.percent) : ''}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Date */}
            <Box sx={{ textAlign: 'right', mb: 1, pr: 4 }}>
                <Typography sx={{ fontSize: '8pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
                    ……….., ngày …… tháng …… năm 20……
                </Typography>
            </Box>

            {/* Signatures - 4 người ký */}
            <Stack direction="row" sx={{ justifyContent: 'space-between', px: 2, textAlign: 'center' }}>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '8pt', fontFamily: 'inherit' }}>NGƯỜI LẬP BIỂU</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '7pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '50px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '8pt', fontFamily: 'inherit' }}>TP. KẾ TOÁN</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '7pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '50px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '8pt', fontFamily: 'inherit' }}>QL. TÀI CHÍNH</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '7pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '50px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '8pt', fontFamily: 'inherit' }}>TỔNG GIÁM ĐỐC</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '7pt', fontFamily: 'inherit' }}>(Ký, họ tên, đóng dấu)</Typography>
                    <Box sx={{ height: '50px' }}></Box>
                </Box>
            </Stack>
        </Box>
    );
});

export default ProfitReportYearPrintTemplate;
