// src/pages/UnauthorizedPage.jsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography, Paper } from '@mui/material';
import { GppBad as ShieldAlert, ArrowBack as ArrowLeft } from '@mui/icons-material';
import { motion } from 'framer-motion';

// Component chính cho trang "Không có quyền"
export default function UnauthorizedPage() {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                bgcolor: 'grey.100', // Sử dụng màu nền từ theme của Material-UI
                p: 3,
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <Paper
                    elevation={6}
                    sx={{
                        p: { xs: 3, sm: 5 },
                        textAlign: 'center',
                        maxWidth: '500px',
                        borderRadius: '16px', // Bo góc mềm mại hơn
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                        bgcolor: 'rgba(255, 255, 255, 0.85)', // Hiệu ứng kính mờ
                    }}
                >
                    <motion.div
                        animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                        transition={{ duration: 1, repeat: Infinity, repeatDelay: 4 }}
                    >
                        <ShieldAlert sx={{ fontSize: 64, color: "#ef4444" }} />
                    </motion.div>

                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            fontWeight: 800,
                            color: 'error.main', // Sử dụng màu lỗi từ theme
                            mt: 3,
                            mb: 2
                        }}
                    >
                        Truy Cập Bị Từ Chối
                    </Typography>

                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ mb: 4 }}
                    >
                        Rất tiếc, tài khoản của bạn không có quyền truy cập vào trang này.
                        Nếu bạn cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ với quản trị viên.
                    </Typography>

                    <Button
                        component={RouterLink}
                        to="/"
                        variant="contained"
                        size="large"
                        startIcon={<ArrowLeft />}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 6px 16px rgba(59, 130, 246, 0.4)',
                            },
                        }}
                    >
                        Quay Về Trang Chủ
                    </Button>
                </Paper>
            </motion.div>
        </Box>
    );
}