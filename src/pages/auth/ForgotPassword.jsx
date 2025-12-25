import React, { useState, useMemo, useEffect, useRef } from "react";
import {
    Box, Stack, Paper, Avatar, Typography, TextField, Button, Alert,
    InputAdornment, LinearProgress, Link as MUILink
} from "@mui/material";
import { styled, alpha, useTheme } from "@mui/material/styles";
import {
    MailOutline, LockResetOutlined, ArrowBack, CheckCircleOutline, ErrorOutline
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { useForm, Controller } from "react-hook-form";
import logo from "../../assets/logo.webp";

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

export default function ForgotPassword() {
    const navigate = useNavigate();
    const theme = useTheme();
    const functions = getFunctions(getApp(), "asia-southeast1");
    const sendPasswordResetEmailFn = httpsCallable(functions, "sendPasswordResetEmail");

    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const countdownRef = useRef(null);

    // Countdown timer effect
    useEffect(() => {
        if (countdown > 0) {
            countdownRef.current = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => clearTimeout(countdownRef.current);
    }, [countdown]);

    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: { email: "" }
    });

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        setSuccessMsg("");
        setErrorMsg("");
        try {
            await sendPasswordResetEmailFn({ email: data.email });
            setSuccessMsg(`Đã gửi email khôi phục mật khẩu đến ${data.email}. Vui lòng kiểm tra hộp thư (cả mục Spam/Junk).`);
            setCountdown(60); // Start 60 second countdown
        } catch (err) {
            console.error(err);
            const code = err?.code || err?.message || "";
            if (code.includes("not-found")) {
                setErrorMsg("Email này không tồn tại trong hệ thống.");
            } else if (code.includes("invalid")) {
                setErrorMsg("Email không hợp lệ.");
            } else {
                setErrorMsg("Có lỗi xảy ra. Vui lòng thử lại sau.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    }), []);

    const itemVariants = useMemo(() => ({
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
    }), []);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                width: "100%",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                backgroundImage: `url(${BRAND.bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {/* Dark Overlay */}
            <Box sx={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />

            <Stack
                direction={{ xs: "column", md: "row" }}
                sx={{ width: "100%", maxWidth: 1200, zIndex: 1, justifyContent: "center", alignItems: "center", p: 2 }}
            >
                {/* Left Side (Logo/Brand) - Hidden on Mobile for simplicity */}
                <Box sx={{ flex: 1, display: { xs: "none", md: "flex" }, flexDirection: "column", alignItems: "center", color: "white", textAlign: "center" }}>
                    <motion.img
                        src={logo} alt="Logo"
                        style={{ width: 200, marginBottom: 20, filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.5))" }}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    />
                    <Typography variant="h4" fontWeight={800}>QUẢN TRỊ HỆ THỐNG</Typography>
                    <Typography variant="body1" sx={{ opacity: 0.8 }}>Khôi phục quyền truy cập tài khoản của bạn</Typography>
                </Box>

                {/* Right Side (Form) */}
                <Box sx={{ flex: 1, display: "flex", justifyContent: "center", width: "100%" }}>
                    <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
                        <GlassPaper sx={{ p: 4, width: "100%", maxWidth: 450, borderRadius: 4 }}>
                            <Stack spacing={3} component="form" onSubmit={handleSubmit(onSubmit)}>
                                <Stack alignItems="center">
                                    <Avatar sx={{ bgcolor: BRAND.primary, mb: 2, width: 56, height: 56 }}>
                                        <LockResetOutlined fontSize="large" />
                                    </Avatar>
                                    <Typography variant="h5" fontWeight={700} color="white">Quên mật khẩu?</Typography>
                                    <Typography variant="body2" color="rgba(255,255,255,0.7)" textAlign="center">
                                        Nhập email đăng nhập của bạn. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
                                    </Typography>
                                </Stack>

                                <AnimatePresence>
                                    {errorMsg && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                                            <Alert severity="error" variant="filled" icon={<ErrorOutline />}>{errorMsg}</Alert>
                                        </motion.div>
                                    )}
                                    {successMsg && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                                            <Alert severity="success" variant="filled" icon={<CheckCircleOutline />}>{successMsg}</Alert>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <Controller
                                    name="email"
                                    control={control}
                                    rules={{
                                        required: "Vui lòng nhập email",
                                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email không hợp lệ" }
                                    }}
                                    render={({ field }) => (
                                        <StyledTextField
                                            {...field}
                                            label="Email đăng nhập"
                                            disabled={isSubmitting || !!successMsg}
                                            error={!!errors.email}
                                            helperText={errors.email?.message}
                                            fullWidth
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start"><MailOutline sx={{ color: "rgba(255,255,255,0.7)" }} /></InputAdornment>
                                            }}
                                        />
                                    )}
                                />

                                <StyledButton
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    disabled={isSubmitting || countdown > 0}
                                    sx={{
                                        bgcolor: countdown > 0 ? alpha(BRAND.primary, 0.6) : BRAND.primary,
                                        color: "white",
                                        borderRadius: 3, py: 1.5,
                                        boxShadow: countdown > 0 ? 'none' : `0 8px 20px ${alpha(BRAND.primary, 0.4)}`
                                    }}
                                >
                                    {isSubmitting ? "Đang gửi..." : countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi yêu cầu"}
                                </StyledButton>

                                <Button
                                    onClick={() => navigate("/login")}
                                    startIcon={<ArrowBack />}
                                    sx={{ color: "white", textTransform: "none", alignSelf: "center", ":hover": { bgcolor: "rgba(255,255,255,0.1)" } }}
                                >
                                    Quay lại đăng nhập
                                </Button>
                            </Stack>
                        </GlassPaper>
                    </motion.div>
                </Box>
            </Stack>
        </Box>
    );
}
