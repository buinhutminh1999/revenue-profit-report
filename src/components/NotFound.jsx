import React from 'react';
import { Box, Typography, Button, Stack, TextField, InputAdornment, Paper } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Sử dụng icon từ thư viện đã có trong dự án của bạn
import { Home, ArrowLeft, Search, AlertTriangle } from 'lucide-react';

// --- Styled Components ---
const NotFoundContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    height: 'calc(100vh - 200px)', // Trừ đi chiều cao của Header và một ít padding
    padding: theme.spacing(3),
}));

const AnimatedDigit = styled(motion.div)(({ theme }) => ({
    fontSize: 'clamp(6rem, 20vw, 12rem)', // Kích thước linh hoạt
    fontWeight: 800,
    color: theme.palette.primary.main,
    textShadow: `0px 0px 30px ${alpha(theme.palette.primary.main, 0.3)}`,
}));

// --- Sub-component cho Animation ---
const Animated404 = () => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.1 }
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
            <AnimatedDigit variants={itemVariants}>4</AnimatedDigit>
            <motion.div variants={itemVariants}>
                <AlertTriangle size="clamp(4rem, 15vw, 8rem)" color="#ffc107" />
            </motion.div>
            <AnimatedDigit variants={itemVariants}>4</AnimatedDigit>
        </motion.div>
    );
};

// --- Component Chính ---
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <NotFoundContainer>
        <Animated404 />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 4, mb: 1 }}>
                Không tìm thấy trang
            </Typography>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Typography variant="body1" color="text.secondary" maxWidth="500px" sx={{ mb: 4 }}>
                Rất tiếc, chúng tôi không thể tìm thấy trang bạn yêu cầu. Có thể đường dẫn đã bị lỗi hoặc trang không còn tồn tại.
            </Typography>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', maxWidth: '450px', width: '100%', mb: 3 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Hãy thử tìm kiếm nội dung bạn cần..."
                    onKeyDown={(e) => { if (e.key === 'Enter') alert(`Searching for: ${e.target.value}`); }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={20} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                <Button 
                    variant="outlined" 
                    startIcon={<ArrowLeft />} 
                    onClick={() => navigate(-1)}
                >
                    Quay lại trang trước
                </Button>
                <Button 
                    variant="contained" 
                    startIcon={<Home />} 
                    onClick={() => navigate('/')}
                >
                    Về Trang chủ
                </Button>
            </Stack>
        </motion.div>
    </NotFoundContainer>
  );
}