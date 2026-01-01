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
                    pt: { xs: 3, md: 8 }, // Reduced PT
                    pb: { xs: 5, md: 10 }, // Reduced PB
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
                    <Stack
                        direction="row" // Always row for compact look
                        spacing={{ xs: 2, sm: 3 }}
                        alignItems="center"
                    >
                        <Avatar
                            alt={user.displayName || "User"}
                            src={user.photoURL}
                            component={motion.div}
                            whileHover={{ scale: 1.05 }}
                            sx={{
                                width: { xs: 72, sm: 120 },
                                height: { xs: 72, sm: 120 },
                                border: `4px solid ${alpha('#fff', 0.2)}`,
                                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                                backdropFilter: 'blur(4px)',
                            }}
                        >
                            {user.displayName?.[0]?.toUpperCase() || 'U'}
                        </Avatar>

                        <Box sx={{ flex: 1 }}>
                            <Stack direction="column" spacing={0.5} sx={{ mb: 1 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="h3" fontWeight={800} sx={{
                                        textShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                        fontSize: { xs: '1.25rem', md: '2.5rem' }
                                    }}>
                                        {user.displayName || "Người dùng"}
                                    </Typography>
                                    {user.emailVerified && (
                                        <Chip
                                            icon={<CheckCircleIcon sx={{ color: 'success.main', fontSize: '1rem' }} />}
                                            label="Verified"
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(255,255,255,0.2)',
                                                color: 'white',
                                                fontWeight: 600,
                                                backdropFilter: 'blur(10px)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                height: 24,
                                                '& .MuiChip-label': { px: 1, fontSize: '0.7rem' }
                                            }}
                                        />
                                    )}
                                </Stack>
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 3 }} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ opacity: 0.9 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <EmailIcon sx={{ fontSize: '1rem' }} />
                                    <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{user.email}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <VerifiedUserIcon sx={{ fontSize: '1rem' }} />
                                    <Typography variant="body2" textTransform="capitalize" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                                        {user.role === "admin" ? "Quản trị viên" : "Thành viên"}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>
                </Container>
            </Box>

            {/* --- MAIN CONTENT CARD --- */}
            <Container maxWidth="lg" sx={{ mt: { xs: -3, md: -6 }, position: 'relative', zIndex: 2 }}>
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
                                    p: isMobile ? 1.5 : 0,
                                    '.MuiTabs-indicator': {
                                        display: isMobile ? 'none' : 'block', // Hide indicator on mobile
                                        left: 0,
                                        width: 4,
                                        height: '100%',
                                        borderRadius: '0 4px 4px 0',
                                        bgcolor: theme.palette.primary.main
                                    },
                                    '.MuiButtonBase-root': {
                                        minHeight: { xs: 44, md: 56 }, // Smaller on mobile
                                        justifyContent: isMobile ? 'center' : 'flex-start',
                                        borderRadius: 2, // Always rounded
                                        px: 2,
                                        mx: isMobile ? 0.5 : 1, // Spacing between pills
                                        my: isMobile ? 0 : 0.5,
                                        transition: 'all 0.2s',
                                        // Pill style for active state on mobile
                                        '&.Mui-selected': {
                                            bgcolor: isMobile ? alpha(theme.palette.primary.main, 1) : alpha(theme.palette.primary.main, 0.12),
                                            color: isMobile ? 'white' : theme.palette.primary.main,
                                            fontWeight: 600,
                                            boxShadow: isMobile ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                                            '& .MuiSvgIcon-root': {
                                                color: isMobile ? 'white' : 'inherit'
                                            }
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

