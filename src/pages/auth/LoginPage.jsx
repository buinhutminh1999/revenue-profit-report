// src/pages/LoginPage.jsx - Enhanced Modern Version
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Box, Stack, Paper, Avatar, Typography, TextField, Button, Alert,
  Checkbox, FormControlLabel, Link as MUILink, CircularProgress, IconButton,
  InputAdornment, Divider, Chip, Fade, Zoom, Tooltip, LinearProgress
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

import logo from "../../assets/logo.png";

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
  },
}));

export default function LoginPage() {
  const theme = useTheme();
  // ====== State ======
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [capsOn, setCapsOn] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // ====== Email validation ======
  useEffect(() => {
    if (emailTouched && email) {
      if (!isValidEmail(email)) {
        setEmailError("Email không hợp lệ");
      } else {
        setEmailError("");
      }
    } else {
      setEmailError("");
    }
  }, [email, emailTouched]);

  // ====== Init ======
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setEmailTouched(true);
    }
    const remembered = localStorage.getItem("remember") === "1";
    if (remembered) setRemember(true);

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
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (loading || isSubmitting) return;

    setEmailTouched(true);

    // Validate email
    if (!email.trim()) {
      setEmailError("Vui lòng nhập email");
      emailInputRef.current?.focus();
      return;
    }
    if (!isValidEmail(email.trim())) {
      setEmailError("Email không hợp lệ");
      emailInputRef.current?.focus();
      return;
    }
    if (!pass) {
      passwordInputRef.current?.focus();
      return;
    }

    setError("");
    setLoading(true);
    setIsSubmitting(true);

    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), pass);

      if (remember) {
        localStorage.setItem("rememberedEmail", email.trim());
        localStorage.setItem("remember", "1");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("remember");
      }

      navigate(safeRedirect, { replace: true });
    } catch (err) {
      setError(mapAuthError(err?.code));
      setIsSubmitting(false);
      // Auto focus password on wrong password
      if (err?.code === "auth/wrong-password" || err?.code === "auth/user-not-found") {
        setTimeout(() => passwordInputRef.current?.focus(), 100);
      }
    } finally {
      setLoading(false);
    }
  }, [auth, email, pass, remember, loading, isSubmitting, navigate, safeRedirect]);

  // ====== Handle Enter key ======
  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter" && !loading) {
      handleSubmit(e);
    }
  }, [loading, handleSubmit]);

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
          px: { xs: 2, sm: 4 }
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
            p: 4,
          }}
        >
          <motion.div
            variants={logoVariants}
            initial="hidden"
            animate="visible"
          >
            <img
              src={logo}
              alt="Logo Công ty Bách Khoa"
              style={{
                width: 240,
                height: 240,
                objectFit: "contain",
                filter: "drop-shadow(0 12px 24px rgba(0,0,0,.5))",
                transition: "transform 0.3s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
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
            p: { xs: 2, sm: 4 },
            width: "100%"
          }}
        >
          <motion.div
            style={prefersReduced ? {} : {
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
              willChange: "transform"
            }}
          >
            <GlassPaper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 4.5 },
                width: "100%",
                maxWidth: 480,
                borderRadius: 6,
                position: "relative",
                ...(loading && { pointerEvents: "none", opacity: 0.9 }),
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
                  onSubmit={handleSubmit}
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
                              bgcolor: BRAND.primary,
                              color: "#fff",
                              width: 64,
                              height: 64,
                              mb: 1.5,
                              boxShadow: `0 8px 24px ${alpha(BRAND.primary, 0.4)}`
                            }}
                          >
                            <LockOutlined sx={{ fontSize: 32 }} />
                          </Avatar>
                        </motion.div>
                        <Typography
                          variant="h4"
                          fontWeight={800}
                          color="#fff"
                          sx={{ mb: 0.5 }}
                        >
                          Đăng nhập
                        </Typography>
                        <Typography
                          variant="body2"
                          color={alpha("#fff", 0.7)}
                          sx={{ fontSize: "0.95rem" }}
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
                      <StyledTextField
                        inputRef={emailInputRef}
                        label="Email công ty"
                        type="email"
                        fullWidth
                        required
                        autoComplete="username"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        onBlur={() => setEmailTouched(true)}
                        error={!!emailError}
                        success={emailTouched && email && !emailError}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <MailOutline sx={{ color: emailError ? BRAND.accent : emailTouched && email && !emailError ? BRAND.success : alpha("#fff", 0.55) }} />
                            </InputAdornment>
                          ),
                          endAdornment: emailTouched && email && !emailError && (
                            <InputAdornment position="end">
                              <CheckCircleOutline sx={{ color: BRAND.success, fontSize: 20 }} />
                            </InputAdornment>
                          ),
                        }}
                        helperText={emailError || " "}
                        FormHelperTextProps={{
                          sx: {
                            color: emailError ? BRAND.accent : alpha("#fff", 0.4),
                            fontSize: "0.75rem"
                          }
                        }}
                      />
                    </motion.div>

                    {/* Password */}
                    <motion.div variants={itemVariants}>
                      <StyledTextField
                        inputRef={passwordInputRef}
                        label="Mật khẩu"
                        type={showPass ? "text" : "password"}
                        fullWidth
                        required
                        autoComplete="current-password"
                        value={pass}
                        onChange={(e) => {
                          setPass(e.target.value);
                          setError("");
                        }}
                        onKeyUp={(e) => setCapsOn(e.getModifierState?.("CapsLock") || false)}
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
                        helperText={capsOn ? "⚠ Caps Lock đang bật" : " "}
                        FormHelperTextProps={{
                          sx: {
                            color: capsOn ? BRAND.accent : alpha("#fff", 0.4),
                            fontSize: "0.75rem"
                          }
                        }}
                      />
                    </motion.div>

                    {/* Remember / Forgot */}
                    <motion.div variants={itemVariants}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={remember}
                              onChange={(e) => setRemember(e.target.checked)}
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
                          size="large"
                          disabled={loading || isSubmitting}
                          sx={{
                            py: 1.75,
                            fontWeight: 700,
                            fontSize: "1.05rem",
                            borderRadius: 3,
                            bgcolor: BRAND.primary,
                            color: "#fff",
                            textTransform: "none",
                            boxShadow: `0 4px 14px ${alpha(BRAND.primary, 0.4)}`,
                            "&:hover": {
                              bgcolor: alpha(BRAND.primary, 0.9),
                              boxShadow: `0 8px 24px ${alpha(BRAND.primary, 0.5)}`,
                            },
                            "&:disabled": {
                              bgcolor: alpha(BRAND.primary, 0.5),
                              color: alpha("#fff", 0.7)
                            }
                          }}
                        >
                          {loading ? (
                            <CircularProgress size={24} sx={{ color: "#fff" }} />
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
