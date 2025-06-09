// src/pages/LoginPage.jsx - Phiên bản Final (Parallax, Tương tác nâng cao)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Box, TextField, Button, Alert, Typography, Paper, Avatar,
    FormControlLabel, Checkbox, Link as MUILink, CircularProgress, IconButton, InputAdornment, alpha,
    Stack, styled,
} from '@mui/material';
import { Business, Visibility, VisibilityOff, MailOutline, VpnKeyOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
    getAuth, signInWithEmailAndPassword, setPersistence,
    browserLocalPersistence, browserSessionPersistence
} from 'firebase/auth';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import logo from '../assets/logo.png'; // Đảm bảo đường dẫn đến logo là đúng

const MotionPaper = motion(Paper);
const MotionBox = motion(Box);

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};

const BRAND_COLORS = {
    primary: '#0D47A1', // Xanh đậm, tin cậy
    secondary: '#FFC107', // Vàng cam, năng động
    background: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop',
};

// Tối ưu UI: Tùy chỉnh TextField cho giao diện tối
const StyledTextField = styled(TextField)({
    '& label': {
      color: alpha("#FFFFFF", 0.7),
    },
    '& label.Mui-focused': {
      color: BRAND_COLORS.secondary,
    },
    '& .MuiInputBase-input': {
        color: alpha("#FFFFFF", 0.9),
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: alpha("#FFFFFF", 0.3),
      },
      '&:hover fieldset': {
        borderColor: alpha("#FFFFFF", 0.5),
      },
      '&.Mui-focused fieldset': {
        borderColor: BRAND_COLORS.secondary,
        borderWidth: '2px',
      },
    },
});

export default function LoginPage() {
    const [email, setEmail] = useState('bachkhoa_lx@yahoo.com.vn');
    const [pass, setPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    const auth = getAuth();
    
    // Logic cho hiệu ứng Parallax
    const containerRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = ({ clientX, clientY }) => {
        if (containerRef.current) {
            const { left, top, width, height } = containerRef.current.getBoundingClientRect();
            mouseX.set(clientX - left - width / 2);
            mouseY.set(clientY - top - height / 2);
        }
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };
    
    // Transform cho form (nghiêng)
    const rotateX = useTransform(mouseY, [-300, 300], [10, -10], { clamp: false });
    const rotateY = useTransform(mouseX, [-300, 300], [-10, 10], { clamp: false });

    // Transform cho ảnh nền (di chuyển ngược hướng)
    const bgTranslateX = useTransform(mouseX, [-500, 500], [25, -25], { clamp: false });
    const bgTranslateY = useTransform(mouseY, [-500, 500], [15, -15], { clamp: false });

    useEffect(() => {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
        }
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError('');
        try {
            const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistence);
            await signInWithEmailAndPassword(auth, email, pass);
            if (remember) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            navigate('/', { replace: true });
        } catch (err) {
            setError('Email hoặc mật khẩu không chính xác.');
        } finally {
            setLoading(false);
        }
    }, [auth, email, pass, remember, navigate, loading]);

    // Hiệu ứng cho Logo 2D
    const logoContainerSx = useMemo(() => ({
        width: 250, height: 250, mb: 4, position: 'relative',
        '@keyframes breathing': {
            '0%': { transform: 'scale(0.95)', filter: 'brightness(1)' },
            '50%': { transform: 'scale(1.05)', filter: 'brightness(1.2)' },
            '100%': { transform: 'scale(0.95)', filter: 'brightness(1)' },
        },
        animation: 'breathing 8s ease-in-out infinite',
    }), []);
    
    return (
        <Box 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            sx={{ 
                minHeight: '100vh', width: '100%', position: 'relative', overflow: 'hidden', 
                perspective: '1500px', // Thêm perspective để hiệu ứng mượt hơn
            }}
        >
             {/* Nền Parallax */}
             <MotionBox 
                style={{ x: bgTranslateX, y: bgTranslateY }}
                sx={{ 
                    position: 'absolute', top: '-5%', left: '-5%', width: '110%', height: '110%',
                    backgroundImage: `url(${BRAND_COLORS.background})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    '&::before': {
                        content: '""', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(75deg, rgba(0, 22, 40, 0.95) 45%, rgba(13, 71, 161, 0.7))',
                    },
                }}
             />

            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ width: '100%', height: { xs: 'auto', md: '100vh' }, maxWidth: '1400px', mx: 'auto', zIndex: 2, alignItems: 'center', position: 'relative' }}>
                {/* --- CỘT BÊN TRÁI --- */}
                <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center', p: 4, height: '100%' }}>
                    <Box sx={logoContainerSx}>
                        <motion.img
                            src={logo}
                            alt="Logo Công ty Bách Khoa"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                        />
                    </Box>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                        <Typography variant="h3" fontWeight={700} sx={{ textShadow: '2px 2px 8px rgba(0,0,0,0.5)' }}>Hệ Thống Quản Trị</Typography>
                        <Typography variant="h5" fontWeight={500} sx={{ color: BRAND_COLORS.secondary, mt: 1 }}>Công ty CPXD Bách Khoa</Typography>
                        <Typography variant="body1" sx={{ mt: 2, fontStyle: 'italic', opacity: 0.8 }}>"Xây Bền Vững, Dựng Thành Công." </Typography>
                    </motion.div>
                </Box>

                {/* --- CỘT BÊN PHẢI --- */}
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4, height: '100%' }}>
                    <MotionPaper
                        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        elevation={16}
                        sx={{
                            p: { xs: 3, sm: 5 }, width: '100%', maxWidth: 450, borderRadius: 4,
                            backdropFilter: 'blur(10px)', backgroundColor: alpha('#1A2027', 0.7),
                            border: `1px solid ${alpha(BRAND_COLORS.secondary, 0.3)}`,
                            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                        }}
                        variants={containerVariants} initial="hidden" animate="visible"
                    >
                        <Box component="form" onSubmit={handleSubmit} noValidate style={{ transform: 'translateZ(40px)' }}>
                            <Stack spacing={3}>
                                <motion.div variants={itemVariants}>
                                    <Box textAlign="center" mb={2}>
                                        <Avatar sx={{ bgcolor: BRAND_COLORS.secondary, color: BRAND_COLORS.primary, mx: 'auto', mb: 1.5, width: 56, height: 56 }}>
                                            <Business sx={{ fontSize: '1.75rem' }}/>
                                        </Avatar>
                                        <Typography component="h1" variant="h4" fontWeight={700} color="white">Đăng Nhập</Typography>
                                    </Box>
                                </motion.div>
                                
                                <AnimatePresence>{error && (
                                  <motion.div variants={itemVariants}><Alert severity="error" variant="filled" sx={{ width: '100%' }}>{error}</Alert></motion.div>
                                )}</AnimatePresence>

                                <motion.div variants={itemVariants}>
                                  <StyledTextField label="Email công ty" type="email" required fullWidth value={email} onChange={(e) => setEmail(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><MailOutline /></InputAdornment>)}}/>
                                </motion.div>
                                <motion.div variants={itemVariants}>
                                  <StyledTextField label="Mật khẩu" type={showPass ? 'text' : 'password'} required fullWidth value={pass} onChange={(e) => setPass(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><VpnKeyOutlined /></InputAdornment>), endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPass(!showPass)} edge="end" sx={{ color: alpha("#fff", 0.7) }}>{showPass ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) }}/>
                                </motion.div>
                                <motion.div variants={itemVariants}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <FormControlLabel control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} sx={{color: BRAND_COLORS.secondary, '&.Mui-checked': {color: BRAND_COLORS.secondary}}} />} label={<Typography color="white">Ghi nhớ</Typography>} />
                                    <MUILink href="#" variant="body2" sx={{ color: BRAND_COLORS.secondary, fontWeight: 'bold' }}>Quên mật khẩu?</MUILink>
                                  </Stack>
                                </motion.div>

                                <motion.div variants={itemVariants}>
                                    <motion.div
                                        whileHover={{ scale: 1.05, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} 
                                                sx={{ 
                                                    py: 1.5, fontWeight: 'bold', fontSize: '1.1rem', borderRadius: 2, 
                                                    bgcolor: BRAND_COLORS.secondary, color: BRAND_COLORS.primary, 
                                                    '&:hover': { bgcolor: alpha(BRAND_COLORS.secondary, 0.9), boxShadow: `0px 6px 20px ${alpha(BRAND_COLORS.secondary, 0.4)}` },
                                                    transition: 'box-shadow 0.3s ease-in-out'
                                                }}>
                                            {loading ? <CircularProgress size={26} sx={{ color: BRAND_COLORS.primary }} /> : 'Đăng nhập'}
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            </Stack>
                        </Box>
                    </MotionPaper>
                </Box>
            </Stack>
        </Box>
    );
}