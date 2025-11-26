// src/pages/auth/FinishSetupPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, updatePassword } from "firebase/auth";
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Stack, Paper, Typography, TextField, Button, Alert,
  CircularProgress, InputAdornment, IconButton, LinearProgress,
  Avatar
} from "@mui/material";
import { styled, alpha, useTheme } from "@mui/material/styles";
import {
  LockReset, Visibility, VisibilityOff, VpnKeyOutlined,
  CheckCircleOutline, ErrorOutline
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from '../../components/common/LoadingScreen';

/* ====== BRAND ====== */
const BRAND = {
  primary: "#0D47A1",
  accent: "#E63946",
  success: "#4CAF50",
  bgImage: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop",
};

/* ====== Styled Components ====== */
const StyledTextField = styled(TextField)(({ theme, error, success }) => ({
  "& label": { color: alpha("#fff", 0.7) },
  "& label.Mui-focused": { color: success ? BRAND.success : error ? BRAND.accent : BRAND.accent },
  "& .MuiInputBase-input": {
    color: alpha("#fff", 0.95),
    "&::placeholder": { color: alpha("#fff", 0.5), opacity: 1 }
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: 14,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "& fieldset": {
      borderColor: error ? BRAND.accent : success ? BRAND.success : alpha("#fff", 0.3),
      borderWidth: 1.5,
    },
    "&:hover fieldset": {
      borderColor: error ? BRAND.accent : success ? BRAND.success : alpha("#fff", 0.55),
    },
    "&.Mui-focused fieldset": {
      borderColor: error ? BRAND.accent : success ? BRAND.success : BRAND.accent,
      borderWidth: 2,
      boxShadow: `0 0 0 4px ${alpha(error ? BRAND.accent : success ? BRAND.success : BRAND.accent, 0.1)}`,
    },
  },
}));

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
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "-100%",
    width: "100%",
    height: "100%",
    background: `linear-gradient(90deg, transparent, ${alpha("#fff", 0.2)}, transparent)`,
    transition: "left 0.5s",
  },
  "&:hover::before": {
    left: "100%",
  }
}));

export default function FinishSetupPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    const auth = getAuth();
    if (auth.currentUser) {
      try {
        await updatePassword(auth.currentUser, password);
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } catch (err) {
        setError('Không thể cập nhật mật khẩu. Vui lòng thử lại.');
        console.error(err);
      }
    } else {
      setError('Không tìm thấy thông tin người dùng. Link có thể đã hết hạn.');
    }
    setLoading(false);
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

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
        style={{ width: '100%', maxWidth: 480, padding: 20, position: 'relative', zIndex: 1 }}
      >
        <GlassPaper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4.5 },
            borderRadius: 6,
            position: "relative",
          }}
        >
          {loading && (
            <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "6px 6px 0 0", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 3, backgroundColor: alpha(BRAND.primary, 0.2), "& .MuiLinearProgress-bar": { backgroundColor: BRAND.primary } }} />
            </Box>
          )}

          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            {/* Header */}
            <Stack alignItems="center" mb={1}>
              <Avatar
                sx={{
                  bgcolor: BRAND.primary,
                  color: "#fff",
                  width: 64,
                  height: 64,
                  mb: 2,
                  boxShadow: `0 8px 24px ${alpha(BRAND.primary, 0.4)}`
                }}
              >
                <LockReset sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography variant="h4" fontWeight={800} color="#fff" align="center">
                {success ? "Thành công!" : "Tạo mật khẩu"}
              </Typography>
              <Typography variant="body2" color={alpha("#fff", 0.7)} align="center" sx={{ mt: 1 }}>
                {success
                  ? "Đang chuyển hướng về trang chủ..."
                  : `Chào ${user?.displayName || 'bạn'}, vui lòng tạo mật khẩu mới.`}
              </Typography>
            </Stack>

            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                >
                  <Alert severity="error" variant="filled" icon={<ErrorOutline />} sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {!success && (
              <>
                <StyledTextField
                  label="Mật khẩu mới"
                  type={showPass ? "text" : "password"}
                  fullWidth
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <VpnKeyOutlined sx={{ color: alpha("#fff", 0.55) }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPass(!showPass)} edge="end" sx={{ color: alpha("#fff", 0.8) }}>
                          {showPass ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <StyledTextField
                  label="Xác nhận mật khẩu"
                  type={showConfirmPass ? "text" : "password"}
                  fullWidth
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <VpnKeyOutlined sx={{ color: alpha("#fff", 0.55) }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPass(!showConfirmPass)} edge="end" sx={{ color: alpha("#fff", 0.8) }}>
                          {showConfirmPass ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <StyledButton
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.75,
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    borderRadius: 3,
                    bgcolor: BRAND.primary,
                    color: "#fff",
                    boxShadow: `0 4px 14px ${alpha(BRAND.primary, 0.4)}`,
                    "&:hover": {
                      bgcolor: alpha(BRAND.primary, 0.9),
                      boxShadow: `0 8px 24px ${alpha(BRAND.primary, 0.5)}`,
                    }
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : "Hoàn tất"}
                </StyledButton>
              </>
            )}

            {success && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}
              >
                <CheckCircleOutline sx={{ fontSize: 80, color: BRAND.success }} />
              </motion.div>
            )}
          </Stack>
        </GlassPaper>
      </motion.div>
    </Box>
  );
}