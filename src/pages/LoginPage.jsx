// src/pages/LoginPage.jsx - Phiên bản đồng bộ màu sắc dựa trên code gốc
import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import {
    Box,
    TextField,
    Button,
    Alert,
    Typography,
    Paper,
    Avatar,
    FormControlLabel,
    Checkbox,
    Link as MUILink,
    CircularProgress,
    IconButton,
    InputAdornment,
    alpha,
    Stack,
    styled,
    Divider, // Thêm Divider để dùng cho nút Google
} from "@mui/material";
import {
    Business,
    Visibility,
    VisibilityOff,
    MailOutline,
    VpnKeyOutlined,
    Google as GoogleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
    getAuth,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
} from "firebase/auth";
import {
    motion,
    AnimatePresence,
    useMotionValue,
    useTransform,
} from "framer-motion";
import logo from "../assets/logo.png"; // Đảm bảo đường dẫn đến logo là đúng

// --- ✨ TỐI ƯU 1: CẬP NHẬT BẢNG MÀU THEO LOGO ---
const BRAND_COLORS = {
    primaryBlue: "#0D47A1", // Màu xanh chủ đạo của logo
    accentRed: "#E63946", // Màu đỏ nhấn mạnh, lấy cảm hứng từ chữ "BÁCH KHOA"
    white: "#FFFFFF",
    background:
        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop",
};

// --- STYLED COMPONENT: Cập nhật màu nhấn sang màu Đỏ ---
const StyledTextField = styled(TextField)({
    "& label": {
        color: alpha(BRAND_COLORS.white, 0.7),
    },
    // Khi focus, viền và label sẽ có màu đỏ
    "& label.Mui-focused": {
        color: BRAND_COLORS.accentRed,
    },
    "& .MuiInputBase-input": {
        color: alpha(BRAND_COLORS.white, 0.9),
    },
    "& .MuiOutlinedInput-root": {
        borderRadius: 12, // Thêm bo góc cho field
        "& fieldset": {
            borderColor: alpha(BRAND_COLORS.white, 0.3),
        },
        "&:hover fieldset": {
            borderColor: alpha(BRAND_COLORS.white, 0.5),
        },
        // Khi focus, viền sẽ có màu đỏ
        "&.Mui-focused fieldset": {
            borderColor: BRAND_COLORS.accentRed,
            borderWidth: "2px",
        },
    },
});

export default function LoginPage() {
    const [email, setEmail] = useState("bachkhoa_lx@yahoo.com.vn");
    const [pass, setPass] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const auth = getAuth();

    // --- Logic cho hiệu ứng Parallax (Giữ nguyên) ---
    const containerRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const handleMouseMove = ({ clientX, clientY }) => {
        if (containerRef.current) {
            const { left, top, width, height } =
                containerRef.current.getBoundingClientRect();
            mouseX.set(clientX - left - width / 2);
            mouseY.set(clientY - top - height / 2);
        }
    };
    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };
    const rotateX = useTransform(mouseY, [-300, 300], [10, -10], {
        clamp: false,
    });
    const rotateY = useTransform(mouseX, [-300, 300], [-10, 10], {
        clamp: false,
    });
    const bgTranslateX = useTransform(mouseX, [-500, 500], [25, -25], {
        clamp: false,
    });
    const bgTranslateY = useTransform(mouseY, [-500, 500], [15, -15], {
        clamp: false,
    });

    // --- Logic Component (Giữ nguyên) ---
    useEffect(() => {
        const rememberedEmail = localStorage.getItem("rememberedEmail");
        if (rememberedEmail) {
            setEmail(rememberedEmail);
        }
    }, []);
    const handleSubmit = useCallback(
        async (e) => {
            e.preventDefault();
            if (loading) return;
            setLoading(true);
            setError("");
            try {
                const persistence = remember
                    ? browserLocalPersistence
                    : browserSessionPersistence;
                await setPersistence(auth, persistence);
                await signInWithEmailAndPassword(auth, email, pass);
                if (remember) {
                    localStorage.setItem("rememberedEmail", email);
                } else {
                    localStorage.removeItem("rememberedEmail");
                }
                navigate("/", { replace: true });
            } catch (err) {
                setError("Email hoặc mật khẩu không chính xác.");
            } finally {
                setLoading(false);
            }
        },
        [auth, email, pass, remember, navigate, loading]
    );

    const containerVariants = useMemo(
        () => ({
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
        }),
        []
    );
    const itemVariants = useMemo(
        () => ({
            hidden: { y: 20, opacity: 0 },
            visible: {
                y: 0,
                opacity: 1,
                transition: { type: "spring", stiffness: 100 },
            },
        }),
        []
    );

    return (
        <Box
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            sx={{
                minHeight: "100vh",
                width: "100%",
                position: "relative",
                overflow: "hidden",
                perspective: "1500px",
            }}
        >
            <motion.div
                style={{
                    x: bgTranslateX,
                    y: bgTranslateY,
                    position: "absolute",
                    top: "-5%",
                    left: "-5%",
                    width: "110%",
                    height: "110%",
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        height: "100%",
                        backgroundImage: `url(${BRAND_COLORS.background})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        "&::before": {
                            content: '""',
                            position: "absolute",
                            inset: 0,
                            background:
                                "linear-gradient(75deg, rgba(0, 22, 40, 0.95) 45%, rgba(13, 71, 161, 0.7))",
                        },
                    }}
                />
            </motion.div>

            <Stack
                direction={{ xs: "column", md: "row" }}
                sx={{
                    width: "100%",
                    minHeight: "100vh",
                    maxWidth: "1400px",
                    mx: "auto",
                    zIndex: 2,
                    alignItems: "center",
                    position: "relative",
                }}
            >
                {/* --- CỘT BÊN TRÁI --- */}
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
                        height: "100%",
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, type: "spring" }}
                    >
                        <img
                            src={logo}
                            alt="Logo Công ty Bách Khoa"
                            style={{
                                width: 250,
                                height: 250,
                                objectFit: "contain",
                                filter: "drop-shadow(0px 10px 15px rgba(0,0,0,0.3))",
                            }}
                        />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <Typography
                            variant="h3"
                            fontWeight={700}
                            sx={{ textShadow: "2px 2px 8px rgba(0,0,0,0.5)" }}
                        >
                            Hệ Thống Quản Trị
                        </Typography>
                        {/* ✨ TỐI ƯU 5: Đổi màu chữ vàng thành màu trắng cho nhất quán */}
                        <Typography
                            variant="h5"
                            fontWeight={500}
                            sx={{ color: BRAND_COLORS.white, mt: 1 }}
                        >
                            Công ty CPXD Bách Khoa
                        </Typography>
                        <Typography
                            variant="body1"
                            sx={{ mt: 2, fontStyle: "italic", opacity: 0.8 }}
                        >
                            "Xây Bền Vững, Dựng Thành Công."{" "}
                        </Typography>
                    </motion.div>
                </Box>

                {/* --- CỘT BÊN PHẢI --- */}
                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 4,
                        width: "100%",
                    }}
                >
                    <motion.div
                        // style={{
                        //     rotateX,
                        //     rotateY,
                        //     transformStyle: "preserve-3d",
                        // }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                        }}
                    >
                        <Paper
                            elevation={16}
                            sx={{
                                p: { xs: 3, sm: 4 },
                                width: "100%",
                                maxWidth: 450,
                                borderRadius: 5,
                                backdropFilter: "blur(10px)",
                                backgroundColor: alpha("#1A2027", 0.7),
                                border: `1px solid ${alpha(
                                    BRAND_COLORS.accentRed,
                                    0.3
                                )}`,
                                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                            }}
                        >
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                style={{ transform: "translateZ(50px)" }}
                            >
                                <Box
                                    component="form"
                                    onSubmit={handleSubmit}
                                    noValidate
                                >
                                    <Stack spacing={2.5}>
                                        <motion.div variants={itemVariants}>
                                            <Stack alignItems="center" mb={1}>
                                                {/* ✨ TỐI ƯU 2: Đồng bộ màu Avatar */}
                                                <Avatar
                                                    sx={{
                                                        bgcolor:
                                                            BRAND_COLORS.primaryBlue,
                                                        color: BRAND_COLORS.white,
                                                        mx: "auto",
                                                        mb: 1.5,
                                                        width: 56,
                                                        height: 56,
                                                    }}
                                                >
                                                    <Business
                                                        sx={{
                                                            fontSize: "1.75rem",
                                                        }}
                                                    />
                                                </Avatar>
                                                <Typography
                                                    component="h1"
                                                    variant="h4"
                                                    fontWeight={700}
                                                    color="white"
                                                >
                                                    Đăng Nhập
                                                </Typography>
                                            </Stack>
                                        </motion.div>
                                        <AnimatePresence>
                                            {error && (
                                                <motion.div
                                                    initial={{
                                                        opacity: 0,
                                                        height: 0,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        height: "auto",
                                                    }}
                                                    exit={{
                                                        opacity: 0,
                                                        height: 0,
                                                    }}
                                                >
                                                    <Alert
                                                        severity="error"
                                                        variant="filled"
                                                        sx={{ width: "100%" }}
                                                    >
                                                        {error}
                                                    </Alert>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <motion.div variants={itemVariants}>
                                            <StyledTextField
                                                label="Email công ty"
                                                type="email"
                                                required
                                                fullWidth
                                                value={email}
                                                onChange={(e) =>
                                                    setEmail(e.target.value)
                                                }
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <MailOutline
                                                                sx={{
                                                                    color: alpha(
                                                                        "#fff",
                                                                        0.5
                                                                    ),
                                                                }}
                                                            />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        </motion.div>
                                        <motion.div variants={itemVariants}>
                                            <StyledTextField
                                                label="Mật khẩu"
                                                type={
                                                    showPass
                                                        ? "text"
                                                        : "password"
                                                }
                                                required
                                                fullWidth
                                                value={pass}
                                                onChange={(e) =>
                                                    setPass(e.target.value)
                                                }
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <VpnKeyOutlined
                                                                sx={{
                                                                    color: alpha(
                                                                        "#fff",
                                                                        0.5
                                                                    ),
                                                                }}
                                                            />
                                                        </InputAdornment>
                                                    ),
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                onClick={() =>
                                                                    setShowPass(
                                                                        !showPass
                                                                    )
                                                                }
                                                                edge="end"
                                                                sx={{
                                                                    color: alpha(
                                                                        "#fff",
                                                                        0.7
                                                                    ),
                                                                }}
                                                            >
                                                                {showPass ? (
                                                                    <VisibilityOff />
                                                                ) : (
                                                                    <Visibility />
                                                                )}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        </motion.div>
                                        <motion.div variants={itemVariants}>
                                            <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                alignItems="center"
                                            >
                                                {/* ✨ TỐI ƯU 3: Đồng bộ màu Checkbox và Link sang màu Đỏ */}
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={remember}
                                                            onChange={(e) =>
                                                                setRemember(
                                                                    e.target
                                                                        .checked
                                                                )
                                                            }
                                                            sx={{
                                                                color: BRAND_COLORS.accentRed,
                                                                "&.Mui-checked":
                                                                    {
                                                                        color: BRAND_COLORS.accentRed,
                                                                    },
                                                            }}
                                                        />
                                                    }
                                                    label={
                                                        <Typography
                                                            color="white"
                                                            variant="body2"
                                                        >
                                                            Ghi nhớ
                                                        </Typography>
                                                    }
                                                />
                                                <MUILink
                                                    component="button"
                                                    variant="body2"
                                                    onClick={() =>
                                                        navigate(
                                                            "/forgot-password"
                                                        )
                                                    }
                                                    sx={{
                                                        color: BRAND_COLORS.accentRed,
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    Quên mật khẩu?
                                                </MUILink>
                                            </Stack>
                                        </motion.div>
                                        <motion.div variants={itemVariants}>
                                            <motion.div
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {/* ✨ TỐI ƯU 4: Đồng bộ màu nút Đăng nhập sang màu Xanh chủ đạo */}
                                                <Button
                                                    type="submit"
                                                    variant="contained"
                                                    fullWidth
                                                    size="large"
                                                    disabled={loading}
                                                    sx={{
                                                        py: 1.5,
                                                        fontWeight: "bold",
                                                        fontSize: "1.1rem",
                                                        borderRadius: 3,
                                                        bgcolor:
                                                            BRAND_COLORS.primaryBlue,
                                                        color: BRAND_COLORS.white,
                                                        "&:hover": {
                                                            bgcolor: alpha(
                                                                BRAND_COLORS.primaryBlue,
                                                                0.9
                                                            ),
                                                            boxShadow: `0px 6px 20px ${alpha(
                                                                BRAND_COLORS.primaryBlue,
                                                                0.4
                                                            )}`,
                                                        },
                                                        transition:
                                                            "all 0.3s ease",
                                                    }}
                                                >
                                                    {loading ? (
                                                        <CircularProgress
                                                            size={26}
                                                            sx={{
                                                                color: BRAND_COLORS.white,
                                                            }}
                                                        />
                                                    ) : (
                                                        "Đăng nhập"
                                                    )}
                                                </Button>
                                            </motion.div>
                                        </motion.div>
                                        <motion.div variants={itemVariants}>
                                            <Divider
                                                sx={{
                                                    my: 1,
                                                    color: alpha("#fff", 0.3),
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: alpha(
                                                            "#fff",
                                                            0.5
                                                        ),
                                                    }}
                                                >
                                                    hoặc
                                                </Typography>
                                            </Divider>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                startIcon={<GoogleIcon />}
                                                sx={{
                                                    color: "white",
                                                    borderColor: alpha(
                                                        "#fff",
                                                        0.3
                                                    ),
                                                    "&:hover": {
                                                        borderColor: "white",
                                                        backgroundColor: alpha(
                                                            "#fff",
                                                            0.1
                                                        ),
                                                    },
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
