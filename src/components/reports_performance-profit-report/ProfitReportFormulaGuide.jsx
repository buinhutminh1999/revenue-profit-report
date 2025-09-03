import React from 'react';
import {
    Box, Typography, Grid, Dialog, DialogTitle, DialogContent,
    DialogActions, Button, IconButton, Card, CardHeader, CardContent, alpha, Chip
} from '@mui/material';
import {
    Functions as FunctionsIcon,
    Close as CloseIcon,
    DataObject as DataObjectIcon,
    Calculate as CalculateIcon,
    Summarize as SummarizeIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Helper component để tạo tiêu đề cho mỗi section
const SectionHeader = ({ icon, children }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', mt: 4, mb: 2 }}>
        {icon}
        <Typography variant="h6" sx={{ fontWeight: '600', ml: 1.5 }}>
            {children}
        </Typography>
    </Box>
);

// Component con để hiển thị một công thức
const FormulaItem = ({ title, formula, context }) => {
    const theme = useTheme();
    return (
        <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader
                title={
                    <Typography variant="subtitle1" fontWeight="bold">
                        {title}
                    </Typography>
                }
                action={
                    context && <Chip label={context} size="small" color="primary" variant="outlined" />
                }
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}
            />
            <CardContent sx={{ flexGrow: 1 }}>
                <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                        fontFamily: '"Fira Code", monospace',
                        backgroundColor: theme.palette.mode === 'light' ? 'grey.100' : 'grey.900',
                        color: theme.palette.text.secondary,
                        p: 2,
                        borderRadius: 1,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '0.9rem',
                        lineHeight: 1.7,
                        margin: 0,
                    }}
                >
                    {formula}
                </Typography>
            </CardContent>
        </Card>
    );
};

// Component chính hiển thị tất cả công thức
const ProfitReportFormulaGuide = ({ open, onClose }) => {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                <FunctionsIcon color="primary" sx={{ mr: 1.5 }} />
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Bảng Tra Cứu Công Thức (Báo Cáo Lợi Nhuận Quý)
                </Typography>
                <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, bgcolor: 'grey.50' }}>

                {/* --- NHÓM CÔNG THỨC CỐT LÕI (CHO TỪNG CÔNG TRÌNH) --- */}
                <SectionHeader icon={<DataObjectIcon color="action" />}>Công Thức Cốt Lõi (Dữ liệu gốc từ mỗi công trình)</SectionHeader>
                <Grid container spacing={3}>
                    {/* // <-- SỬA ĐỔI TẠI ĐÂY */}
                    <Grid item xs={12} md={6}>
                        <FormulaItem
                            title="Doanh Thu"
                            context="Cho từng công trình"
                            formula="Lấy trực tiếp từ trường 'Tổng Doanh Thu (của Quý)' của công trình trong kỳ đã chọn."
                        />
                    </Grid>
                    {/* // <-- SỬA ĐỔI TẠI ĐÂY */}
                    <Grid item xs={12} md={6}>
                        <FormulaItem
                            title="Chi Phí Đã Chi"
                            context="Cho từng công trình"
                            formula={`// Công thức có điều kiện dựa trên loại công trình:

IF (Loại CT là 'Nhà máy') THEN
    Chi Phí = SUM(Tất cả cột 'Tổng Chi Phí' từ các hạng mục)

ELSE (Các loại CT khác)
    IF (Tổng Doanh Thu chi tiết = 0) THEN
        Chi Phí = SUM(Tất cả cột 'CP Sau Quyết Toán' từ các hạng mục)
    ELSE
        Chi Phí = SUM(Tất cả cột 'Tổng Chi Phí' từ các hạng mục)
    END IF
END IF`}
                        />
                    </Grid>
                </Grid>

                {/* --- NHÓM CÔNG THỨC TỔNG HỢP --- */}
                <SectionHeader icon={<SummarizeIcon color="action" />}>Công Thức Tổng Hợp Nhóm</SectionHeader>
                <Grid container spacing={3}>
                    <Grid item xs={12} lg={6}>
                        <FormulaItem
                            title="Hàng Tổng Hợp (VD: I. XÂY DỰNG, TỔNG)"
                            context="Doanh thu & Chi phí"
                            formula="Giá trị tại hàng tổng hợp được tính bằng cách CỘNG DỒN (SUM) giá trị tương ứng của các hàng con hoặc các nhóm con trực thuộc nó."
                        />
                    </Grid>
                    <Grid item xs={12} lg={6}>
                        <FormulaItem
                            title="Hàng Tổng Hợp (VD: I. XÂY DỰNG, TỔNG)"
                            context="Lợi nhuận"
                            formula={`// Đa số các trường hợp:
Lợi nhuận = (Tổng Doanh Thu) - (Tổng Chi Phí)

// Một số trường hợp đặc biệt (VD: II. SẢN XUẤT):
Lợi nhuận = SUM(Lợi nhuận của các nhóm con)`}
                        />
                    </Grid>
                </Grid>

                 {/* --- NHÓM CÔNG THỨC TÍNH TOÁN ĐẶC BIỆT --- */}
                 <SectionHeader icon={<CalculateIcon color="action" />}>Công Thức Tính Toán Đặc Biệt (Hàng tự động)</SectionHeader>
                 <Grid container spacing={3}>
                     <Grid item xs={12} md={6}>
                         <FormulaItem
                             title="=> LỢI NHUẬN SAU GIẢM TRỪ [QUÝ].[NĂM]"
                             context="Hàng tính toán"
                             formula={`LN Quý (IV) - Giảm LN (V) + Thu Nhập Khác (VI) - KHTSCĐ (VII) - Giảm Lãi ĐT (VIII)`}
                         />
                     </Grid>
                     <Grid item xs={12} md={6}>
                         <FormulaItem
                             title="VƯỢT [QUÝ]"
                             context="Hàng tính toán"
                             formula={`(+Vượt CP BPXD) + (+Vượt CP BPSX) + (+Vượt CP BPĐT) + Lợi nhuận của hàng '(+ Chi phí đã trả trước)'`}
                         />
                     </Grid>
                     <Grid item xs={12} md={6}>
                         <FormulaItem
                             title="LỢI NHUẬN RÒNG"
                             context="Hàng tính toán (Cuối cùng)"
                             formula={`(Lợi Nhuận Sau Giảm Trừ) - (Vượt [QUÝ])`}
                         />
                     </Grid>
                 </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={onClose} variant="contained" color="primary">Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProfitReportFormulaGuide;