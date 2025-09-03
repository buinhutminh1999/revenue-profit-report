import React from 'react';
import {
    Box, Typography, Grid, Dialog, DialogTitle, DialogContent,
    DialogActions, Button, IconButton, Card, CardHeader, CardContent, alpha, Chip
} from '@mui/material';
import {
    Functions as FunctionsIcon,
    Close as CloseIcon,
    Public as PublicIcon,
    SwapHoriz as SwapHorizIcon,
    Construction as ConstructionIcon,
    Factory as FactoryIcon,
    ReceiptLong as ReceiptLongIcon,
    Groups as GroupsIcon
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

// Component con để hiển thị một công thức (đã được thiết kế lại)
const FormulaItem = ({ title, formula, projectType }) => {
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
                    projectType && <Chip label={projectType} size="small" color="primary" />
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
                        margin: 0, // Reset default margin of <pre>
                    }}
                >
                    {formula}
                </Typography>
            </CardContent>
        </Card>
    );
};

// Component chính hiển thị tất cả công thức
const FormulaGuide = ({ open, onClose }) => {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                <FunctionsIcon color="primary" sx={{ mr: 1.5 }} />
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Bảng Tra Cứu Công Thức
                </Typography>
                <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, bgcolor: 'grey.50' }}>
                {/* --- NHÓM CÔNG THỨC CHUNG --- */}
                <SectionHeader icon={<PublicIcon color="action" />}>Công Thức Chung</SectionHeader>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormulaItem
                            title="Được Trừ Quý Này"
                            projectType="Tất cả loại CT"
                            formula="MIN( MAX(0, Doanh Thu - (CP Trực Tiếp + Phân Bổ)), Chuyển Tiếp ĐK )"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormulaItem
                            title="CP Sau Quyết Toán"
                            projectType="Tất cả loại CT"
                            // <<< ĐÃ CẬP NHẬT CÔNG THỨC MỚI TẠI ĐÂY
                            formula={`Chi Phí Trực Tiếp + Phân Bổ + Nợ Phải Trả CK
- Cuối Kỳ - Nợ Phải Trả ĐK - Tồn ĐK`}
                        />
                    </Grid>
                </Grid>

                {/* --- NHÓM QUY TẮC CHUYỂN QUÝ --- */}
                <SectionHeader icon={<SwapHorizIcon color="action" />}>Quy Tắc Chuyển Dữ Liệu Sang Quý Sau</SectionHeader>
                <Grid container spacing={3}>
                    <Grid item xs={12} lg={6}>
                        <FormulaItem
                            title="Nợ Phải Trả ĐK (Quý Sau)"
                            projectType="Nhà Máy"
                            formula="Nợ Phải Trả CK (Quý Hiện Tại) + Nợ Phải Trả CK NM (Quý Hiện Tại)"
                        />
                    </Grid>
                     <Grid item xs={12} lg={6}>
                        <FormulaItem
                            title="Nợ Phải Trả ĐK (Quý Sau)"
                            projectType="Loại CT khác"
                            formula="Nợ Phải Trả CK (Quý Hiện Tại)"
                        />
                    </Grid>
                    <Grid item xs={12} lg={6}>
                        <FormulaItem
                            title="Tồn ĐK (Quý Sau)"
                            projectType="Tất cả loại CT"
                            formula="Tồn Kho/Ứng KH (Quý Hiện Tại)"
                        />
                    </Grid>
                    <Grid item xs={12} lg={6}>
                        <FormulaItem
                            title="Chuyển Tiếp ĐK (Quý Sau)"
                            projectType="Tất cả loại CT"
                            formula="Giá trị cột 'Cuối Kỳ' hoặc 'Vượt Cuối Kỳ' (Quý Hiện Tại)"
                        />
                    </Grid>
                </Grid>

                {/* --- NHÓM CÔNG TRÌNH THI CÔNG & KH-ĐT --- */}
                <SectionHeader icon={<ConstructionIcon color="action" />}>Công Thức Cho CT Thi Công & KH-ĐT</SectionHeader>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6} lg={4}>
                        <FormulaItem
                            title="Tổng Chi Phí"
                            projectType="Thi Công & KH-ĐT"
                            formula={`IF( Doanh Thu = 0, (CP Trực Tiếp + Phân Bổ), Doanh Thu )`}
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={4}>
                        <FormulaItem
                            title="Nợ Phải Trả CK"
                            projectType="Thi Công & KH-ĐT"
                            formula={`MAX(0, Doanh Thu - CP Trực Tiếp - Phân Bổ - Được Trừ QN) + Nợ Phải Trả ĐK`}
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={4}>
                        <FormulaItem
                            title="Cuối Kỳ"
                            projectType="Thi Công & KH-ĐT"
                            formula={`MAX(0, (CP Trực Tiếp + Phân Bổ) - Doanh Thu) + Chuyển Tiếp ĐK - Được Trừ QN`}
                        />
                    </Grid>
                </Grid>

                {/* --- NHÓM CÔNG TRÌNH VẬT TƯ & NHÂN CÔNG --- */}
                 <SectionHeader icon={<GroupsIcon color="action" />}>Công Thức Cho CT Vật Tư & Nhân Công</SectionHeader>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormulaItem
                            title="Tổng Chi Phí"
                            projectType="Vật Tư & Nhân Công"
                            formula={`Tồn ĐK - Nợ Phải Trả ĐK + CP Trực Tiếp + Phân Bổ + Nợ Phải Trả CK - Tồn Kho/Ứng KH`}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormulaItem
                            title="Nợ Phải Trả CK"
                            projectType="Vật Tư & Nhân Công"
                            formula={`Nợ Phải Trả ĐK - Chi Phí Trực Tiếp`}
                        />
                    </Grid>
                </Grid>

                {/* --- NHÓM CÔNG TRÌNH NHÀ MÁY --- */}
                <SectionHeader icon={<FactoryIcon color="action" />}>Công Thức Riêng Cho Loại CT Nhà Máy</SectionHeader>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormulaItem
                            title="CP Trừ Vào Chuyển Tiếp"
                            projectType="Nhà Máy"
                            formula={`MIN( MAX(0, Doanh Thu - CP Trực Tiếp), Chuyển Tiếp ĐK )`}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormulaItem
                            title="CP Vượt Quý"
                            projectType="Nhà Máy"
                            formula={`MAX(0, CP Trực Tiếp + Phân Bổ + Nợ Phải Trả CK NM - Nợ Phải Trả ĐK - Doanh Thu)`}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormulaItem
                            title="Vượt Cuối Kỳ"
                            projectType="Nhà Máy"
                            formula={`Chuyển Tiếp ĐK - Được Trừ QN + CP Vượt Quý`}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormulaItem
                            title="Nợ Phải Trả CK"
                            projectType="Nhà Máy"
                            formula={`IF((Được Trừ QN + CP Trực Tiếp + Phân Bổ + Nợ Phải Trả CK NM - Nợ Phải Trả ĐK) < Doanh Thu,
    (Doanh Thu - Được Trừ QN - CP Trực Tiếp - Phân Bổ - Nợ Phải Trả CK NM + Nợ Phải Trả ĐK),
    0
)`}
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

export default FormulaGuide;