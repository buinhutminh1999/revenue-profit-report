import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box,
    List, ListItem, ListItemIcon, ListItemText, Chip, useTheme, alpha
} from '@mui/material';
import {
    AutoAwesome as AutoAwesomeIcon,
    Speed as SpeedIcon,
    ContentPaste as ContentPasteIcon,
    Palette as PaletteIcon,
    BugReport as BugReportIcon
} from '@mui/icons-material';

const CURRENT_VERSION = '2025.11.26.2'; // Increment this to show dialog again

const WhatsNewDialog = () => {
    const [open, setOpen] = useState(false);
    const theme = useTheme();

    useEffect(() => {
        const lastSeenVersion = localStorage.getItem('whats_new_last_seen');
        if (lastSeenVersion !== CURRENT_VERSION) {
            // Delay a bit for better UX
            const timer = setTimeout(() => setOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setOpen(false);
        localStorage.setItem('whats_new_last_seen', CURRENT_VERSION);
    };

    const features = [
        {
            icon: <BugReportIcon color="error" />,
            title: "Sửa lỗi Nghiêm trọng & Đồng bộ",
            description: "Đã khắc phục lỗi 'failed-precondition' khi đồng bộ dữ liệu ngoài và lỗi logic khiến tính năng 'Đồng bộ sang kỳ sau' không hoạt động."
        },
        {
            icon: <PaletteIcon color="primary" />,
            title: "Giao diện Chi tiết TK Hiện đại",
            description: "Bảng chi tiết tài khoản (khi click vào ô khóa) nay đã được nâng cấp với thiết kế Glassmorphism, hiệu ứng động và bố cục rõ ràng hơn."
        },
        {
            icon: <SpeedIcon color="warning" />,
            title: "Tối ưu Hiệu năng Đồng bộ",
            description: "Cải thiện tốc độ và độ ổn định khi đồng bộ dữ liệu từ Báo cáo Công nợ và Công trình nhờ cơ chế xử lý hàng loạt (Batch Processing)."
        },
        {
            icon: <AutoAwesomeIcon color="success" />,
            title: "Trải nghiệm Mượt mà hơn",
            description: "Sửa lỗi crash ứng dụng khi thông báo (Toast) và tinh chỉnh các hiệu ứng giao diện để mang lại cảm giác sử dụng tốt nhất."
        }
    ];

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    backgroundImage: theme.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.2)} 0%, ${theme.palette.background.paper} 100%)`
                        : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${theme.palette.background.paper} 100%)`
                }
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Box sx={{
                        p: 2,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main
                    }}>
                        <AutoAwesomeIcon sx={{ fontSize: 40 }} />
                    </Box>
                </Box>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                    Có gì mới trong bản cập nhật này?
                </Typography>
                <Chip label={`Phiên bản ${CURRENT_VERSION}`} size="small" color="primary" variant="outlined" />
            </DialogTitle>

            <DialogContent>
                <List sx={{ pt: 2 }}>
                    {features.map((feature, index) => (
                        <ListItem key={index} alignItems="flex-start" sx={{ px: 1 }}>
                            <ListItemIcon sx={{ minWidth: 48, mt: 0.5 }}>
                                {feature.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                        {feature.title}
                                    </Typography>
                                }
                                secondary={
                                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                        {feature.description}
                                    </Typography>
                                }
                            />
                        </ListItem>
                    ))}
                </List>
            </DialogContent>

            <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    onClick={handleClose}
                    size="large"
                    sx={{ px: 6, borderRadius: 2 }}
                >
                    Tuyệt vời, tôi đã hiểu!
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default WhatsNewDialog;
