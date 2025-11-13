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
    Divider 
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useAuth } from "../contexts/AuthContext";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import SettingsIcon from "@mui/icons-material/Settings";
import EmailIcon from "@mui/icons-material/Email"; // Thêm icon Email
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser"; // Thêm icon Role

// Import các component con cho từng Tab 
import ProfileTab from "../components/ProfileTab"; 
import SecurityTab from "../components/SecurityTab";

// Helper function cho TabPanel (Giữ nguyên)
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
                p: { xs: 1, sm: 2, md: 4 }, 
                minHeight: '100%',
                bgcolor: theme.palette.mode === 'light' ? theme.palette.grey[50] : theme.palette.grey[900]
            }}
        >
            <Box sx={{ maxWidth: 1000, mx: "auto" }}>
                
                {/* --- 1. HEADER (Thông tin tóm tắt) --- */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5, color: theme.palette.text.primary }}>
                        Cài đặt Tài khoản
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Quản lý thông tin cá nhân và bảo mật của bạn.
                    </Typography>
                </Box>

                {/* --- 2. CONTAINER CHỨC NĂNG (TABS VÀ NỘI DUNG) --- */}
                <Grid container spacing={{ xs: 2, md: 4 }}>
                    
                    {/* Cột Trái: Thông tin tóm tắt & Thanh Điều hướng (Tabs) */}
                    <Grid item xs={12} md={3}>
                        <Paper 
                            elevation={1} 
                            sx={{ 
                                p: 0, // Bỏ padding gốc
                                borderRadius: 4,
                                border: (t) => `1px solid ${t.palette.divider}`,
                                bgcolor: theme.palette.background.paper,
                            }}
                        >
                            {/* THÔNG TIN TÓM TẮT (GỌN HƠN) */}
                            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Avatar
                                    alt={user.displayName || "User"}
                                    src={user.photoURL}
                                    sx={{ 
                                        width: 72, 
                                        height: 72, 
                                        mb: 1, 
                                        boxShadow: theme.shadows[3]
                                    }}
                                >
                                    {user.displayName?.[0] || 'U'}
                                </Avatar>
                                <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                                    {user.displayName || "Người dùng"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {user.email}
                                </Typography>
                            </Box>
                            
                            <Divider sx={{ mb: 1 }} />

                            {/* THANH ĐIỀU HƯỚNG (TABS) */}
                            <Box sx={{ px: 1, pb: 1 }}>
                                <Tabs
                                    orientation="vertical"
                                    variant="scrollable"
                                    value={tabValue}
                                    onChange={handleTabChange}
                                    aria-label="User profile tabs"
                                    sx={{
                                        // Ẩn indicator khi không cần thiết
                                        '& .MuiTabs-indicator': { 
                                            left: 0, 
                                            width: 4, 
                                            borderRadius: '0 4px 4px 0', 
                                            bgcolor: theme.palette.primary.main 
                                        },
                                        // Đảm bảo tab không có border
                                        '& .MuiButtonBase-root': { 
                                            minHeight: 44, 
                                            justifyContent: 'flex-start',
                                            borderRadius: 1.5,
                                            px: 1,
                                            color: theme.palette.text.secondary,
                                            transition: 'all 0.2s',
                                        },
                                        // Tab đang chọn
                                        '& .Mui-selected': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: theme.palette.primary.main,
                                            fontWeight: 600,
                                        }
                                    }}
                                >
                                    <Tab 
                                        label="Thông tin chung" 
                                        icon={<PersonIcon />} 
                                        iconPosition="start"
                                    />
                                    <Tab 
                                        label="Bảo mật" 
                                        icon={<LockIcon />} 
                                        iconPosition="start"
                                    />
                                    <Tab 
                                        label="Cài đặt hệ thống" 
                                        icon={<SettingsIcon />} 
                                        iconPosition="start"
                                        disabled
                                    />
                                </Tabs>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Cột Phải: Nội dung Tab */}
                    <Grid item xs={12} md={9}>
                         <Paper 
                            elevation={1} 
                            sx={{ 
                                borderRadius: 4,
                                minHeight: '400px',
                                border: (t) => `1px solid ${t.palette.divider}`,
                                bgcolor: theme.palette.background.paper,
                            }}
                        >
                            {/* Tiêu đề Nội dung */}
                            <Box sx={{ p: 3, borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
                                <Typography variant="h5" fontWeight={700} color="text.primary">
                                    {tabValue === 0 && "Hồ sơ của bạn"}
                                    {tabValue === 1 && "Thiết lập bảo mật"}
                                    {tabValue === 2 && "Cài đặt chung"}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {tabValue === 0 && "Cập nhật tên hiển thị, hình đại diện và thông tin liên hệ."}
                                    {tabValue === 1 && "Thay đổi mật khẩu và quản lý phiên đăng nhập."}
                                    {tabValue === 2 && "Tùy chỉnh các thiết lập hiển thị và thông báo hệ thống."}
                                </Typography>
                            </Box>

                            {/* Nội dung Tabs */}
                            <TabPanel value={tabValue} index={0}>
                                <ProfileTab />
                            </TabPanel>
                            <TabPanel value={tabValue} index={1}>
                                <SecurityTab />
                            </TabPanel>
                            <TabPanel value={tabValue} index={2}>
                                <Typography color="text.disabled">Tính năng cài đặt hệ thống đang được phát triển.</Typography>
                            </TabPanel>
                        </Paper>
                    </Grid>
                </Grid>

            </Box>
        </Box>
    );
}