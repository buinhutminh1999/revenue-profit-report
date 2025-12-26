import React, { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Tabs,
    Tab,
    Avatar,
    Grid,
    useTheme,
    Stack,
    Chip,
    alpha,
    useMediaQuery,
    Container
} from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import SettingsIcon from "@mui/icons-material/Settings";
import HistoryIcon from "@mui/icons-material/History";
import EmailIcon from "@mui/icons-material/Email";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { motion, AnimatePresence } from "framer-motion";

// Import Child Components
import ProfileTab from "../../components/user/ProfileTab";
import SecurityTab from "../../components/user/SecurityTab";
import SettingsTab from "../../components/user/SettingsTab";
import UserActivityLog from "../../components/user/UserActivityLog";

// Helper function for TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`user-profile-tabpanel-${index}`}
            aria-labelledby={`user-profile-tab-${index}`}
            {...other}
        >
            <AnimatePresence mode="wait">
                {value === index && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function UserProfile() {
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    if (!user) {
        return (
            <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography>Vui lòng đăng nhập để xem thông tin.</Typography>
            </Box>
        );
    }

    // Dynamic Header Background (Mesh Gradient effect)
    const headerBackground = theme.palette.mode === 'dark'
        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%), 
           radial-gradient(circle at 10% 20%, ${alpha(theme.palette.secondary.dark, 0.4)} 0%, transparent 40%)`
        : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%), 
           radial-gradient(circle at 80% 0%, ${alpha(theme.palette.secondary.main, 0.3)} 0%, transparent 30%)`;

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: theme.palette.background.default,
                pb: 4
            }}
        >
            {/* --- GLASSMORPHISM HEADER --- */}
            <Box
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                sx={{
                    background: headerBackground,
                    color: 'white',
                    pt: { xs: 4, md: 8 },
                    pb: { xs: 8, md: 10 },
                    position: 'relative',
                    overflow: 'hidden',
                    zIndex: 0
                }}
            >
                {/* Decorative Circles for Glass Effect */}
                <Box sx={{
                    position: 'absolute', top: -100, right: -50, width: 400, height: 400,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                    zIndex: -1, mixBlendMode: 'overlay'
                }} />

                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                        <Avatar
                            alt={user.displayName || "User"}
                            src={user.photoURL}
                            component={motion.div}
                            whileHover={{ scale: 1.05 }}
                            sx={{
                                width: { xs: 100, sm: 120 },
                                height: { xs: 100, sm: 120 },
                                border: `4px solid ${alpha('#fff', 0.2)}`,
                                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                                backdropFilter: 'blur(4px)',
                            }}
                        >
                            {user.displayName?.[0]?.toUpperCase() || 'U'}
                        </Avatar>

                        <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" justifyContent={{ xs: 'center', sm: 'flex-start' }} sx={{ mb: 1 }}>
                                <Typography variant="h3" fontWeight={800} sx={{
                                    textShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                    fontSize: { xs: '1.75rem', md: '2.5rem' }
                                }}>
                                    {user.displayName || "Người dùng"}
                                </Typography>
                                {user.emailVerified && (
                                    <Chip
                                        icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
                                        label="Verified"
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            fontWeight: 600,
                                            backdropFilter: 'blur(10px)',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    />
                                )}
                            </Stack>

                            <Stack direction="row" spacing={3} alignItems="center" justifyContent={{ xs: 'center', sm: 'flex-start' }} sx={{ opacity: 0.9 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <EmailIcon fontSize="small" />
                                    <Typography variant="body1">{user.email}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <VerifiedUserIcon fontSize="small" />
                                    <Typography variant="body1" textTransform="capitalize">
                                        {user.role === "admin" ? "Quản trị viên" : "Thành viên"}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>
                </Container>
            </Box>

            {/* --- MAIN CONTENT CARD --- */}
            <Container maxWidth="lg" sx={{ mt: -6, position: 'relative', zIndex: 2 }}>
                <Grid container spacing={3}>
                    {/* NAVIGATION SIDEBAR / TOP BAR */}
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                border: `1px solid ${theme.palette.divider}`,
                                bgcolor: alpha(theme.palette.background.paper, 0.8),
                                backdropFilter: 'blur(12px)',
                                overflow: 'hidden',
                                position: isMobile ? 'static' : 'sticky',
                                top: 20
                            }}
                        >
                            <Tabs
                                orientation={isMobile ? "horizontal" : "vertical"}
                                variant="scrollable"
                                scrollButtons="auto"
                                value={tabValue}
                                onChange={handleTabChange}
                                aria-label="User profile tabs"
                                sx={{
                                    '.MuiTabs-indicator': {
                                        left: isMobile ? 0 : 0,
                                        width: isMobile ? '100%' : 4,
                                        height: isMobile ? 3 : '100%',
                                        bottom: 0,
                                        borderRadius: isMobile ? '3px 3px 0 0' : '0 4px 4px 0',
                                        bgcolor: theme.palette.primary.main
                                    },
                                    '.MuiButtonBase-root': {
                                        minHeight: 56,
                                        justifyContent: isMobile ? 'center' : 'flex-start',
                                        borderRadius: isMobile ? 0 : 2,
                                        px: 2,
                                        mx: isMobile ? 0 : 1,
                                        my: isMobile ? 0 : 0.5,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        },
                                        '&.Mui-selected': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                                            color: theme.palette.primary.main,
                                            fontWeight: 600,
                                        }
                                    }
                                }}
                            >
                                <Tab label="Hồ sơ" icon={<PersonIcon />} iconPosition="start" sx={{ textTransform: 'none' }} />
                                <Tab label="Bảo mật" icon={<LockIcon />} iconPosition="start" sx={{ textTransform: 'none' }} />
                                <Tab label="Cài đặt" icon={<SettingsIcon />} iconPosition="start" sx={{ textTransform: 'none' }} />
                                <Tab label="Hoạt động" icon={<HistoryIcon />} iconPosition="start" sx={{ textTransform: 'none' }} />
                            </Tabs>
                        </Paper>
                    </Grid>

                    {/* CONTENT AREA */}
                    <Grid size={{ xs: 12, md: 9 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                minHeight: '500px',
                                border: `1px solid ${theme.palette.divider}`,
                                bgcolor: theme.palette.background.paper,
                                overflow: 'hidden'
                            }}
                        >
                            {/* Section Header */}
                            <Box sx={{
                                p: 3,
                                borderBottom: `1px solid ${theme.palette.divider}`,
                                background: `linear-gradient(to right, ${alpha(theme.palette.primary.main, 0.05)}, transparent)`
                            }}>
                                <Typography variant="h5" fontWeight={700} color="text.primary">
                                    {tabValue === 0 && "Hồ sơ cá nhân"}
                                    {tabValue === 1 && "Bảo mật & Đăng nhập"}
                                    {tabValue === 2 && "Cài đặt hệ thống"}
                                    {tabValue === 3 && "Lịch sử hoạt động"}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {tabValue === 0 && "Quản lý thông tin hiển thị và dữ liệu cá nhân của bạn."}
                                    {tabValue === 1 && "Kiểm soát mật khẩu và bảo vệ tài khoản."}
                                    {tabValue === 2 && "Tùy chỉnh giao diện và trải nghiệm sử dụng."}
                                    {tabValue === 3 && "Nhật ký các hành động gần đây của bạn trên hệ thống."}
                                </Typography>
                            </Box>

                            {/* Dynamic Content */}
                            <TabPanel value={tabValue} index={0}>
                                <ProfileTab />
                            </TabPanel>
                            <TabPanel value={tabValue} index={1}>
                                <SecurityTab />
                            </TabPanel>
                            <TabPanel value={tabValue} index={2}>
                                <SettingsTab />
                            </TabPanel>
                            <TabPanel value={tabValue} index={3}>
                                <UserActivityLog />
                            </TabPanel>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}

