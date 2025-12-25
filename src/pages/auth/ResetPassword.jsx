
import React, { useState, useEffect } from "react";
import {
    Box, Stack, Paper, Typography, TextField, Button, Alert,
    InputAdornment, LinearProgress, Avatar
} from "@mui/material";
import { styled, alpha, useTheme } from "@mui/material/styles";
import {
    LockResetOutlined, Visibility, VisibilityOff, CheckCircleOutline, ErrorOutline
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAuth, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
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
        WebkitBackgroundClip: "text",
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

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    // Support standard Firebase Auth link params (mode=resetPassword&oobCode=...)
    // Or our custom link params (just oobCode=...)
    const code = oobCode;

    const auth = getAuth();
    const [email, setEmail] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [verifying, setVerifying] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { control, handleSubmit, watch, formState: { errors } } = useForm({
        defaultValues: { password: "", confirmPassword: "" }
    });

    const password = watch("password");

    useEffect(() => {
        if (!code) {
            setVerifying(false);
            setErrorMsg("Link không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.");
            return;
        }

        verifyPasswordResetCode(auth, code)
            .then((email) => {
                setEmail(email);
                setVerifying(false);
            })
            .catch((error) => {
                setVerifying(false);
                setErrorMsg("Link không hợp lệ hoặc đã hết hạn.");
            });
    }, [code, auth]);

    const onSubmit = async (data) => {
        if (data.password !== data.confirmPassword) return;

        setIsSubmitting(true);
        setErrorMsg("");

        try {
            await confirmPasswordReset(auth, code, data.password);
            setSuccessMsg("Mật khẩu đã được đặt lại thành công! Đang chuyển hướng đăng nhập...");
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        } catch (error) {
            console.error(error);
            setErrorMsg(error.message || "Có lỗi xảy ra khi đặt lại mật khẩu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (verifying) {
        return (
            <Box
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${BRAND.bgImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    p: 2
                }}
            >
                <Typography color="white">Đang xác thực link...</Typography>
            </Box>
        );
    }

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${BRAND.bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                p: 2
            }}
        >
            <GlassPaper
                elevation={24}
                sx={{
                    p: { xs: 3, md: 5 },
                    width: "100%",
                    maxWidth: 480,
                    borderRadius: 4,
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden"
                }}
            >
                {isSubmitting && (
                    <LinearProgress
                        sx={{
                            position: "absolute", top: 0, left: 0, right: 0, height: 3,
                            backgroundColor: alpha(BRAND.primary, 0.2),
                            "& .MuiLinearProgress-bar": { backgroundColor: BRAND.primary }
                        }}
                    />
                )}

                <AnimatePresence>
                    {errorMsg ? (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                            <Alert severity="error" icon={<ErrorOutline fontSize="inherit" />} sx={{ mb: 3, borderRadius: 3 }}>
                                {errorMsg}
                            </Alert>
                            <Button onClick={() => navigate("/login")} variant="text" sx={{ color: 'white' }}>Quay lại đăng nhập</Button>
                        </motion.div>
                    ) : successMsg ? (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                            <Avatar sx={{ bgcolor: BRAND.success, width: 64, height: 64, mx: "auto", mb: 2 }}>
                                <CheckCircleOutline sx={{ fontSize: 32 }} />
                            </Avatar>
                            <Typography variant="h5" fontWeight="bold" color="white" gutterBottom>
                                Thành công!
                            </Typography>
                            <Typography variant="body1" color={alpha("#fff", 0.7)} mb={3}>
                                {successMsg}
                            </Typography>
                        </motion.div>
                    ) : (
                        <Stack spacing={3} component="form" onSubmit={handleSubmit(onSubmit)}>
                            <Stack alignItems="center" spacing={1}>
                                <Avatar
                                    src={logo}
                                    sx={{ width: 64, height: 64, mb: 1, border: `2px solid ${BRAND.accent}` }}
                                />
                                <Typography variant="h4" fontWeight="800" letterSpacing={-0.5} sx={{
                                    background: `linear-gradient(135deg, #fff 0%, ${alpha("#fff", 0.7)} 100%)`,
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent"
                                }}>
                                    Đặt Lại Mật Khẩu
                                </Typography>
                                <Typography variant="body2" color={alpha("#fff", 0.5)}>
                                    Nhập mật khẩu mới cho tài khoản {email}
                                </Typography>
                            </Stack>

                            <Controller
                                name="password"
                                control={control}
                                rules={{
                                    required: "Vui lòng nhập mật khẩu mới",
                                    minLength: { value: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" }
                                }}
                                render={({ field }) => (
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        type={showPassword ? "text" : "password"}
                                        label="Mật khẩu mới"
                                        error={!!errors.password}
                                        helperText={errors.password?.message}
                                        success={!errors.password && field.value?.length >= 6}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LockResetOutlined sx={{ color: alpha("#fff", 0.5) }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <Box onClick={() => setShowPassword(!showPassword)} sx={{ cursor: 'pointer', color: alpha("#fff", 0.5) }}>
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </Box>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                )}
                            />

                            <Controller
                                name="confirmPassword"
                                control={control}
                                rules={{
                                    required: "Vui lòng xác nhận mật khẩu",
                                    validate: val => val === password || "Mật khẩu không khớp"
                                }}
                                render={({ field }) => (
                                    <StyledTextField
                                        {...field}
                                        fullWidth
                                        type={showPassword ? "text" : "password"}
                                        label="Xác nhận mật khẩu"
                                        error={!!errors.confirmPassword}
                                        helperText={errors.confirmPassword?.message}
                                        success={!errors.confirmPassword && field.value?.length > 0}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LockResetOutlined sx={{ color: alpha("#fff", 0.5) }} />
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                )}
                            />

                            <StyledButton
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={isSubmitting}
                                sx={{
                                    bgcolor: BRAND.accent,
                                    color: "#fff",
                                    fontWeight: 700,
                                    borderRadius: 3,
                                    height: 52,
                                    boxShadow: `0 8px 16px ${alpha(BRAND.accent, 0.4)}`,
                                    "&:hover": { bgcolor: alpha(BRAND.accent, 0.9), boxShadow: `0 12px 20px ${alpha(BRAND.accent, 0.6)}` }
                                }}
                            >
                                {isSubmitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                            </StyledButton>
                        </Stack>
                    )}
                </AnimatePresence>
            </GlassPaper>
        </Box>
    );
}
