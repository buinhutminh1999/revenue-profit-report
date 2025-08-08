import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';

// Dữ liệu giả lập dựa trên ảnh chụp màn hình của bạn
// Trong thực tế, bạn sẽ lấy dữ liệu này từ API (ví dụ: sử dụng React Query)
const reportData = [
    { id: 1, stt: 'I', noiDung: 'TỔNG TÀI SẢN CÒ (I.1 + I.2 + I.3 + I.4)', banKyTruoc: 549354573, phatSinhTrongKy: 1581121648, baoCao: 556666797622, isHeader: true },
    { id: 2, stt: 'I.1', noiDung: 'Tồn kho @ Nhà máy', banKyTruoc: 14758769919, phatSinhTrongKy: 568851955, baoCao: 15326781887, isSubHeader: true },
    { id: 3, stt: '1', noiDung: 'Sơn đang chờ máy', banKyTruoc: 2894542539, phatSinhTrongKy: 553821954, baoCao: 3487364546, isSubItem: true },
    { id: 4, stt: '2', noiDung: 'Nhựa + sơn máy', banKyTruoc: 4790605900, phatSinhTrongKy: 15000000, baoCao: 4805605900, isSubItem: true },
    { id: 5, stt: '3', noiDung: 'Đầu tư Tôn mạ kẽm cọc', banKyTruoc: 6999779717, phatSinhTrongKy: null, baoCao: 6999779717, isSubItem: true },
    { id: 6, stt: '4', noiDung: 'Tôn lắp ghép', banKyTruoc: 64157350, phatSinhTrongKy: null, baoCao: 64157350, isSubItem: true },
    { id: 7, stt: 'I.2', noiDung: 'Tài sản công ty', banKyTruoc: 245358484998, phatSinhTrongKy: 2445800655, baoCao: 247804905646, isSubHeader: true },
    { id: 8, stt: '1', noiDung: 'Tôn tồn chung ở xđ', banKyTruoc: 658780900, phatSinhTrongKy: null, baoCao: 658780900, isSubItem: true },
    { id: 9, stt: '2', noiDung: 'Thiết bị phụ phòng + giáo, chậu, tháp MX', banKyTruoc: 1736919481, phatSinhTrongKy: 65500000, baoCao: 1809419481, isSubItem: true },
    { id: 10, stt: '3', noiDung: 'Ống Posi Tôn', banKyTruoc: 405640000, phatSinhTrongKy: null, baoCao: 405640000, isSubItem: true },
    // Thêm các dòng dữ liệu còn lại ở đây...
];

// Hàm định dạng số theo kiểu tiền tệ
const formatCurrency = (value) => {
    if (value === null || typeof value === 'undefined') return '';
    return new Intl.NumberFormat('vi-VN').format(value);
};

const BrokerDebtReport = () => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
                Báo cáo Số dư Nợ Cò
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
                Dữ liệu tính đến ngày: 25/06/2025 (Theo: PHÓ. TRƯỞNG PHÒNG K. TOÁN, T. GIÁM ĐỐC)
            </Typography>

            <TableContainer component={Paper} elevation={3}>
                <Table stickyHeader sx={{ minWidth: 1200 }} aria-label="broker debt report table">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>STT</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>NỘI DUNG</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>BÁN KỲ TRƯỚC</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>PHÁT SINH TRONG KỲ</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>BÁO CÁO (đến 25/06/2025)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>THỰC TẾ LẤY @ KHO/NHẬN</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>ĐỀ XUẤT</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reportData.map((row) => (
                            <TableRow
                                key={row.id}
                                sx={{
                                    backgroundColor: row.isHeader ? 'action.hover' : 'inherit',
                                    '& > *': {
                                        fontWeight: row.isHeader || row.isSubHeader ? 'bold' : 'normal',
                                    },
                                }}
                            >
                                <TableCell component="th" scope="row">
                                    {row.stt}
                                </TableCell>
                                <TableCell sx={{ paddingLeft: row.isSubItem ? 4 : 2 }}>
                                    {row.noiDung}
                                </TableCell>
                                <TableCell align="right">{formatCurrency(row.banKyTruoc)}</TableCell>
                                <TableCell align="right">{formatCurrency(row.phatSinhTrongKy)}</TableCell>
                                <TableCell align="right" sx={{ backgroundColor: 'rgba(255, 235, 59, 0.1)' }}>{formatCurrency(row.baoCao)}</TableCell>
                                <TableCell align="right">{/* Dữ liệu cột này trống trong ảnh */}</TableCell>
                                <TableCell>{/* Dữ liệu cột này trống trong ảnh */}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default BrokerDebtReport;