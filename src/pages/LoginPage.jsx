// src/pages/LoginPage.jsx (refactor)
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Box, Stack, Paper, Avatar, Typography, TextField, Button, Alert,
  Checkbox, FormControlLabel, Link as MUILink, CircularProgress, IconButton,
  InputAdornment, Divider, Chip
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import {
  Business, Visibility, VisibilityOff, MailOutline, VpnKeyOutlined,
  Google as GoogleIcon,
} from "@mui/icons-material";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";

import {
  getAuth,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
} from "firebase/auth";

import logo from "../assets/logo.png";

/* ====== BRAND ====== */
const BRAND = {
  primary: "#0D47A1",     // xanh chủ đạo
  accent:  "#E63946",     // đỏ nhấn
  bgImage:
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop",
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

/* ====== Styled inputs (ERP clean) ====== */
const StyledTextField = styled(TextField)(({ theme }) => ({
  "& label": { color: alpha("#fff", 0.7) },
  "& label.Mui-focused": { color: BRAND.accent },
  "& .MuiInputBase-input": { color: alpha("#fff", 0.95) },
  "& .MuiOutlinedInput-root": {
    borderRadius: 12,
    "& fieldset": { borderColor: alpha("#fff", 0.3) },
    "&:hover fieldset": { borderColor: alpha("#fff", 0.55) },
    "&.Mui-focused fieldset": { borderColor: BRAND.accent, borderWidth: 2 },
  },
}));

export default function LoginPage() {
  // ====== State ======
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [capsOn, setCapsOn] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  // ====== Router & Firebase ======
  const navigate = useNavigate();
  const auth = getAuth();

  // ====== Parallax refs/values ======
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);
  const bgX = useTransform(mouseX, [-500, 500], [25, -25]);
  const bgY = useTransform(mouseY, [-500, 500], [15, -15]);

  const onMouseMove = ({ clientX, clientY }) => {
    if (prefersReduced) return; // tắt nếu user chọn giảm chuyển động
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseX.set(clientX - r.left - r.width / 2);
    mouseY.set(clientY - r.top - r.height / 2);
  };
  const onMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  // ====== Init: read remember/email; detect prefers-reduced-motion ======
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) setEmail(rememberedEmail);
    const remembered = localStorage.getItem("remember") === "1";
    if (remembered) setRemember(true);

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setPrefersReduced(!!mq?.matches);
    const listener = (e) => setPrefersReduced(e.matches);
    mq?.addEventListener?.("change", listener);
    return () => mq?.removeEventListener?.("change", listener);
  }, []);

  // ====== Redirect if already signed in ======
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) navigate("/", { replace: true });
    });
    return () => unsub();
  }, [auth, navigate]);

  // ====== Submit handler ======
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
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

      navigate("/", { replace: true });
    } catch (err) {
      setError(mapAuthError(err?.code));
    } finally {
      setLoading(false);
    }
  }, [auth, email, pass, remember, loading, navigate]);

  // ====== Motion variants ======
  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }), []);
  const itemVariants = useMemo(() => ({
    hidden: { y: 18, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 16 } },
  }), []);

  return (
    <Box
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      sx={{ minHeight: "100vh", width: "100%", position: "relative", overflow: "hidden", perspective: "1500px" }}
    >
      {/* Background */}
      <motion.div style={prefersReduced ? {} : { x: bgX, y: bgY, position: "absolute", inset: "-5%", willChange: "transform" }}>
        <Box
          sx={{
            width: "110%", height: "110%",
            backgroundImage: `url(${BRAND.bgImage})`,
            backgroundSize: "cover", backgroundPosition: "center",
            position: "relative",
            "&::before": {
              content: '""', position: "absolute", inset: 0,
              background: "linear-gradient(80deg, rgba(0,20,40,.92) 40%, rgba(13,71,161,.65))",
            },
          }}
        />
      </motion.div>

      <Stack
        direction={{ xs: "column", md: "row" }}
        sx={{ width: "100%", minHeight: "100vh", maxWidth: 1400, mx: "auto", position: "relative", zIndex: 1, alignItems: "center" }}
      >
        {/* Left brand column */}
        <Box
          sx={{
            flex: 1, display: { xs: "none", md: "flex" }, flexDirection: "column",
            alignItems: "center", justifyContent: "center", color: "white", textAlign: "center", p: 4,
          }}
        >
          <motion.div initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .6, type: "spring" }}>
            <img
              src={logo} alt="Logo Công ty Bách Khoa"
              style={{ width: 240, height: 240, objectFit: "contain", filter: "drop-shadow(0 12px 18px rgba(0,0,0,.35))" }}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .1 }}>
            <Typography variant="h3" fontWeight={800} sx={{ textShadow: "2px 3px 10px rgba(0,0,0,.45)" }}>
              HỆ THỐNG QUẢN TRỊ
            </Typography>
            <Typography variant="h5" sx={{ mt: 1 }}>
              Công ty CPXD Bách Khoa
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, fontStyle: "italic", opacity: .85 }}>
              “Xây bền vững – Dựng thành công.”
            </Typography>
          </motion.div>
        </Box>

        {/* Right form column */}
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 4, width: "100%" }}>
          <motion.div style={prefersReduced ? {} : { rotateX, rotateY, transformStyle: "preserve-3d", willChange: "transform" }}>
            <Paper
              elevation={16}
              sx={{
                p: { xs: 3, sm: 4 }, width: "100%", maxWidth: 460, borderRadius: 5,
                backdropFilter: "blur(10px)", backgroundColor: alpha("#0B1320", 0.7),
                border: `1px solid ${alpha(BRAND.accent, 0.35)}`, boxShadow: "0 18px 46px rgba(0,0,0,.5)",
                ...(loading && { pointerEvents: "none", opacity: 0.95 }),
              }}
            >
              <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ transform: "translateZ(40px)" }}>
                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <Stack spacing={2.4}>
                    {/* Title */}
                    <motion.div variants={itemVariants}>
                      <Stack alignItems="center" mb={1}>
                        <Avatar sx={{ bgcolor: BRAND.primary, color: "#fff", width: 56, height: 56, mb: 1.2 }}>
                          <Business sx={{ fontSize: 28 }} />
                        </Avatar>
                        <Typography variant="h4" fontWeight={800} color="#fff">Đăng nhập</Typography>
                        <Typography variant="body2" color={alpha("#fff", .7)} mt={.5}>
                          Sử dụng tài khoản công ty để tiếp tục
                        </Typography>
                      </Stack>
                    </motion.div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <Alert severity="error" variant="filled">{error}</Alert>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Email */}
                    <motion.div variants={itemVariants}>
                      <StyledTextField
                        label="Email công ty"
                        type="email"
                        fullWidth
                        required
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <MailOutline sx={{ color: alpha("#fff", .55) }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </motion.div>

                    {/* Password */}
                    <motion.div variants={itemVariants}>
                      <StyledTextField
                        label="Mật khẩu"
                        type={showPass ? "text" : "password"}
                        fullWidth
                        required
                        autoComplete="current-password"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <VpnKeyOutlined sx={{ color: alpha("#fff", .55) }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                onClick={() => setShowPass(v => !v)}
                                edge="end"
                                sx={{ color: alpha("#fff", .8) }}
                              >
                                {showPass ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        helperText={capsOn ? "⚠︎ Caps Lock đang bật" : " "}
                        FormHelperTextProps={{ sx: { color: capsOn ? BRAND.accent : alpha("#fff", .4) } }}
                      />
                    </motion.div>

                    {/* Remember / Forgot */}
                    <motion.div variants={itemVariants}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={remember}
                              onChange={(e) => setRemember(e.target.checked)}
                              sx={{ color: BRAND.accent, "&.Mui-checked": { color: BRAND.accent } }}
                            />
                          }
                          label={<Typography color="#fff" variant="body2">Ghi nhớ</Typography>}
                        />
                        <MUILink
                          component="button"
                          variant="body2"
                          onClick={() => navigate("/forgot-password")}
                          sx={{ color: BRAND.accent, fontWeight: 700 }}
                        >
                          Quên mật khẩu?
                        </MUILink>
                      </Stack>
                    </motion.div>

                    {/* Submit */}
                    <motion.div variants={itemVariants}>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          fullWidth
                          size="large"
                          disabled={loading}
                          sx={{
                            py: 1.5, fontWeight: 800, fontSize: "1.05rem", borderRadius: 3,
                            bgcolor: BRAND.primary, color: "#fff",
                            "&:hover": { bgcolor: alpha(BRAND.primary, .92), boxShadow: `0 8px 22px ${alpha(BRAND.primary, .45)}` },
                          }}
                        >
                          {loading ? <CircularProgress size={26} sx={{ color: "#fff" }} /> : "Đăng nhập"}
                        </Button>
                      </motion.div>
                    </motion.div>

                    {/* SSO divider + Google (ẩn/hiện tuỳ cấu hình) */}
                    <motion.div variants={itemVariants}>
                      <Divider sx={{ my: 0.5 }}>
                        <Chip label="hoặc" size="small" sx={{ color: alpha("#fff", .6), borderColor: alpha("#fff", .3) }} variant="outlined" />
                      </Divider>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<GoogleIcon />}
                        onClick={() => { /* TODO: gắn Google SSO nếu cần: signInWithPopup(new GoogleAuthProvider()) */ }}
                        disabled={false /* đổi thành !isGoogleConfigured nếu bạn kiểm tra cấu hình */}
                        sx={{
                          mt: 1, color: "#fff", borderColor: alpha("#fff", .35),
                          "&:hover": { borderColor: "#fff", backgroundColor: alpha("#fff", .08) },
                        }}
                      >
                        Đăng nhập với Google
                      </Button>
                    </motion.div>
                  </Stack>
                </Box>
              </motion.div>
            </Paper>
          </motion.div>
        </Box>
      </Stack>
    </Box>
  );
}
