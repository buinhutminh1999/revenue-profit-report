// src/pages/LoginPage.jsx - Enhanced Modern Version
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Box, Stack, Paper, Avatar, Typography, TextField, Button, Alert,
  Checkbox, FormControlLabel, Link as MUILink, CircularProgress, IconButton,
  InputAdornment, Divider, Chip, Fade, Zoom, Tooltip, LinearProgress,
  useMediaQuery
} from "@mui/material";
import { styled, alpha, useTheme } from "@mui/material/styles";
import {
  Business, Visibility, VisibilityOff, MailOutline, VpnKeyOutlined,
  Google as GoogleIcon, ErrorOutline, CheckCircleOutline, LockOutlined
} from "@mui/icons-material";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getAuth,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
} from "firebase/auth";

import logo from "../../assets/logo.webp";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../../schemas/authSchema";

/* ====== BRAND ====== */
const BRAND = {
  primary: "#0D47A1",
  accent: "#E63946",
  success: "#4CAF50",
  bgImage: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop",
};

/* ====== Helper: map Firebase Auth error codes -> user-friendly text ====== */
const mapAuthError = (code) => {
  switch (code) {
    case "auth/invalid-email": return "Email không hợp lệ.";
    case "auth/user-disabled": return "Tài khoản đã bị vô hiệu hoá.";
    case "auth/user-not-found":
    case "auth/wrong-password": return "Email hoặc mật khẩu không đúng.";
    case "auth/too-many-requests": return "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.";
    case "auth/network-request-failed": return "Lỗi mạng. Kiểm tra kết nối Internet.";
    default: return "Không đăng nhập được. Vui lòng thử lại.";
  }
};

/* ====== Email validation ====== */
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/* ====== Enhanced Styled Components ====== */
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

export default function LoginPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // ====== State ======
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [capsOn, setCapsOn] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  // ====== React Hook Form ======
  const { register, handleSubmit, formState: { errors, isSubmitting }, control, setValue } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: true
    }
  });

  // ====== Refs ======
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const containerRef = useRef(null);

  // ====== Router & Firebase ======
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const rawRedirect = new URLSearchParams(location.search).get("redirect");
  const decodedRedirect = rawRedirect ? decodeURIComponent(rawRedirect) : null;
  const safeRedirect = decodedRedirect && decodedRedirect.startsWith("/") ? decodedRedirect : "/";

  // ====== Parallax refs/values ======
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [8, -8]);
  const rotateY = useTransform(mouseX, [-300, 300], [-8, 8]);
  const bgX = useTransform(mouseX, [-500, 500], [20, -20]);
  const bgY = useTransform(mouseY, [-500, 500], [15, -15]);

  const onMouseMove = ({ clientX, clientY }) => {
    if (prefersReduced) return;
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseX.set(clientX - r.left - r.width / 2);
    mouseY.set(clientY - r.top - r.height / 2);
  };
  const onMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  // ====== Init ======
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setValue("email", rememberedEmail);
    }
    const remembered = localStorage.getItem("remember") === "1";
    setValue("remember", remembered);

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setPrefersReduced(!!mq?.matches);
    const listener = (e) => setPrefersReduced(e.matches);
    mq?.addEventListener?.("change", listener);
    return () => mq?.removeEventListener?.("change", listener);
  }, []);

  // ====== Auto focus email on mount ======
  useEffect(() => {
    const timer = setTimeout(() => {
      emailInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // ====== Redirect if already signed in ======
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) navigate(safeRedirect, { replace: true });
    });
    return () => unsub();
  }, [auth, navigate, safeRedirect]);

  // ====== Submit handler ======
  const onSubmit = async (data) => {
    setError("");
    setLoading(true);

    try {
      await setPersistence(auth, data.remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, data.email.trim(), data.password);

      if (data.remember) {
        localStorage.setItem("rememberedEmail", data.email.trim());
        localStorage.setItem("remember", "1");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("remember");
      }

      navigate(safeRedirect, { replace: true });
    } catch (err) {
      setError(mapAuthError(err?.code));
      // Auto focus password on wrong password
      if (err?.code === "auth/wrong-password" || err?.code === "auth/user-not-found") {
        setTimeout(() => passwordInputRef.current?.focus(), 100);
      }
    } finally {
      setLoading(false);
    }
  };

  // ====== Handle Enter key ======
  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter" && !loading) {
      // handleSubmit(onSubmit)(e); // This is handled by form onSubmit
    }
  }, [loading]);

  // ====== Motion variants ======
  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    },
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        mass: 0.8
      }
    },
  }), []);

  const logoVariants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.5, rotate: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 80,
        damping: 12,
        delay: 0.2
      }
    },
  }), []);

  return (
    <Box
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      sx={{
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        perspective: "1500px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {/* Animated Background */}
      <motion.div
        style={prefersReduced ? {} : {
          x: bgX,
          y: bgY,
          position: "absolute",
          inset: "-10%",
          willChange: "transform"
        }}
      >
        <Box
          sx={{
            width: "120%",
            height: "120%",
            backgroundImage: `url(${BRAND.bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(0,20,40,.95) 0%, rgba(13,71,161,.75) 50%, rgba(0,20,40,.85) 100%)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 30% 50%, rgba(13,71,161,0.3) 0%, transparent 50%)",
            }
          }}
        />
      </motion.div>

      {/* Animated particles effect */}
      {!prefersReduced && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              style={{
                position: "absolute",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: alpha("#fff", 0.3),
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            />
          ))}
        </Box>
      )}

      <Stack
        direction={{ xs: "column", md: "row" }}
        sx={{
          width: "100%",
          minHeight: "100vh",
          maxWidth: 1400,
          mx: "auto",
          position: "relative",
          zIndex: 1,
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 1.5, sm: 3, md: 4 },
          py: { xs: 3, sm: 4 }
        }}
      >
        {/* Left brand column */}
        <Box
          sx={{
            flex: 1,
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            textAlign: "center",
            p: { xs: 2, md: 4 },
          }}
        >
          <motion.div
            variants={logoVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.img
              src={logo}
              alt="Logo Công ty Bách Khoa"
              style={{
                width: 240,
                height: 240,
                objectFit: "contain",
                filter: "drop-shadow(0 12px 24px rgba(0,0,0,.5))",
              }}
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                textShadow: "2px 3px 12px rgba(0,0,0,.6)",
                background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 1
              }}
            >
              HỆ THỐNG QUẢN TRỊ
            </Typography>
            <Typography variant="h5" sx={{ mt: 1, fontWeight: 500 }}>
              Công ty CPXD Bách Khoa
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mt: 2,
                fontStyle: "italic",
                opacity: 0.9,
                fontSize: "1.1rem"
              }}
            >
              "Xây bền vững – Dựng thành công."
            </Typography>
          </motion.div>
        </Box>

        {/* Right form column */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 0, sm: 2, md: 4 },
            width: "100%",
            maxWidth: { xs: "100%", sm: 480 }
          }}
        >
          <motion.div
            style={prefersReduced || isMobile ? {} : {
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
              willChange: "transform"
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <GlassPaper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5, md: 4.5 },
                width: "100%",
                maxWidth: { xs: "100%", sm: 480 },
                borderRadius: { xs: 3, sm: 4, md: 6 },
                position: "relative",
                ...(loading && { pointerEvents: "none", opacity: 0.9 }),
                boxShadow: theme.palette.mode === 'light'
                  ? "0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255,255,255,0.1)"
                  : "0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255,255,255,0.1)",
              }}
            >
              {/* Loading overlay */}
              {isSubmitting && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    borderRadius: "6px 6px 0 0",
                    overflow: "hidden",
                  }}
                >
                  <LinearProgress
                    sx={{
                      height: 3,
                      backgroundColor: alpha(BRAND.primary, 0.2),
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: BRAND.primary,
                      }
                    }}
                  />
                </Box>
              )}

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ transform: "translateZ(40px)" }}
              >
                <Box
                  component="form"
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  onKeyPress={handleKeyPress}
                >
                  <Stack spacing={3}>
                    {/* Title */}
                    <motion.div variants={itemVariants}>
                      <Stack alignItems="center" mb={1}>
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
                              background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
                              color: "#fff",
                              width: { xs: 56, sm: 64 },
                              height: { xs: 56, sm: 64 },
                              mb: 1.5,
                              boxShadow: `0 8px 24px ${alpha(BRAND.primary, 0.4)}`,
                              border: `2px solid ${alpha("#fff", 0.2)}`,
                            }}
                          >
                            <LockOutlined sx={{ fontSize: { xs: 28, sm: 32 } }} />
                          </Avatar>
                        </motion.div>
                        <Typography
                          variant={isMobile ? "h5" : "h4"}
                          fontWeight={800}
                          color="#fff"
                          sx={{ 
                            mb: 0.5,
                            background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.9) 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          Đăng nhập
                        </Typography>
                        <Typography
                          variant="body2"
                          color={alpha("#fff", 0.7)}
                          sx={{ fontSize: { xs: "0.875rem", sm: "0.95rem" } }}
                        >
                          Sử dụng tài khoản công ty để tiếp tục
                        </Typography>
                      </Stack>
                    </motion.div>

                    {/* Error Alert */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -10, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Alert
                            severity="error"
                            variant="filled"
                            icon={<ErrorOutline />}
                            sx={{
                              borderRadius: 2,
                              "& .MuiAlert-message": { fontWeight: 500 }
                            }}
                          >
                            {error}
                          </Alert>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Email */}
                    <motion.div variants={itemVariants}>
                      <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                          <StyledTextField
                            {...field}
                            inputRef={(e) => {
                              field.ref(e);
                              emailInputRef.current = e;
                            }}
                            label="Email công ty"
                            type="email"
                            fullWidth
                            required
                            autoComplete="username"
                            error={!!errors.email}
                            success={!errors.email && field.value}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <MailOutline sx={{ color: errors.email ? BRAND.accent : (!errors.email && field.value) ? BRAND.success : alpha("#fff", 0.55) }} />
                                </InputAdornment>
                              ),
                              endAdornment: !errors.email && field.value && (
                                <InputAdornment position="end">
                                  <CheckCircleOutline sx={{ color: BRAND.success, fontSize: 20 }} />
                                </InputAdornment>
                              ),
                            }}
                            helperText={errors.email?.message || " "}
                            FormHelperTextProps={{
                              sx: {
                                color: errors.email ? BRAND.accent : alpha("#fff", 0.4),
                                fontSize: "0.75rem"
                              }
                            }}
                          />
                        )}
                      />
                    </motion.div>

                    {/* Password */}
                    <motion.div variants={itemVariants}>
                      <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                          <StyledTextField
                            {...field}
                            inputRef={(e) => {
                              field.ref(e);
                              passwordInputRef.current = e;
                            }}
                            label="Mật khẩu"
                            type={showPass ? "text" : "password"}
                            fullWidth
                            required
                            autoComplete="current-password"
                            onKeyUp={(e) => setCapsOn(e.getModifierState?.("CapsLock") || false)}
                            error={!!errors.password}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <VpnKeyOutlined sx={{ color: alpha("#fff", 0.55) }} />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <InputAdornment position="end">
                                  <Tooltip title={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                                    <IconButton
                                      aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                      onClick={() => setShowPass(v => !v)}
                                      edge="end"
                                      sx={{ color: alpha("#fff", 0.8) }}
                                    >
                                      {showPass ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                  </Tooltip>
                                </InputAdornment>
                              ),
                            }}
                            helperText={errors.password?.message || (capsOn ? "⚠ Caps Lock đang bật" : " ")}
                            FormHelperTextProps={{
                              sx: {
                                color: errors.password ? BRAND.accent : (capsOn ? BRAND.accent : alpha("#fff", 0.4)),
                                fontSize: "0.75rem"
                              }
                            }}
                          />
                        )}
                      />
                    </motion.div>

                    {/* Remember / Forgot */}
                    <motion.div variants={itemVariants}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                        <Controller
                          name="remember"
                          control={control}
                          render={({ field }) => (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  {...field}
                                  checked={field.value}
                                  sx={{
                                    color: alpha("#fff", 0.7),
                                    "&.Mui-checked": { color: BRAND.accent },
                                    "&:hover": { backgroundColor: alpha(BRAND.accent, 0.1) }
                                  }}
                                />
                              }
                              label={
                                <Typography color="#fff" variant="body2" sx={{ fontSize: "0.875rem" }}>
                                  Ghi nhớ đăng nhập
                                </Typography>
                              }
                            />
                          )}
                        />
                        <MUILink
                          component="button"
                          type="button"
                          variant="body2"
                          onClick={() => navigate("/forgot-password")}
                          sx={{
                            color: BRAND.accent,
                            fontWeight: 600,
                            textDecoration: "none",
                            "&:hover": { textDecoration: "underline" }
                          }}
                        >
                          Quên mật khẩu?
                        </MUILink>
                      </Stack>
                    </motion.div>

                    {/* Submit */}
                    <motion.div variants={itemVariants}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <StyledButton
                          type="submit"
                          variant="contained"
                          fullWidth
                          size={isMobile ? "medium" : "large"}
                          disabled={loading || isSubmitting}
                          sx={{
                            py: { xs: 1.5, sm: 1.75 },
                            fontWeight: 700,
                            fontSize: { xs: "0.95rem", sm: "1.05rem" },
                            borderRadius: { xs: 2, sm: 3 },
                            background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${alpha(BRAND.primary, 0.8)} 100%)`,
                            bgcolor: BRAND.primary,
                            color: "#fff",
                            textTransform: "none",
                            boxShadow: `0 4px 14px ${alpha(BRAND.primary, 0.4)}`,
                            position: "relative",
                            overflow: "hidden",
                            "&:hover": {
                              background: `linear-gradient(135deg, ${alpha(BRAND.primary, 0.95)} 0%, ${alpha(BRAND.primary, 0.85)} 100%)`,
                              boxShadow: `0 8px 24px ${alpha(BRAND.primary, 0.5)}`,
                              transform: "translateY(-2px)",
                            },
                            "&:active": {
                              transform: "translateY(0)",
                            },
                            "&:disabled": {
                              bgcolor: alpha(BRAND.primary, 0.5),
                              color: alpha("#fff", 0.7),
                              transform: "none",
                            },
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        >
                          {loading ? (
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <CircularProgress size={20} sx={{ color: "#fff" }} />
                              <Typography variant="body2">Đang đăng nhập...</Typography>
                            </Stack>
                          ) : (
                            "Đăng nhập"
                          )}
                        </StyledButton>
                      </motion.div>
                    </motion.div>

                    {/* SSO divider + Google */}
                    <motion.div variants={itemVariants}>
                      <Divider sx={{ my: 1 }}>
                        <Chip
                          label="hoặc"
                          size="small"
                          sx={{
                            color: alpha("#fff", 0.6),
                            borderColor: alpha("#fff", 0.3),
                            bgcolor: "transparent"
                          }}
                          variant="outlined"
                        />
                      </Divider>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<GoogleIcon />}
                          onClick={() => {
                            // TODO: Implement Google SSO
                            console.log("Google SSO clicked");
                          }}
                          disabled={loading}
                          sx={{
                            mt: 1.5,
                            py: 1.5,
                            color: "#fff",
                            borderColor: alpha("#fff", 0.35),
                            borderWidth: 1.5,
                            borderRadius: 3,
                            textTransform: "none",
                            fontWeight: 600,
                            "&:hover": {
                              borderColor: "#fff",
                              backgroundColor: alpha("#fff", 0.1),
                              boxShadow: `0 4px 12px ${alpha("#fff", 0.2)}`
                            },
                            "&:disabled": {
                              borderColor: alpha("#fff", 0.2),
                              color: alpha("#fff", 0.4)
                            }
                          }}
                        >
                          Đăng nhập với Google
                        </Button>
                      </motion.div>
                    </motion.div>
                  </Stack>
                </Box>
              </motion.div>
            </GlassPaper>
          </motion.div>
        </Box>
      </Stack>
    </Box>
  );
}
