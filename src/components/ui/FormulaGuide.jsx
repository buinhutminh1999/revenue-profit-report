import React from 'react';
import { 
    Box, Typography, Grid, Divider, Chip, Dialog, DialogTitle, DialogContent, 
    DialogActions, Button, IconButton, Accordion, AccordionSummary, AccordionDetails, alpha
} from '@mui/material';
import { 
    Functions as FunctionsIcon, Close as CloseIcon, ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Component con để hiển thị một công thức (đã loại bỏ phần giải thích)
const FormulaItem = ({ title, formula, projectType }) => {
    const theme = useTheme();
    return (
        <Accordion sx={{ 
            boxShadow: 'none', 
            border: `1px solid ${theme.palette.divider}`,
            '&:before': { display: 'none' },
            '&.Mui-expanded': { margin: 0 }
        }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography fontWeight="bold" sx={{ flexGrow: 1 }}>{title}</Typography>
                    {projectType && <Chip label={projectType} size="small" color="primary" variant="outlined" />}
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
                <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                        fontFamily: '"Fira Code", monospace',
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        color: theme.palette.primary.dark,
                        p: 1.5,
                        borderRadius: 1,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '0.9rem',
                        lineHeight: 1.7,
                    }}
                >
                    {formula}
                </Typography>
            </AccordionDetails>
        </Accordion>
    );
};

// Component chính hiển thị tất cả công thức
const FormulaGuide = ({ open, onClose }) => {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
                <FunctionsIcon color="primary" sx={{ mr: 1.5 }}/>
                Bảng Tra Cứu Công Thức
                <Box sx={{ flexGrow: 1 }} />
                <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 1, sm: 2, md: 3 }, bgcolor: 'background.default' }}>
                {/* --- NHÓM CÔNG THỨC CHUNG --- */}
                <Typography variant="h6" gutterBottom>Công thức chung</Typography>
                <Grid container spacing={2}>
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
                            formula="Chi Phí Trực Tiếp + Nợ Phải Trả CK - Nợ Phải Trả ĐK"
                        />
                    </Grid>
                </Grid>

                {/* --- NHÓM CÔNG TRÌNH THI CÔNG & KH-ĐT --- */}
                <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Công thức cho CT Thi Công & KH-ĐT</Typography>
                 <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <FormulaItem 
                            title="Tổng Chi Phí"
                            projectType="Thi Công & KH-ĐT"
                            formula={`IF( Doanh Thu = 0, (CP Trực Tiếp + Phân Bổ), Doanh Thu )`}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormulaItem 
                            title="Nợ Phải Trả CK"
                            projectType="Thi Công & KH-ĐT"
                            formula={`MAX(0, Doanh Thu - CP Trực Tiếp - Phân Bổ - Được Trừ QN) + Nợ Phải Trả ĐK`}
                        />
                    </Grid>
                     <Grid item xs={12} md={6}>
                        <FormulaItem 
                            title="Cuối Kỳ"
                            projectType="Thi Công & KH-ĐT"
                            formula={`MAX(0, (CP Trực Tiếp + Phân Bổ) - Doanh Thu) + Chuyển Tiếp ĐK - Được Trừ QN`}
                        />
                    </Grid>
                </Grid>
                
                 {/* --- NHÓM CÔNG TRÌNH VẬT TƯ & NHÂN CÔNG --- */}
                <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Công thức cho CT Vật Tư & Nhân Công</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                         <FormulaItem 
                            title="Tổng Chi Phí"
                            projectType="Vật Tư & Nhân Công"
                            formula={`Tồn ĐK - Nợ Phải Trả ĐK + CP Trực Tiếp + Nợ Phải Trả CK - Tồn Kho/Ứng KH`}
                        />
                    </Grid>
                </Grid>
                
                {/* --- NHÓM CÔNG TRÌNH NHÀ MÁY --- */}
                <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Công thức riêng cho loại CT Nhà Máy</Typography>
                <Grid container spacing={2}>
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
                            formula={`MAX(0, CP Trực Tiếp + Phân Bổ  + phải trả ck nm- Nợ ĐK - Doanh Thu)`}
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
                            formula={`IF((Được Trừ QN + CP Trực Tiếp + Phân Bổ + nợ phải trả CK NM- Nợ ĐK) < Doanh Thu,
    (Doanh Thu - Được Trừ QN - CP Trực Tiếp - Phân Bổ - Nợ phải trả CK NM + Nợ ĐK),
    0
)`}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} variant="contained">Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};

export default FormulaGuide;