import React, { useState, useEffect, useContext } from 'react';
import {
  Box, TextField, Button, Alert, Typography, Paper, Avatar,
  FormControlLabel, Checkbox, Link, useMediaQuery, CircularProgress, Slide
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import logo from '../assets/logo.png';
import { ColorModeContext } from '../ThemeContext'; // Nếu có dark mode toggle

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const auth = getAuth();
  const isMobile = useMediaQuery('(max-width:768px)');
  const colorMode = useContext(ColorModeContext); // Nếu bạn có dark mode

  // Lấy email đã ghi nhớ (nếu có)
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
      if (remember) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      nav('/', { replace: true });
    } catch (err) {
      setError('Sai email hoặc mật khẩu!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
      {!isMobile && (
        <Box
          sx={{
            flex: 1,
            bgcolor: '#e3f2fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
          }}
        >
          <Box textAlign="center">
            <img src={logo} alt="logo" style={{ maxWidth: '300px', width: '100%' }} />
            <Typography mt={2} variant="h6" color="primary">
              Hệ thống quản trị công trình - Công ty Xây dựng
            </Typography>
          </Box>
        </Box>
      )}

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
        }}
      >
        <Slide in direction="up">
          <Paper elevation={4} sx={{ p: 4, width: '100%', maxWidth: 400, borderRadius: 3 }}>
            <Box textAlign="center" mb={2}>
              <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
                <LockOutlined />
              </Avatar>
              <Typography variant="h5" fontWeight={600}>Đăng nhập</Typography>
              <Typography variant="body2" color="text.secondary">Nhập thông tin để tiếp tục</Typography>
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
              type="password"
              required
              fullWidth
              size="small"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
              label="Ghi nhớ đăng nhập"
              sx={{ mb: 2 }}
            />

            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ mb: 2 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Đăng nhập'}
            </Button>

            <Box textAlign="center">
              <Link href="#" underline="hover" variant="body2" color="primary">
                Quên mật khẩu?
              </Link>
            </Box>

            {/* Optional: Toggle dark mode */}
            <Box textAlign="center" mt={2}>
              <Button variant="text" size="small" onClick={colorMode.toggleColorMode}>
                Đổi chế độ nền
              </Button>
            </Box>
          </Paper>
        </Slide>
      </Box>
    </Box>
  );
}
