// src/pages/auth/PleaseVerifyEmail.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Stack, Avatar, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { getAuth, onIdTokenChanged, sendEmailVerification, signOut } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { styled, alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import { MarkEmailRead, Refresh, Logout, Send } from "@mui/icons-material";

/* ====== BRAND ====== */
const BRAND = {
  primary: "#0D47A1",
  accent: "#E63946",
  success: "#4CAF50",
  bgImage: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop",
};

/* ====== Styled Components ====== */
const GlassPaper = styled(Paper)(({ theme }) => ({
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  backgroundColor: alpha("#0B1320", 0.75),
  border: `1px solid ${alpha(BRAND.accent, 0.2)}`,
  boxShadow: `
    0 8px 32px 0 rgba(0, 0, 0, 0.37),
    inset 0 1px 0 0 ${alpha("#fff", 0.1)}
  `,
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "1px",
    background: `linear-gradient(90deg, transparent, ${alpha(BRAND.accent, 0.5)}, transparent)`,
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.95rem",
  padding: "10px 20px",
  boxShadow: "none",
  "&:hover": {
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  }
}));

export default function PleaseVerifyEmail() {
  const { user } = useAuth();
  const auth = getAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = location.state?.from?.pathname || '/';

  const [isSending, setIsSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const triesRef = useRef(0);

  useEffect(() => {
    if (user?.emailVerified) {
      navigate(backTo, { replace: true });
    }
  }, [user?.emailVerified, backTo, navigate]);

  const softCheck = async () => {
    if (!auth?.currentUser || checkingRef.current) return;
    try {
      checkingRef.current = true;
      setChecking(true);
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        navigate(backTo, { replace: true });
      }
    } catch (e) {
      console.error('softCheck error', e);
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!auth) return;
    const unsub = onIdTokenChanged(auth, async (fbUser) => {
      if (!fbUser) return;
      await softCheck();
    });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    const onFocus = () => softCheck();
    const onVis = () => { if (document.visibilityState === 'visible') softCheck(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      if (triesRef.current >= 6) return clearInterval(id);
      triesRef.current += 1;
      await softCheck();
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const handleResendEmail = async () => {
    if (!auth.currentUser) return;
    setIsSending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success('Đã gửi lại email xác thực.');
    } catch (error) {
      toast.error('Không thể gửi lại email. Vui lòng thử lại sau.');
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login', { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url(${BRAND.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(0,20,40,.95) 0%, rgba(13,71,161,.75) 50%, rgba(0,20,40,.85) 100%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 500, padding: 20, position: 'relative', zIndex: 1 }}
      >
        <GlassPaper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 6,
            textAlign: 'center'
          }}
        >
          <Avatar
            sx={{
              bgcolor: alpha(BRAND.success, 0.2),
              color: BRAND.success,
              width: 80,
              height: 80,
              mx: "auto",
              mb: 3,
              boxShadow: `0 8px 24px ${alpha(BRAND.success, 0.2)}`
            }}
          >
            <MarkEmailRead sx={{ fontSize: 40 }} />
          </Avatar>

          <Typography variant="h4" fontWeight={800} color="#fff" gutterBottom>
            Xác thực Email
          </Typography>

          <Typography color={alpha("#fff", 0.7)} sx={{ mb: 4, lineHeight: 1.6 }}>
            Chúng tôi đã gửi liên kết xác thực đến<br />
            <Typography component="span" fontWeight={700} color="#fff">
              {user?.email}
            </Typography>
          </Typography>

          <Stack spacing={2}>
            <StyledButton
              variant="contained"
              onClick={handleResendEmail}
              disabled={isSending}
              startIcon={!isSending && <Send />}
              sx={{
                bgcolor: BRAND.primary,
                color: "#fff",
                "&:hover": { bgcolor: alpha(BRAND.primary, 0.9) }
              }}
            >
              {isSending ? <CircularProgress size={24} color="inherit" /> : 'Gửi lại email xác thực'}
            </StyledButton>

            <StyledButton
              variant="outlined"
              onClick={() => softCheck()}
              disabled={checking}
              startIcon={!checking && <Refresh />}
              sx={{
                borderColor: alpha("#fff", 0.3),
                color: "#fff",
                "&:hover": { borderColor: "#fff", bgcolor: alpha("#fff", 0.05) }
              }}
            >
              {checking ? <CircularProgress size={20} color="inherit" /> : 'Tôi đã xác thực • Làm mới'}
            </StyledButton>

            <Button
              onClick={handleLogout}
              startIcon={<Logout />}
              sx={{
                color: alpha("#fff", 0.5),
                textTransform: "none",
                "&:hover": { color: "#fff", bgcolor: "transparent" }
              }}
            >
              Đăng xuất
            </Button>
          </Stack>
        </GlassPaper>
      </motion.div>
    </Box>
  );
}
