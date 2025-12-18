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
    Divider,
    Card,
    CardContent,
    Chip,
    IconButton,
    Button,
    alpha
} from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import SettingsIcon from "@mui/icons-material/Settings";
import EmailIcon from "@mui/icons-material/Email";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import { motion } from "framer-motion";

// Import các component con cho từng Tab 
import ProfileTab from "../../components/user/ProfileTab";
import SecurityTab from "../../components/user/SecurityTab";

// Helper function cho TabPanel
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
            {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
        </div>
    );
}

export default function UserProfile() {
    const { user } = useAuth();
    const theme = useTheme();
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

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: theme.palette.mode === 'light' ? theme.palette.grey[50] : theme.palette.grey[900],
                pb: 4
            }}
        >
            {/* Header với gradient */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: 'white',
                    pt: 6,
                    pb: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: -50,
                        right: -50,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        background: alpha('#fff', 0.1),
                    }
                }}
            >
                <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3 }}>
                            <Avatar
                                alt={user.displayName || "User"}
                                src={user.photoURL}
                                sx={{
                                    width: { xs: 80, sm: 100 },
                                    height: { xs: 80, sm: 100 },
                                    border: `4px solid ${alpha('#fff', 0.3)}`,
                                    boxShadow: theme.shadows[10]
                                }}
                            >
                                {user.displayName?.[0]?.toUpperCase() || 'U'}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="h4" fontWeight={800} sx={{ color: 'white' }}>
                                        {user.displayName || "Người dùng"}
                                    </Typography>
                                    {user.emailVerified && (
                                        <Chip
                                            icon={<CheckCircleIcon />}
                                            label="Đã xác thực"
                                            size="small"
                                            sx={{
                                                bgcolor: alpha('#fff', 0.2),
                                                color: 'white',
                                                fontWeight: 600,
                                                '& .MuiChip-icon': {
                                                    color: '#4caf50'
                                                }
                                            }}
                                        />
                                    )}
                                </Stack>
                                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <EmailIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                                        <Typography variant="body2" sx={{ color: alpha('#fff', 0.9) }}>
                                            {user.email}
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <VerifiedUserIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                                        <Typography variant="body2" sx={{ color: alpha('#fff', 0.9) }}>
                                            {user.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Box>
                        </Stack>
                    </motion.div>
                </Box>
            </Box>

            {/* Main Content */}
            <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, mt: -3 }}>
                <Grid container spacing={3}>
                    {/* Sidebar với Tabs */}
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                border: `1px solid ${theme.palette.divider}`,
                                bgcolor: theme.palette.background.paper,
                                overflow: 'hidden',
                                position: 'sticky',
                                top: 20
                            }}
                        >
                            <Tabs
                                orientation="vertical"
                                variant="scrollable"
                                value={tabValue}
                                onChange={handleTabChange}
                                aria-label="User profile tabs"
                                sx={{
                                    '& .MuiTabs-indicator': {
                                        left: 0,
                                        width: 4,
                                        borderRadius: '0 4px 4px 0',
                                        bgcolor: theme.palette.primary.main
                                    },
                                    '& .MuiButtonBase-root': {
                                        minHeight: 56,
                                        justifyContent: 'flex-start',
                                        borderRadius: 2,
                                        px: 2,
                                        mx: 1,
                                        my: 0.5,
                                        color: theme.palette.text.secondary,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        }
                                    },
                                    '& .Mui-selected': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                                        color: theme.palette.primary.main,
                                        fontWeight: 600,
                                    }
                                }}
                            >
                                <Tab
                                    label="Thông tin chung"
                                    icon={<PersonIcon />}
                                    iconPosition="start"
                                    sx={{ textTransform: 'none' }}
                                />
                                <Tab
                                    label="Bảo mật"
                                    icon={<LockIcon />}
                                    iconPosition="start"
                                    sx={{ textTransform: 'none' }}
                                />
                                <Tab
                                    label="Cài đặt"
                                    icon={<SettingsIcon />}
                                    iconPosition="start"
                                    disabled
                                    sx={{ textTransform: 'none' }}
                                />
                            </Tabs>
                        </Paper>
                    </Grid>

                    {/* Main Content Area */}
                    <Grid size={{ xs: 12, md: 9 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                        >
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
                                {/* Tab Header */}
                                <Box
                                    sx={{
                                        p: 3,
                                        borderBottom: `1px solid ${theme.palette.divider}`,
                                        bgcolor: alpha(theme.palette.primary.main, 0.02)
                                    }}
                                >
                                    <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
                                        {tabValue === 0 && "Hồ sơ của bạn"}
                                        {tabValue === 1 && "Thiết lập bảo mật"}
                                        {tabValue === 2 && "Cài đặt hệ thống"}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {tabValue === 0 && "Cập nhật thông tin cá nhân và quản lý tài khoản của bạn."}
                                        {tabValue === 1 && "Thay đổi mật khẩu và quản lý bảo mật tài khoản."}
                                        {tabValue === 2 && "Tùy chỉnh các thiết lập hiển thị và thông báo hệ thống."}
                                    </Typography>
                                </Box>

                                {/* Tab Content */}
                                <TabPanel value={tabValue} index={0}>
                                    <ProfileTab />
                                </TabPanel>
                                <TabPanel value={tabValue} index={1}>
                                    <SecurityTab />
                                </TabPanel>
                                <TabPanel value={tabValue} index={2}>
                                    <Box sx={{ textAlign: 'center', py: 8 }}>
                                        <SettingsIcon sx={{ fontSize: 64, color: theme.palette.text.disabled, mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            Tính năng đang phát triển
                                        </Typography>
                                        <Typography variant="body2" color="text.disabled">
                                            Các tùy chọn cài đặt hệ thống sẽ sớm có mặt.
                                        </Typography>
                                    </Box>
                                </TabPanel>
                            </Paper>
                        </motion.div>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}
