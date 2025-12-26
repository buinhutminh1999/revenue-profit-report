import React, { useEffect, useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Paper, Stack, Chip, useTheme, Avatar,
    Card, CardContent, IconButton, Button, Divider, LinearProgress,
    Skeleton, TextField, InputAdornment // [NEW] Added components
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Icons
import {
    People, Settings, BarChart, Storage, Assignment,
    ChevronRight, Description, AccountBalance, VerifiedUser,
    TrendingUp, NotificationsActive, History, ArrowForward,
    Search // [NEW] Icon Search
} from '@mui/icons-material';

// --- CONFIGURATION DATA ---
const adminItems = [
    {
        title: "Quản lý Người dùng",
        description: "Phân quyền & nhân sự.",
        icon: <People />,
        countKey: 'userCount',
        color: 'primary',
        path: "/admin/users",
        group: "Quản trị",
    },
    {
        title: "Phòng ban",
        description: "Cấu trúc tổ chức.",
        icon: <AccountBalance />,
        countKey: 'departmentCount',
        color: 'secondary',
        path: "/admin/departments",
        group: "Quản trị",
    },
    {
        title: "Phân quyền (Whitelist)",
        description: "Kiểm soát truy cập.",
        icon: <VerifiedUser />,
        color: 'warning',
        path: "/admin/whitelist",
        group: "Quản trị",
    },
    {
        title: "Cấu hình Danh mục",
        description: "Chi phí & Khoản mục.",
        icon: <Settings />,
        color: 'info',
        path: "/categories",
        group: "Hệ thống",
    },
    {
        title: "Lợi nhuận Quý",
        description: "Báo cáo tài chính.",
        icon: <BarChart />,
        color: 'success',
        path: "/reports/profit-quarter",
        group: "Báo cáo",
    },
    {
        title: "Báo cáo Tuần",
        description: "Tiến độ công việc.",
        icon: <Description />,
        countKey: 'reportCount',
        color: 'info',
        path: "/reports/weekly",
        group: "Báo cáo",
    },
    {
        title: "Nhật ký Hệ thống",
        description: "Theo dõi lỗi & Log.",
        icon: <Assignment />,
        path: "/admin/audit-log",
        color: 'error',
        group: "Hệ thống",
    },
    {
        title: "Sao lưu Dữ liệu",
        description: "Backup & Restore.",
        icon: <Storage />,
        disabled: true,
        color: 'warning',
        group: "Hệ thống",
    },
];

// --- STYLED COMPONENTS ---
const StatCard = styled(Paper)(({ theme, color }) => ({
    padding: theme.spacing(3),
    borderRadius: 24,
    background: theme.palette.mode === 'light' ? '#fff' : alpha(theme.palette.background.paper, 0.6),
    boxShadow: theme.shadows[0],
    border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 24px -4px ${alpha(theme.palette[color].main, 0.15)}`,
    },
    '&::after': {
        content: '""',
        position: 'absolute',
        top: 0, right: 0,
        width: '100px', height: '100%',
        background: `linear-gradient(90deg, transparent, ${alpha(theme.palette[color].main, 0.05)})`,
        transform: 'skewX(-20deg) translateX(50%)',
    }
}));

const FunctionCard = styled(Paper)(({ theme, color, disabled }) => ({
    padding: theme.spacing(2.5),
    borderRadius: 20,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: theme.palette.mode === 'light' ? '#fff' : alpha(theme.palette.background.paper, 0.6),
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: disabled ? 0.6 : 1,
    '&:hover': !disabled && {
        borderColor: theme.palette[color].main,
        transform: 'translateY(-4px)',
        boxShadow: `0 8px 20px -4px ${alpha(theme.palette[color].main, 0.2)}`,
        '& .icon-box': {
            transform: 'scale(1.1)',
            backgroundColor: theme.palette[color].main,
            color: '#fff',
        }
    }
}));

const FeedItem = styled(Box)(({ theme }) => ({
    padding: theme.spacing(1.5),
    borderRadius: 12,
    marginBottom: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    transition: 'background-color 0.2s ease',
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.04),
    }
}));

// --- SUB-COMPONENTS ---
const StatWidget = ({ title, count, icon, color, trend, loading }) => {
    const theme = useTheme();
    return (
        <StatCard color={color}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h3" fontWeight={800} sx={{ color: theme.palette[color].main }}>
                        {loading ? (
                            <Skeleton variant="text" width={80} height={60} animation="wave" />
                        ) : (
                            count !== null ? count : 0
                        )}
                    </Typography>
                </Box>
                <Avatar
                    variant="rounded"
                    sx={{
                        bgcolor: alpha(theme.palette[color].main, 0.1),
                        color: theme.palette[color].main,
                        width: 48, height: 48,
                        borderRadius: 3
                    }}
                >
                    {icon}
                </Avatar>
            </Stack>
            {trend && (
                <Stack direction="row" alignItems="center" spacing={0.5} mt={2}>
                    <TrendingUp fontSize="small" color={color} />
                    <Typography variant="caption" fontWeight={600} color={`${color}.main`}>
                        {trend}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        so với tháng trước
                    </Typography>
                </Stack>
            )}
        </StatCard>
    );
};

const ActivityFeed = ({ logs, navigate, loading }) => {
    return (
        <Paper
            sx={{
                p: 3,
                borderRadius: 4,
                height: '100%',
                bgcolor: theme => alpha(theme.palette.background.paper, 0.5),
                backdropFilter: 'blur(10px)',
                border: '1px solid',
                borderColor: 'divider'
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <History color="action" />
                    <Typography variant="h6" fontWeight={700}>Hoạt động mới</Typography>
                </Stack>
                <IconButton size="small" onClick={() => navigate('/admin/audit-log')}>
                    <ArrowForward fontSize="small" />
                </IconButton>
            </Stack>

            <Stack spacing={0.5}>
                {loading ? (
                    // [NEW] Skeleton Loading for Feed
                    Array.from(new Array(5)).map((_, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                            <Skeleton variant="circular" width={36} height={36} animation="wave" />
                            <Box sx={{ flex: 1 }}>
                                <Skeleton variant="text" width="90%" animation="wave" />
                                <Skeleton variant="text" width="60%" animation="wave" />
                            </Box>
                        </Box>
                    ))
                ) : logs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" align="center" py={4}>
                        Chưa có hoạt động nào
                    </Typography>
                ) : (
                    logs.map((log, index) => (
                        <FeedItem key={log.id || index}>
                            <Avatar
                                src={log.actor?.photoURL}
                                sx={{ width: 36, height: 36, fontSize: '0.875rem' }}
                            >
                                {log.actor?.email?.charAt(0)}
                            </Avatar>
                            <Box flexGrow={1} minWidth={0}>
                                <Typography variant="body2" fontWeight={600} noWrap>
                                    {log.action}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                    {log.actor?.email} • {log.target}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                                {log.createdAt?.seconds
                                    ? formatDistanceToNow(new Date(log.createdAt.seconds * 1000), { addSuffix: true, locale: vi })
                                    : 'Vừa xong'}
                            </Typography>
                        </FeedItem>
                    ))
                )}
            </Stack>
        </Paper>
    );
};

// --- COMPONENT CHÍNH ---
export default function AdminDashboard() {
    const navigate = useNavigate();
    const theme = useTheme();
    const [stats, setStats] = useState({ userCount: null, reportCount: null, departmentCount: null });
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true); // [NEW]
    const [searchTerm, setSearchTerm] = useState(""); // [NEW]

    // Data Fetching
    useEffect(() => {
        const fetchData = async () => {
            // Fetch Counts
            const getCount = async (coll) => (await getDocs(collection(db, coll))).size;

            // Fetch Logs
            const fetchLogs = async () => {
                try {
                    const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(6));
                    const snap = await getDocs(q);
                    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
                } catch (e) {
                    console.warn("Lỗi fetch logs:", e);
                    return [];
                }
            };

            const [u, r, d, logs] = await Promise.all([
                getCount('users'),
                getCount('weeklyReports'),
                getCount('departments'),
                fetchLogs()
            ]);

            setStats({ userCount: u, reportCount: r, departmentCount: d });
            setAuditLogs(logs);
            setLoading(false); // [NEW] Done loading
        };
        fetchData();
    }, []);

    // [NEW] Search Filter
    const filteredItems = useMemo(() => {
        return adminItems.filter(item =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    // Animations
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', position: 'relative' }}>
            {/* Background Decoration */}
            <Box sx={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '400px',
                background: theme.palette.mode === 'light'
                    ? `radial-gradient(circle at 10% 20%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 40%),
                       radial-gradient(circle at 90% 10%, ${alpha(theme.palette.secondary.main, 0.08)} 0%, transparent 40%)`
                    : 'none',
                zIndex: 0, pointerEvents: 'none'
            }} />

            <Stack spacing={4} sx={{ position: 'relative', zIndex: 1 }}>

                {/* 1. Header Section */}
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-end" spacing={2}>
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                            <VerifiedUser color="primary" sx={{ fontSize: 32 }} />
                            <Typography variant="h4" fontWeight={800}>Admin Dashboard</Typography>
                        </Stack>
                        <Typography variant="body1" color="text.secondary">
                            Tổng quan hệ thống & Phím tắt quản trị
                        </Typography>
                    </Box>
                    <Button variant="outlined" startIcon={<NotificationsActive />} sx={{ borderRadius: 3 }}>
                        Thông báo hệ thống
                    </Button>
                </Stack>

                {/* 2. Stats Grid */}
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatWidget
                            title="Tổng Nhân sự"
                            count={stats.userCount}
                            icon={<People />}
                            color="primary"
                            trend="+5%"
                            loading={loading} // [NEW]
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatWidget
                            title="Phòng ban"
                            count={stats.departmentCount}
                            icon={<AccountBalance />}
                            color="secondary"
                            loading={loading} // [NEW]
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatWidget
                            title="Báo cáo Tuần"
                            count={stats.reportCount}
                            icon={<Description />}
                            color="info"
                            trend="+12%"
                            loading={loading} // [NEW]
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatWidget
                            title="Cảnh báo / Lỗi"
                            count={0}
                            icon={<Settings />}
                            color="warning"
                            loading={loading} // [NEW]
                        />
                    </Grid>
                </Grid>

                {/* 3. Main Content Area */}
                <Grid container spacing={4}>
                    {/* Left: Functions Grid */}
                    <Grid item xs={12} md={8} lg={9}>
                        <motion.div variants={containerVariants} initial="hidden" animate="visible">
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={2}>
                                <Typography variant="h6" fontWeight={700}>
                                    Chức năng quản lý
                                </Typography>
                                {/* [NEW] Search Input */}
                                <TextField
                                    placeholder="Tìm chức năng..."
                                    size="small"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search fontSize="small" color="action" />
                                            </InputAdornment>
                                        ),
                                        sx: { bgcolor: 'background.paper', borderRadius: 2 }
                                    }}
                                    sx={{ width: 250 }}
                                />
                            </Stack>

                            <Grid container spacing={2}>
                                {filteredItems.map((item, index) => (
                                    <Grid item xs={12} sm={6} lg={4} key={index}>
                                        <motion.div variants={itemVariants}>
                                            <FunctionCard
                                                color={item.color}
                                                disabled={item.disabled}
                                                onClick={() => !item.disabled && navigate(item.path)}
                                            >
                                                <Stack direction="row" justifyContent="space-between" mb={2}>
                                                    <Avatar
                                                        className="icon-box"
                                                        sx={{
                                                            bgcolor: alpha(theme.palette[item.color].main, 0.1),
                                                            color: theme.palette[item.color].main,
                                                            borderRadius: 3,
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                    >
                                                        {item.icon}
                                                    </Avatar>
                                                    {item.countKey && (
                                                        <Chip
                                                            label={stats[item.countKey] || 0}
                                                            size="small"
                                                            color={item.color}
                                                            variant="soft"
                                                            sx={{ fontWeight: 700, borderRadius: 1 }}
                                                        />
                                                    )}
                                                </Stack>

                                                <Box mt="auto">
                                                    <Typography variant="h6" fontWeight={700} gutterBottom>
                                                        {item.title}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {item.description}
                                                    </Typography>
                                                </Box>
                                            </FunctionCard>
                                        </motion.div>
                                    </Grid>
                                ))}
                            </Grid>
                        </motion.div>
                    </Grid>

                    {/* Right: Activity Feed */}
                    <Grid item xs={12} md={4} lg={3}>
                        <ActivityFeed logs={auditLogs} navigate={navigate} loading={loading} />
                    </Grid>
                </Grid>
            </Stack>
        </Box>
    );
}
