import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogTitle, Typography, Box, Button,
    Stack, Chip, IconButton, useTheme, alpha
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Rocket, Close, CheckCircle, Security, Palette,
    AutoAwesome, ArrowForward
} from '@mui/icons-material';

const updates = [
    {
        type: 'security',
        icon: <Security fontSize="small" />,
        color: '#ef4444',
        title: 'Bảo mật nâng cao',
        description: 'Cấu hình hệ thống đã được mã hóa và bảo vệ an toàn hơn.'
    },
    {
        type: 'ui',
        icon: <Palette fontSize="small" />,
        color: '#8b5cf6',
        title: 'Giao diện hiện đại',
        description: 'Trải nghiệm Glassmorphism mới cho trang chủ với hiệu ứng mượt mà.'
    },
    {
        type: 'feature',
        icon: <CheckCircle fontSize="small" />,
        color: '#10b981',
        title: 'Cải thiện hiệu năng',
        description: 'Tối ưu hóa tốc độ tải trang và xử lý dữ liệu.'
    }
];

const UpdateNotification = () => {
    const [open, setOpen] = useState(false);
    const [version, setVersion] = useState(null);
    const theme = useTheme();

    useEffect(() => {
        const checkVersion = async () => {
            try {
                // Fetch version.json from public folder (generated at build time)
                const response = await fetch('/version.json?t=' + new Date().getTime());
                if (!response.ok) return;

                const data = await response.json();
                const serverVersion = data.version;
                const localVersion = localStorage.getItem('app_version');

                // If version changed (and it's not the first visit), show notification
                if (serverVersion && serverVersion !== localVersion) {
                    setVersion(serverVersion);
                    // Delay a bit for better UX
                    setTimeout(() => setOpen(true), 1500);
                }
            } catch (error) {
                console.error("Failed to check version:", error);
            }
        };

        checkVersion();
    }, []);

    const handleClose = () => {
        setOpen(false);
        if (version) {
            localStorage.setItem('app_version', version);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                style: {
                    borderRadius: 24,
                    background: 'transparent',
                    boxShadow: 'none',
                    overflow: 'visible'
                }
            }}
            BackdropProps={{
                style: {
                    backdropFilter: 'blur(8px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)'
                }
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", duration: 0.6 }}
            >
                <Box
                    sx={{
                        background: '#fff',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    }}
                >
                    {/* Header Background */}
                    <Box
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            p: 4,
                            pb: 6,
                            color: 'white',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Decorative Circles */}
                        <Box sx={{
                            position: 'absolute',
                            top: -20,
                            right: -20,
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)'
                        }} />
                        <Box sx={{
                            position: 'absolute',
                            bottom: -10,
                            left: 20,
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)'
                        }} />

                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                                <Chip
                                    label={version && version.length > 10 ? "Phiên bản mới nhất" : `Phiên bản ${version}`}
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        mb: 2,
                                        backdropFilter: 'blur(4px)'
                                    }}
                                />
                                <Typography variant="h4" fontWeight="800" sx={{ mb: 1 }}>
                                    Có gì mới?
                                </Typography>
                                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                                    Khám phá những cập nhật mới nhất của chúng tôi.
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    borderRadius: '12px',
                                    p: 1,
                                    backdropFilter: 'blur(4px)'
                                }}
                            >
                                <AutoAwesome sx={{ fontSize: 32 }} />
                            </Box>
                        </Stack>
                    </Box>

                    {/* Content */}
                    <DialogContent sx={{ p: 3, mt: -3 }}>
                        <Stack spacing={2}>
                            {updates.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                >
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: '16px',
                                            bgcolor: '#f8fafc',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                bgcolor: '#fff',
                                                borderColor: item.color,
                                                boxShadow: `0 4px 12px ${alpha(item.color, 0.1)}`,
                                                transform: 'translateY(-2px)'
                                            }
                                        }}
                                    >
                                        <Stack direction="row" spacing={2} alignItems="flex-start">
                                            <Box
                                                sx={{
                                                    p: 1,
                                                    borderRadius: '12px',
                                                    bgcolor: alpha(item.color, 0.1),
                                                    color: item.color,
                                                    display: 'flex'
                                                }}
                                            >
                                                {item.icon}
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight="700" color="text.primary">
                                                    {item.title}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    {item.description}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                </motion.div>
                            ))}
                        </Stack>

                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleClose}
                            endIcon={<ArrowForward />}
                            sx={{
                                mt: 4,
                                borderRadius: '14px',
                                py: 1.5,
                                textTransform: 'none',
                                fontSize: '1rem',
                                fontWeight: 700,
                                boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                            }}
                        >
                            Trải nghiệm ngay
                        </Button>
                    </DialogContent>
                </Box>
            </motion.div>
        </Dialog>
    );
};

export default UpdateNotification;
