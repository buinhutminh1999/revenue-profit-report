import React, { useState } from 'react';
import {
    Box, Card, CardContent, CardHeader, Divider, FormControl, Grid, InputLabel, MenuItem,
    Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Paper
} from '@mui/material';

// Dữ liệu mẫu dựa trên hình ảnh
const reportData = {
    production: [
        { id: 1, stt: '1', item: 'Hàng tồn kho NVL', plan: 6000000000, actual: 6747018728, notes: 'Vốn để nhà máy mua NVL', plan2025: 6000000000 },
        { id: 2, stt: '2', item: 'Tồn kho thành phẩm', plan: 8000000000, actual: 9683147750, notes: '', plan2025: 8000000000 },
        { id: 3, stt: '3', item: 'Nợ phải thu khách hàng', plan: 7000000000, actual: 3033245540, notes: 'TGĐ kế toán quyết định', plan2025: 7000000000 },
        { id: 4, stt: '4', item: 'Nợ phải trả nhà cung cấp', plan: -1500000000, actual: -1935482387, notes: 'TGĐ, Kế toán cung ứng quyết định', plan2025: -1500000000 },
        { id: 5, stt: '5', item: 'Khách hàng ứng trước tiền hàng', plan: -1500000000, actual: -1828054990, notes: '', plan2025: -1500000000 },
    ],
    construction: [
        { id: 6, stt: 'a', group: 'Vốn dự kiến sử dụng', item: 'Vốn đầu tư cty', plan: 35000000000, actual: 27794367500, notes: '', plan2025: 35000000000 },
        { id: 7, stt: '', group: 'Vốn dự kiến sử dụng', item: 'Khởi công xây dựng', plan: 2100000000, actual: 14885181010, notes: '', plan2025: 2100000000 },
        { id: 8, stt: '', group: 'Vốn dự kiến sử dụng', item: 'Khối lượng đang dở', plan: 10000000000, actual: 12293159005, notes: '', plan2025: 10000000000 },
        { id: 9, stt: '', group: 'Vốn dự kiến sử dụng', item: 'Tồn kho vật tư', plan: 2000000000, actual: 615967685, notes: '', plan2025: 4000000000 },
        { id: 10, stt: '', group: 'Vốn dự kiến sử dụng', item: 'Ứng trước cho nhà cung cấp', plan: 2000000000, actual: 0, notes: '', plan2025: 2000000000 },
        { id: 11, stt: 'b', group: 'Vốn đã thu được', item: 'Tiền tạm ứng CĐT', plan: 17000000000, actual: 19261120397, notes: '', plan2025: 17000000000 },
        { id: 12, stt: '', group: 'Vốn đã thu được', item: 'Tiền tạm ứng cho đối tác', plan: 10000000000, actual: 6391215837, notes: '', plan2025: 10000000000 },
        { id: 13, stt: '', group: 'Vốn đã thu được', item: 'Tiền tạm ứng theo HĐ nhận công đa ký', plan: 3000000000, actual: 4101773403, notes: '', plan2025: 3000000000 },
        { id: 14, stt: '', group: 'Vốn đã thu được', item: 'Nợ vật tư', plan: 4000000000, actual: 8768131157, notes: '', plan2025: 4000000000 },
    ],
};

const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return "-";
    return value.toLocaleString('vi-VN');
};

const CapitalUtilizationReport = () => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(2025);
    const [quarter, setQuarter] = useState(2);
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);

    const calculateTotal = (data, key) => data.reduce((acc, item) => acc + (item[key] || 0), 0);

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Card elevation={2}>
                <CardHeader
                    title="Bản Sử Dụng Vốn"
                    subheader={`Phân tích kế hoạch và thực tế sử dụng vốn theo từng bộ phận cho Quý ${quarter}, Năm ${year}`}
                />
                <Divider />
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Quý</InputLabel>
                                <Select value={quarter} label="Quý" onChange={(e) => setQuarter(e.target.value)}>
                                    {[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Năm</InputLabel>
                                <Select value={year} label="Năm" onChange={(e) => setYear(e.target.value)}>
                                    {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>

                {/* Bảng Bộ Phận Sản Xuất */}
                <TableContainer component={Paper} variant="outlined" sx={{ m: 2, width: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                <TableCell colSpan={7} sx={{ fontWeight: 'bold', color: 'common.white' }}>
                                    I. BỘ PHẬN SẢN XUẤT / (NHÀ MÁY)
                                </TableCell>
                            </TableRow>
                            <TableRow sx={{ '& > th': { fontWeight: 'bold' } }}>
                                <TableCell>STT</TableCell>
                                <TableCell>Kế hoạch sử dụng vốn</TableCell>
                                <TableCell align="right">Số tiền KH</TableCell>
                                <TableCell align="right">Số tiền thực SD Q{quarter}.{year}</TableCell>
                                <TableCell>Thuận lợi & Khó khăn</TableCell>
                                <TableCell>Ghi chú</TableCell>
                                <TableCell align="right">KH N{year}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reportData.production.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.stt}</TableCell>
                                    <TableCell>{row.item}</TableCell>
                                    <TableCell align="right">{formatCurrency(row.plan)}</TableCell>
                                    <TableCell align="right">{formatCurrency(row.actual)}</TableCell>
                                    <TableCell>{row.advantages}</TableCell>
                                    <TableCell>{row.notes}</TableCell>
                                    <TableCell align="right">{formatCurrency(row.plan2025)}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ '& > td': { fontWeight: 'bold', backgroundColor: 'action.hover' } }}>
                                <TableCell colSpan={2}>Tổng Cộng</TableCell>
                                <TableCell align="right">{formatCurrency(calculateTotal(reportData.production, 'plan'))}</TableCell>
                                <TableCell align="right">{formatCurrency(calculateTotal(reportData.production, 'actual'))}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                                <TableCell align="right">{formatCurrency(calculateTotal(reportData.production, 'plan2025'))}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
                
                {/* Bảng Bộ Phận Xây Dựng */}
                <TableContainer component={Paper} variant="outlined" sx={{ m: 2, width: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                <TableCell colSpan={7} sx={{ fontWeight: 'bold', color: 'common.white' }}>
                                    II. BỘ PHẬN XÂY DỰNG
                                </TableCell>
                            </TableRow>
                            <TableRow sx={{ '& > th': { fontWeight: 'bold' } }}>
                                <TableCell>STT</TableCell>
                                <TableCell>Kế hoạch sử dụng vốn</TableCell>
                                <TableCell align="right">Số tiền KH</TableCell>
                                <TableCell align="right">Số tiền thực SD Q{quarter}.{year}</TableCell>
                                <TableCell>Thuận lợi & Khó khăn</TableCell>
                                <TableCell>Ghi chú</TableCell>
                                <TableCell align="right">KH N{year}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                             {reportData.construction.map((row, index) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.stt}</TableCell>
                                    <TableCell sx={{ pl: row.stt ? 2 : 4 }}>{row.item}</TableCell>
                                    <TableCell align="right">{formatCurrency(row.plan)}</TableCell>
                                    <TableCell align="right">{formatCurrency(row.actual)}</TableCell>
                                    <TableCell>{row.advantages}</TableCell>
                                    <TableCell>{row.notes}</TableCell>
                                    <TableCell align="right">{formatCurrency(row.plan2025)}</TableCell>
                                </TableRow>
                            ))}
                             <TableRow sx={{ '& > td': { fontWeight: 'bold', backgroundColor: 'action.hover' } }}>
                                <TableCell colSpan={2}>Tổng Cộng (a-b)</TableCell>
                                <TableCell align="right">{formatCurrency(calculateTotal(reportData.construction.filter(r => r.group === 'Vốn dự kiến sử dụng'), 'plan') - calculateTotal(reportData.construction.filter(r => r.group === 'Vốn đã thu được'), 'plan'))}</TableCell>
                                <TableCell align="right">{formatCurrency(calculateTotal(reportData.construction.filter(r => r.group === 'Vốn dự kiến sử dụng'), 'actual') - calculateTotal(reportData.construction.filter(r => r.group === 'Vốn đã thu được'), 'actual'))}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                                <TableCell align="right">{formatCurrency(calculateTotal(reportData.construction.filter(r => r.group === 'Vốn dự kiến sử dụng'), 'plan2025') - calculateTotal(reportData.construction.filter(r => r.group === 'Vốn đã thu được'), 'plan2025'))}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>

                 {/* Phần Kết Luận */}
                <CardContent>
                    <Typography variant="h6" gutterBottom>IV. KẾT LUẬN</Typography>
                    <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                        <li>Bộ phận đầu tư sử dụng vốn bao nhiêu thì tính lãi theo qui định.</li>
                        <li>Bộ phận nhà máy sử dụng vốn đúng qui định.</li>
                        <li>Bộ phận xây dựng sử dụng vốn đúng qui định.</li>
                    </Typography>
                </CardContent>

            </Card>
        </Box>
    );
};

export default CapitalUtilizationReport;