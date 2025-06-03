import React, { useState, useEffect, useContext } from 'react';
import {
  Box, TextField, Button, Alert, Typography, Paper, Avatar,
  FormControlLabel, Checkbox, Link, useMediaQuery, CircularProgress, Slide, IconButton
} from '@mui/material';
import { LockOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  getAuth, signInWithEmailAndPassword, setPersistence,
  browserLocalPersistence, browserSessionPersistence
} from 'firebase/auth';
import { ColorModeContext } from '../ThemeContext'; // nếu bạn có dark mode
import logo from '../assets/logo.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const auth = getAuth();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isTablet = useMediaQuery('(max-width:1024px)');
  const colorMode = useContext(ColorModeContext);

  useEffect(() => {
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
      setEmail(remembered);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await signInWithEmailAndPassword(auth, email, pass);
      remember
        ? localStorage.setItem('rememberedEmail', email)
        : localStorage.removeItem('rememberedEmail');
      nav('/', { replace: true });
    } catch (err) {
      setError('❌ Sai email hoặc mật khẩu!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: isTablet ? 'column' : 'row',
      bgcolor: '#e8f0fe',
    }}>
      {/* Logo bên trái */}
      {!isTablet && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#e3f2fd',
            p: 4,
          }}
        >
          <Box textAlign="center">
            <img src={logo} alt="Logo" style={{ maxWidth: 320, width: '100%' }} />
            <Typography variant="h6" mt={2} color="primary">
              Hệ thống quản trị công trình<br />Công ty CPXD BÁCH KHOA
            </Typography>
          </Box>
        </Box>
      )}

      {/* Form đăng nhập */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f9f9f9',
          px: 2,
          py: isMobile ? 4 : 8,
        }}
      >
        <Slide in direction="up">
          <Paper elevation={4} sx={{ p: 4, width: '100%', maxWidth: 400, borderRadius: 3 }}>
            <Box textAlign="center" mb={2}>
              <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
                <LockOutlined />
              </Avatar>
              <Typography variant="h5" fontWeight={600}>Đăng nhập</Typography>
              <Typography variant="body2" color="text.secondary">
                Vui lòng đăng nhập bằng tài khoản công ty
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
              label="Email"
              type="email"
              required
              fullWidth
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              label="Mật khẩu"
              type={showPass ? 'text' : 'password'}
              required
              fullWidth
              size="small"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowPass(!showPass)} edge="end">
                    {showPass ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />

            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
              label="Ghi nhớ đăng nhập"
              sx={{ mb: 2 }}
            />

            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Đăng nhập'}
            </Button>

            <Box textAlign="center" mt={2}>
              <Link href="#" underline="hover" variant="body2" color="primary">
                Quên mật khẩu?
              </Link>
            </Box>

            {/* Dark mode toggle */}
            <Box textAlign="center" mt={2}>
              <Button variant="text" size="small" onClick={colorMode.toggleColorMode}>
                Đổi chế độ nền
              </Button>
            </Box>

            {/* Footer */}
            <Box textAlign="center" mt={4} fontSize={12} color="text.secondary">
              © {new Date().getFullYear()} Công ty CPXD BÁCH KHOA. All rights reserved.
            </Box>
          </Paper>
        </Slide>
      </Box>
    </Box>
  );
}
