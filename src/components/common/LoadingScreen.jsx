import React, { useState, useEffect } from 'react';
import { Box, Typography, useTheme, LinearProgress, Stack } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

// Mảng các thông điệp tải, giúp màn hình chờ sinh động hơn
const loadingMessages = [
    'Đang khởi tạo modules...',
    'Kết nối cơ sở dữ liệu...',
    'Xác thực thông tin người dùng...',
    'Chuẩn bị giao diện làm việc...',
    'Sắp xong rồi, chờ một chút nhé!',
];

// Component cho hiệu ứng 3 chấm gợn sóng (dùng cho Suspense)
const BouncingDots = () => {
    const dotVariants = {
        initial: { y: 0 },
        animate: {
            y: -10,
            transition: {
                duration: 0.4,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatType: 'reverse',
            },
        },
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <motion.div
                style={{ display: 'flex', gap: '8px' }}
                initial="initial"
                animate="animate"
                variants={{
                    animate: {
                        transition: {
                            staggerChildren: 0.1,
                        },
                    },
                }}
            >
                {[1, 2, 3].map((_, i) => (
                    <motion.div
                        key={i}
                        variants={dotVariants}
                        style={{
                            width: 10,
                            height: 10,
                            backgroundColor: 'currentColor',
                            borderRadius: '50%',
                        }}
                    />
                ))}
            </motion.div>
        </Box>
    );
};


export default function LoadingScreen({ isSuspense = false }) {
    const theme = useTheme();
    const [messageIndex, setMessageIndex] = useState(0);

    // useEffect để thay đổi thông điệp mỗi 2 giây
    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    // Giao diện cho Suspense (khi tải một phần trang)
    if (isSuspense) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 250px)', color: 'text.secondary' }}>
                <BouncingDots />
            </Box>
        );
    }

    // Giao diện cho màn hình tải chính (khi vào app)
    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: 'background.default',
            p: 3
        }}>
            <Stack alignItems="center" spacing={4} sx={{ maxWidth: '400px', width: '100%' }}>
                {/* Logo với hiệu ứng "thở" */}
                <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <Box
                        component="img"
                        src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png"
                        alt="Logo"
                        sx={{ width: 80, height: 'auto' }}
                    />
                </motion.div>

                {/* Thanh tiến trình */}
                <Box sx={{ width: '100%' }}>
                    <LinearProgress variant="indeterminate" />
                </Box>

                {/* Thông điệp động */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={messageIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                    >
                        <Typography variant="body2" color="text.secondary" align="center">
                            {loadingMessages[messageIndex]}
                        </Typography>
                    </motion.div>
                </AnimatePresence>
            </Stack>
        </Box>
    );
}