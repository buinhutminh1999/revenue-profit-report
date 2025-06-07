// src/pages/LoginPage.jsx - Phiên bản nâng cấp

import React, { useState, useEffect, useContext } from 'react';
import {
  Box, TextField, Button, Alert, Typography, Paper, Avatar,
  FormControlLabel, Checkbox, Link as MUILink, useMediaQuery, CircularProgress, IconButton, InputAdornment, alpha, useTheme,
  Stack,
} from '@mui/material';
import { LockOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  getAuth, signInWithEmailAndPassword, setPersistence,
  browserLocalPersistence, browserSessionPersistence
} from 'firebase/auth';
import { motion } from 'framer-motion';

// Giả sử bạn có các file này
import { ColorModeContext } from '../ThemeContext'; 
import logo from '../assets/logo.png'; // Đảm bảo đường dẫn đến logo là đúng

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [remember, setRemember] = useState(true); // Mặc định nên là true
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const auth = getAuth();
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);

    useEffect(() => {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
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
    };

    const MotionPaper = motion(Paper);

    return (
        // TỐI ƯU 1: Background có hiệu ứng gradient và họa tiết
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `radial-gradient(ellipse at top, ${alpha(theme.palette.primary.light, 0.1)}, transparent 60%),
                         radial-gradient(ellipse at bottom, ${alpha(theme.palette.secondary.light, 0.1)}, transparent 60%),
                         ${theme.palette.background.default}`,
            p: 2,
        }}>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" spacing={{ xs: 4, md: 8 }} sx={{ maxWidth: '1000px', width: '100%' }}>

                {/* Phần thương hiệu bên trái */}
                <Box sx={{
                    flex: 1,
                    textAlign: { xs: 'center', md: 'left' },
                    color: 'text.primary'
                }}>
                    <motion.img
                        src={logo}
                        alt="Logo Công ty Bách Khoa"
                        style={{ width: 150, height: 150, marginBottom: '16px' }}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    />
                    <Typography variant="h4" fontWeight={700}>
                        Hệ thống quản trị
                    </Typography>
                    <Typography variant="h5" color="primary.main" fontWeight={700}>
                        Công ty CPXD Bách Khoa
                    </Typography>
                </Box>

                {/* TỐI ƯU 2: Form đăng nhập "nổi" với hiệu ứng glassmorphism */}
                <MotionPaper
                    elevation={0}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    sx={{
                        p: { xs: 3, sm: 4 },
                        width: '100%',
                        maxWidth: 420,
                        borderRadius: 4,
                        backdropFilter: 'blur(10px)',
                        backgroundColor: alpha(theme.palette.background.paper, 0.8),
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
                    }}
                >
                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={2}>
                            <Box textAlign="center">
                                <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
                                    <LockOutlined />
                                </Avatar>
                                <Typography component="h1" variant="h5" fontWeight={600}>
                                    Đăng Nhập
                                </Typography>
                            </Box>
                            
                            {error && <Alert severity="error" variant="outlined">{error}</Alert>}

                            <TextField
                                label="Email công ty"
                                type="email"
                                required fullWidth
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            <TextField
                                label="Mật khẩu"
                                type={showPass ? 'text' : 'password'}
                                required fullWidth
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPass(!showPass)} edge="end">
                                                {showPass ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <FormControlLabel
                                    control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
                                    label="Ghi nhớ"
                                />
                                <MUILink href="#" variant="body2">
                                    Quên mật khẩu?
                                </MUILink>
                            </Stack>

                            <motion.div whileTap={{ scale: 0.98 }}>
                                <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ py: 1.5 }}>
                                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Đăng nhập'}
                                </Button>
                            </motion.div>
                        </Stack>
                    </Box>
                </MotionPaper>
                
            </Stack>
        </Box>
    );
}