import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Box, Paper, Grid, Typography, CardActionArea,
    Skeleton, Chip, styled, Alert,
    Stack, IconButton, Avatar
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import {
    LineChart, FolderKanban, PieChart, Construction, Building,
    BarChart3, TrendingUp, BookCheck, ArrowRight, 
    FileSpreadsheet, DollarSign, Activity,
    Clock, AlertCircle, CheckCircle, XCircle, ArrowUpRight,
    ArrowDownRight, MoreVertical,
    BookUser,
    ClipboardList,
    Landmark
} from "lucide-react";
import { useQuery } from "react-query";
import { Settings } from "@mui/icons-material";

// Constants
const CARD_BORDER_RADIUS = 12;
const GRID_SPACING = 2.5;

// ==================================================================
// CONFIGURATION
// ==================================================================

// Cấu hình các chức năng chính
const mainFunctions = [
    { 
        icon: <Construction size={24} />, 
        text: "Kế Hoạch Thi Công", 
        to: "/construction-plan", 
        desc: "Lập và theo dõi tiến độ",
        color: '#3b82f6',
        bgColor: '#eff6ff'
    },
    { 
        icon: <Building size={24} />, 
        text: "Quản Lý Công Trình", 
        to: "/project-manager", 
        desc: "Xem chi tiết công trình",
        color: '#8b5cf6',
        bgColor: '#f3e8ff'
    },
    { 
        icon: <BookCheck size={24} />, 
        text: "Phân bổ chi phí", 
        to: "/allocations", 
        desc: "Quản lý chi phí dự án",
        color: '#10b981',
        bgColor: '#d1fae5'
    },
    { 
        icon: <FileSpreadsheet size={24} />, 
        text: "Công Nợ Phải Trả", 
        to: "/construction-payables", 
        desc: "Theo dõi công nợ",
        color: '#f59e0b',
        bgColor: '#fef3c7',
        isNew: true 
    },
     { 
        icon: <BarChart3 size={24} />, 
        text: "Bảng Cân Đối Kế Toán", 
        to: "/balance-sheet", 
        desc: "Tình hình tài sản & nguồn vốn",
        color: '#14b8a6',
        bgColor: '#ccfbf1',
        isNew: true 
    },
     { 
        icon: <Landmark size={24} />, // Icon mới
        text: "Báo Cáo Sử Dụng Vốn", // Tên chức năng
        to: "/capital-utilization", // Đường dẫn đã tạo
        desc: "Kế hoạch & thực tế sử dụng", // Mô tả
        color: '#6366f1',
        bgColor: '#e0e7ff',
        isNew: true 
    },
     { 
        icon: <ClipboardList size={24} />, 
        text: "Hệ Thống Tài Khoản", 
        to: "/chart-of-accounts", 
        desc: "Danh mục tài khoản kế toán",
        color: '#64748b',
        bgColor: '#f1f5f9',
        isNew: true 
    },
    { 
        icon: <BookUser size={24} />, 
        text: "Báo cáo Nợ Có", 
        to: "/broker-debt-report", 
        desc: "Theo dõi số dư nợ có",
        color: '#ef4444',
        bgColor: '#fee2e2',
        isNew: true 
    },
    { 
        icon: <FileSpreadsheet size={24} />, 
        text: "Quản Lý Danh Mục", 
        to: "/categories", 
        desc: "Theo dõi công nợ",
        color: '#f59e0b',
        bgColor: '#fef3c7',
        isNew: true 
    },
    
];

// ✅ Cấu hình Báo cáo & Phân tích (ĐÃ BỔ SUNG ĐƯỜNG DẪN 'to')
const quickReports = [
    { 
        icon: <BarChart3 size={20} />, 
        title: 'Báo Cáo Lợi Nhuận', 
        desc: 'Phân tích theo quý',
        to: '/profit-report-quarter',
        color: '#3b82f6'
    },
    { 
        icon: <PieChart size={20} />, 
        title: 'Chi Phí Theo Quý', 
        desc: 'Theo dõi phân bổ',
        to: '/cost-allocation-quarter',
        color: '#8b5cf6'
    },
    { 
        icon: <LineChart size={20} />, 
        title: 'Lợi Nhuận Theo Năm', 
        desc: 'Báo cáo cả năm',
        to: '/profit-report-year',
        color: '#10b981'
    },
    { 
        icon: <TrendingUp size={20} />, 
        title: 'Tăng Giảm Lợi Nhuận', 
        desc: 'Phát sinh ảnh hưởng',
        to: '/profit-change',
        color: '#f59e0b'
    },
    { 
        icon: <PieChart size={20} />, 
        title: 'Báo Cáo Tổng Quát', 
        desc: 'Tổng hợp tình hình hoạt động',
        to: '/overall-report', // <-- Đường dẫn bạn đã tạo
        color: '#6366f1'
    },
];


// ==================================================================
// DATA HOOKS WITH REACT-QUERY
// ==================================================================
const useDashboardStats = () => {
    return useQuery('dashboardStats', async () => {
        await new Promise(resolve => setTimeout(resolve, 800)); 
        return {
            totalProjects: 12, activeProjects: 8,
            totalRevenue: 1585000000, totalCost: 834000000,
            profit: 751000000, profitMargin: 47.4,
        };
    }, { staleTime: 5 * 60 * 1000 });
};

const useRecentActivities = () => {
    return useQuery('recentActivities', async () => {
        await new Promise(resolve => setTimeout(resolve, 1200));
        return [
            { id: 1, type: 'success', title: 'Công trình A hoàn thành', time: '2 giờ trước' },
            { id: 2, type: 'warning', title: 'Công nợ sắp đến hạn', time: '3 giờ trước' },
            { id: 3, type: 'info', title: 'Cập nhật chi phí dự án B', time: '5 giờ trước' },
            { id: 4, type: 'error', title: 'Vượt ngân sách dự án C', time: '1 ngày trước' },
        ];
    }, { staleTime: 5 * 60 * 1000 });
};

// ==================================================================
// STYLED COMPONENTS
// ==================================================================
const DashboardContainer = styled(Box)(({ theme }) => ({
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    padding: theme.spacing(3),
}));
const HeaderSection = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(4),
}));
const StatCard = styled(Paper)(({ theme, trend }) => ({
    padding: theme.spacing(2.5),
    borderRadius: CARD_BORDER_RADIUS,
    border: '1px solid #e5e7eb',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280',
    }
}));
const FunctionCard = styled(CardActionArea)(({ theme, color, bgColor }) => ({
    padding: theme.spacing(3), borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: '#ffffff', border: '1px solid #e5e7eb',
    height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'flex-start', textAlign: 'left',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative', overflow: 'hidden',
    '& .icon-box': {
        width: 48, height: 48, borderRadius: 10, backgroundColor: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: theme.spacing(2), transition: 'all 0.3s ease', color: color,
    },
    '&:hover': {
        transform: `translateY(-4px)`,
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)',
        borderColor: color,
        '& .icon-box': { transform: 'rotate(-5deg) scale(1.1)' },
        '& .arrow-icon': { opacity: 1, transform: 'translateX(0)' }
    },
    '& .arrow-icon': {
        position: 'absolute', top: theme.spacing(2), right: theme.spacing(2),
        opacity: 0, transform: 'translateX(-10px)', transition: 'all 0.3s ease', color: color,
    }
}));
const QuickActionCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2), borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: '#ffffff', border: '1px solid #e5e7eb',
    transition: 'all 0.2s ease', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: theme.spacing(2),
    '&:hover': {
        backgroundColor: '#f9fafb', borderColor: theme.palette.primary.main,
        transform: 'translateX(4px)',
        '& .action-arrow': { transform: 'translateX(4px)' }
    }
}));
const ActivityItem = styled(Box)(({ theme }) => ({
    display: 'flex', alignItems: 'flex-start',
    gap: theme.spacing(2), padding: theme.spacing(2),
    borderRadius: 8,
}));

// ==================================================================
// UTILITY FUNCTIONS
// ==================================================================
const formatVND = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)} Tỷ`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)} Tr`;
    return new Intl.NumberFormat('vi-VN').format(num);
};

// ==================================================================
// MAIN COMPONENT
// ==================================================================
export default function Home() {
    const { data: stats, isLoading: isLoadingStats, isError: isStatsError, error: statsError } = useDashboardStats();
    const { data: recentActivities = [], isLoading: isLoadingActivities, isError: isActivitiesError, error: activitiesError } = useRecentActivities();

    const kpiCards = [
        { title: 'Tổng Dự Án', value: stats?.totalProjects || 0, subValue: `${stats?.activeProjects || 0} đang hoạt động`, icon: <FolderKanban size={20} />, trend: 'up', trendValue: '+15%', color: '#3b82f6' },
        { title: 'Doanh Thu', value: formatNumber(stats?.totalRevenue), subValue: formatVND(stats?.totalRevenue), icon: <DollarSign size={20} />, trend: 'up', trendValue: '+23%', color: '#10b981' },
        { title: 'Chi Phí', value: formatNumber(stats?.totalCost), subValue: formatVND(stats?.totalCost), icon: <Activity size={20} />, trend: 'down', trendValue: '-8%', color: '#ef4444' },
        { title: 'Lợi Nhuận', value: `${stats?.profitMargin || 0}%`, subValue: formatVND(stats?.profit), icon: <TrendingUp size={20} />, trend: 'up', trendValue: '+12%', color: '#8b5cf6' }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };
    
    if (isStatsError || isActivitiesError) {
        return (
            <DashboardContainer>
                 <Alert severity="error">
                    Không thể tải dữ liệu Dashboard. Lỗi: {statsError?.message || activitiesError?.message}
                </Alert>
            </DashboardContainer>
        )
    }

    return (
        <DashboardContainer>
            <HeaderSection>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Dashboard Tổng Quan</Typography>
                    <Typography variant="body1" color="text.secondary">
                        Chào mừng trở lại! Đây là tình hình kinh doanh hôm nay.
                    </Typography>
                </Box>
                <Chip 
                    label={`Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`}
                    size="small"
                    icon={<Clock size={14} />}
                />
            </HeaderSection>

            {/* KPI Cards */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <Grid container spacing={GRID_SPACING} mb={4}>
                    {kpiCards.map((card, index) => (
                        <Grid item xs={12} sm={6} lg={3} key={index}>
                            <motion.div variants={itemVariants}>
                                <StatCard trend={card.trend}>
                                    {isLoadingStats ? (
                                        <>
                                            <Skeleton width="60%" height={20} />
                                            <Skeleton width="40%" height={32} sx={{ my: 1 }} />
                                            <Skeleton width="50%" height={16} />
                                        </>
                                    ) : (
                                        <>
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                               <Box>
                                                    <Typography variant="body2" color="text.secondary">{card.title}</Typography>
                                                    <Typography variant="h4" fontWeight={700}>{card.value}</Typography>
                                                </Box>
                                                <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: alpha(card.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                                                    {card.icon}
                                                </Box>
                                            </Stack>
                                            <Stack direction="row" alignItems="center" spacing={1} mt={2}>
                                                <Chip size="small" label={card.trendValue} icon={card.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} sx={{ backgroundColor: alpha(card.trend === 'up' ? '#10b981' : '#ef4444', 0.1), color: card.trend === 'up' ? '#10b981' : '#ef4444', '& .MuiChip-icon': { color: 'inherit' } }} />
                                                <Typography variant="caption" color="text.secondary">{card.subValue}</Typography>
                                            </Stack>
                                        </>
                                    )}
                                </StatCard>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </motion.div>

            {/* Main Functions */}
            <Typography variant="h5" fontWeight={600} mb={3}>Chức Năng Chính</Typography>
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <Grid container spacing={GRID_SPACING} mb={4}>
                    {mainFunctions.map((func, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                            <motion.div variants={itemVariants} style={{ height: '100%' }}>
                                <FunctionCard component={Link} to={func.to} color={func.color} bgColor={func.bgColor}>
                                    <Box className="icon-box">{func.icon}</Box>
                                    <Stack spacing={0.5} sx={{ width: '100%' }}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Typography variant="h6" fontWeight={600}>{func.text}</Typography>
                                            {func.isNew && (<Chip label="Mới" size="small" sx={{ height: 20, backgroundColor: '#fee2e2', color: '#ef4444', fontWeight: 600 }} />)}
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">{func.desc}</Typography>
                                    </Stack>
                                    <ArrowUpRight className="arrow-icon" size={20} />
                                </FunctionCard>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </motion.div>
            
            <Grid container spacing={GRID_SPACING}>
                {/* Quick Reports Section */}
                <Grid item xs={12} lg={8}>
                     <Paper sx={{ p: 3, borderRadius: CARD_BORDER_RADIUS / 1.5, border: '1px solid #e5e7eb', height: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                            <Typography variant="h6" fontWeight={600}>Báo Cáo & Phân Tích</Typography>
                            <IconButton size="small"><MoreVertical size={20} /></IconButton>
                        </Stack>
                        <Grid container spacing={2}>
                            {quickReports.map((action, index) => (
                                <Grid item xs={12} sm={6} key={index}>
                                    <QuickActionCard component={Link} to={action.to} sx={{ textDecoration: 'none' }}>
                                        <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: alpha(action.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color, flexShrink: 0 }}>
                                            {action.icon}
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body1" fontWeight={600}>{action.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">{action.desc}</Typography>
                                        </Box>
                                        <ArrowRight className="action-arrow" size={18} style={{ color: '#9ca3af', transition: 'all 0.2s ease' }} />
                                    </QuickActionCard>
                                </Grid>
                            ))}
                        </Grid>
                     </Paper>
                </Grid>

                {/* Recent Activities Section */}
                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, borderRadius: CARD_BORDER_RADIUS / 1.5, border: '1px solid #e5e7eb', height: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight={600}>Hoạt Động Gần Đây</Typography>
                            <Chip size="small" label={`${recentActivities.length} mới`} sx={{ backgroundColor: '#fee2e2', color: '#ef4444' }} />
                        </Stack>
                        <Stack spacing={0}>
                            {isLoadingActivities ? (
                                Array.from(new Array(4)).map((_, index) => <Skeleton key={index} height={60} sx={{my: 1}} />)
                            ) : (
                                <AnimatePresence>
                                    {recentActivities.map((activity, index) => (
                                        <motion.div key={activity.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                                            <ActivityItem>
                                                <Avatar sx={{ width: 36, height: 36, backgroundColor: activity.type === 'success' ? '#d1fae5' : activity.type === 'warning' ? '#fef3c7' : activity.type === 'error' ? '#fee2e2' : '#e0e7ff', color: activity.type === 'success' ? '#10b981' : activity.type === 'warning' ? '#f59e0b' : activity.type === 'error' ? '#ef4444' : '#6366f1' }}>
                                                    {activity.type === 'success' ? <CheckCircle size={18} /> : activity.type === 'warning' ? <AlertCircle size={18} /> : activity.type === 'error' ? <XCircle size={18} /> : <Activity size={18} />}
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight={500}>{activity.title}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{activity.time}</Typography>
                                                </Box>
                                            </ActivityItem>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </DashboardContainer>
    );
}