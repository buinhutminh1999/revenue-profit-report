import React, { useState, useEffect } from 'react';
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
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
} from '@mui/material';

// Dữ liệu GỐC để giả lập API.
// Trong thực tế, bạn sẽ không cần cái này ở client.
const baseReportData = [
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
];

// Hàm định dạng số theo kiểu tiền tệ
const formatCurrency = (value) => {
    if (value === null || typeof value === 'undefined') return '';
    return new Intl.NumberFormat('vi-VN').format(value);
};

// Hàm tính quý hiện tại từ tháng
const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;

const BrokerDebtReport = () => {
    // State để lưu trữ lựa chọn của người dùng
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState(getCurrentQuarter());
    
    // State cho dữ liệu báo cáo và trạng thái tải
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Lựa chọn cho dropdowns
    const availableYears = [2025, 2024, 2023, 2022];
    const availableQuarters = [1, 2, 3, 4];

    // Sử dụng useEffect để tải dữ liệu khi năm hoặc quý thay đổi
    useEffect(() => {
        // Hàm giả lập việc gọi API để lấy dữ liệu
        const fetchReportData = () => {
            setLoading(true);
            console.log(`Đang tải dữ liệu cho Quý ${quarter} - Năm ${year}...`);

            // Giả lập độ trễ mạng
            setTimeout(() => {
                // Tạo dữ liệu giả ngẫu nhiên để thấy sự thay đổi
                const randomFactor = (quarter * 0.1) + ((year - 2023) * 0.2);
                const newData = baseReportData.map(item => ({
                    ...item,
                    phatSinhTrongKy: item.phatSinhTrongKy ? Math.round(item.phatSinhTrongKy * randomFactor) : null,
                    baoCao: item.baoCao ? Math.round(item.baoCao * randomFactor) : null,
                }));

                setReportData(newData);
                setLoading(false);
            }, 1000); // Giả lập 1 giây tải
        };

        fetchReportData();
    }, [year, quarter]); // Dependency: Chạy lại khi 'year' hoặc 'quarter' thay đổi

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        Báo cáo Số dư Nợ Cò
                    </Typography>
                     <Typography variant="subtitle1" color="text.secondary">
                        {`Dữ liệu cho Quý ${quarter} năm ${year}`}
                    </Typography>
                </Box>
                {/* BỘ LỌC CHỌN QUÝ/NĂM */}
                <Stack direction="row" spacing={2}>
                    <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel>Năm</InputLabel>
                        <Select value={year} label="Năm" onChange={(e) => setYear(e.target.value)}>
                            {availableYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel>Quý</InputLabel>
                        <Select value={quarter} label="Quý" onChange={(e) => setQuarter(e.target.value)}>
                            {availableQuarters.map(q => <MenuItem key={q} value={q}>{`Quý ${q}`}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Stack>
            </Stack>

            <Paper elevation={3} sx={{ position: 'relative', overflow: 'hidden' }}>
                {loading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%' }} />}
                <TableContainer>
                    <Table stickyHeader sx={{ minWidth: 1200 }} aria-label="broker debt report table">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>NỘI DUNG</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>SỐ DƯ ĐẦU KỲ</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>PHÁT SINH TRONG KỲ</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{`BÁO CÁO (Quý ${quarter}/${year})`}</TableCell>
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
                                    <TableCell component="th" scope="row">{row.stt}</TableCell>
                                    <TableCell sx={{ paddingLeft: row.isSubItem ? 4 : 2 }}>{row.noiDung}</TableCell>
                                    <TableCell align="right">{formatCurrency(row.banKyTruoc)}</TableCell>
                                    <TableCell align="right">{formatCurrency(row.phatSinhTrongKy)}</TableCell>
                                    <TableCell align="right" sx={{ backgroundColor: 'rgba(255, 235, 59, 0.1)' }}>{formatCurrency(row.baoCao)}</TableCell>
                                    <TableCell align="right">{/* Dữ liệu trống */}</TableCell>
                                    <TableCell>{/* Dữ liệu trống */}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default BrokerDebtReport;