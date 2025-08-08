import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Box, Paper, Grid, Typography, CardActionArea,
    Skeleton, Chip, styled, LinearProgress,
    Stack, IconButton, Avatar, Badge, Tooltip
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import {
    LineChart, FolderKanban, PieChart, Construction, Building,
    Settings, BarChart3, TrendingUp, BookCheck, ArrowRight, 
    FileSpreadsheet, DollarSign, Activity, Users, Package,
    Clock, AlertCircle, CheckCircle, XCircle, ArrowUpRight,
    ArrowDownRight, Minus, MoreVertical,
    BookUser
} from "lucide-react";

// Constants
const CARD_BORDER_RADIUS = 12;
const HOVER_SCALE = 1.02;
const GRID_SPACING = 2.5;

// Main functions configuration
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
     // BẠN THÊM KHỐI CODE MỚI VÀO ĐÂY
    { 
        icon: <BookUser size={24} />, 
        text: "Báo cáo Nợ Cò", 
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

// Styled Components
const DashboardContainer = styled(Box)(({ theme }) => ({
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    padding: theme.spacing(3),
    [theme.breakpoints.up('lg')]: {
        padding: theme.spacing(4),
    },
}));

const HeaderSection = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(4),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
}));

const StatCard = styled(Paper)(({ theme, trend }) => ({
    padding: theme.spacing(2.5),
    borderRadius: CARD_BORDER_RADIUS,
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    
    '&:hover': {
        transform: `translateY(-4px) scale(${HOVER_SCALE})`,
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
        borderColor: theme.palette.primary.main,
    },
    
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280',
    }
}));

const FunctionCard = styled(CardActionArea)(({ theme, color, bgColor }) => ({
    padding: theme.spacing(3),
    borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    
    '& .icon-box': {
        width: 48,
        height: 48,
        borderRadius: 10,
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing(2),
        transition: 'all 0.3s ease',
        color: color,
    },
    
    '&:hover': {
        transform: `translateY(-4px)`,
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)',
        borderColor: color,
        
        '& .icon-box': {
            transform: 'rotate(-5deg) scale(1.1)',
        },
        
        '& .arrow-icon': {
            opacity: 1,
            transform: 'translateX(0)',
        }
    },
    
    '& .arrow-icon': {
        position: 'absolute',
        top: theme.spacing(2),
        right: theme.spacing(2),
        opacity: 0,
        transform: 'translateX(-10px)',
        transition: 'all 0.3s ease',
        color: color,
    }
}));

const QuickActionCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2),
    borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    
    '&:hover': {
        backgroundColor: '#f9fafb',
        borderColor: theme.palette.primary.main,
        transform: 'translateX(4px)',
        
        '& .action-arrow': {
            transform: 'translateX(4px)',
        }
    }
}));

const ActivityItem = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: 8,
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    
    '&:hover': {
        backgroundColor: '#f9fafb',
    }
}));

// Utility Functions
const formatVND = (value) => {
    if (!value) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

// Main Component
export default function Home() {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [recentActivities, setRecentActivities] = useState([]);

    useEffect(() => {
        // Simulate data loading
        setTimeout(() => {
            setStats({
                totalProjects: 12,
                activeProjects: 8,
                totalRevenue: 1585000000,
                totalCost: 834000000,
                profit: 751000000,
                profitMargin: 47.4,
                pendingPayables: 125000000,
                overduePayables: 15000000
            });
            
            setRecentActivities([
                { id: 1, type: 'success', title: 'Công trình A hoàn thành', time: '2 giờ trước' },
                { id: 2, type: 'warning', title: 'Công nợ sắp đến hạn', time: '3 giờ trước' },
                { id: 3, type: 'info', title: 'Cập nhật chi phí dự án B', time: '5 giờ trước' },
                { id: 4, type: 'error', title: 'Vượt ngân sách dự án C', time: '1 ngày trước' },
            ]);
            
            setLoading(false);
        }, 1000);
    }, []);

    const kpiCards = [
        {
            title: 'Tổng Dự Án',
            value: stats?.totalProjects || 0,
            subValue: `${stats?.activeProjects || 0} đang hoạt động`,
            icon: <FolderKanban size={20} />,
            trend: 'up',
            trendValue: '+15%',
            color: '#3b82f6'
        },
        {
            title: 'Doanh Thu',
            value: formatNumber(stats?.totalRevenue || 0),
            subValue: formatVND(stats?.totalRevenue),
            icon: <DollarSign size={20} />,
            trend: 'up',
            trendValue: '+23%',
            color: '#10b981'
        },
        {
            title: 'Chi Phí',
            value: formatNumber(stats?.totalCost || 0),
            subValue: formatVND(stats?.totalCost),
            icon: <Activity size={20} />,
            trend: 'down',
            trendValue: '-8%',
            color: '#ef4444'
        },
        {
            title: 'Lợi Nhuận',
            value: `${stats?.profitMargin || 0}%`,
            subValue: formatVND(stats?.profit),
            icon: <TrendingUp size={20} />,
            trend: 'up',
            trendValue: '+12%',
            color: '#8b5cf6'
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100,
                damping: 10
            }
        }
    };

    return (
        <DashboardContainer>
            <HeaderSection>
                <Box>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        Dashboard Tổng Quan
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Chào mừng trở lại! Đây là tình hình kinh doanh hôm nay.
                    </Typography>
                </Box>
                
                <Stack direction="row" spacing={2}>
                    <Chip 
                        label={`Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`}
                        size="small"
                        icon={<Clock size={14} />}
                    />
                </Stack>
            </HeaderSection>

            {/* KPI Cards */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <Grid container spacing={GRID_SPACING} mb={4}>
                    {kpiCards.map((card, index) => (
                        <Grid item xs={12} sm={6} lg={3} key={index}>
                            <motion.div variants={itemVariants}>
                                <StatCard trend={card.trend}>
                                    {loading ? (
                                        <>
                                            <Skeleton width="60%" height={20} />
                                            <Skeleton width="40%" height={32} sx={{ my: 1 }} />
                                            <Skeleton width="50%" height={16} />
                                        </>
                                    ) : (
                                        <>
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                                        {card.title}
                                                    </Typography>
                                                    <Typography variant="h4" fontWeight={700}>
                                                        {card.value}
                                                    </Typography>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 2,
                                                        backgroundColor: alpha(card.color, 0.1),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: card.color
                                                    }}
                                                >
                                                    {card.icon}
                                                </Box>
                                            </Stack>
                                            
                                            <Stack direction="row" alignItems="center" spacing={1} mt={2}>
                                                <Chip
                                                    size="small"
                                                    label={card.trendValue}
                                                    icon={card.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                    sx={{
                                                        backgroundColor: alpha(card.trend === 'up' ? '#10b981' : '#ef4444', 0.1),
                                                        color: card.trend === 'up' ? '#10b981' : '#ef4444',
                                                        '& .MuiChip-icon': {
                                                            color: 'inherit'
                                                        }
                                                    }}
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    {card.subValue}
                                                </Typography>
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
            <Typography variant="h5" fontWeight={600} mb={3}>
                Chức Năng Chính
            </Typography>
            
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <Grid container spacing={GRID_SPACING} mb={4}>
                    {mainFunctions.map((func, index) => (
                        <Grid item xs={12} sm={6} lg={3} key={index}>
                            <motion.div variants={itemVariants} style={{ height: '100%' }}>
                                <FunctionCard
                                    component={Link}
                                    to={func.to}
                                    color={func.color}
                                    bgColor={func.bgColor}
                                >
                                    <Box className="icon-box">
                                        {func.icon}
                                    </Box>
                                    
                                    <Stack spacing={0.5} sx={{ width: '100%' }}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Typography variant="h6" fontWeight={600}>
                                                {func.text}
                                            </Typography>
                                            {func.isNew && (
                                                <Chip
                                                    label="Mới"
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        backgroundColor: '#fee2e2',
                                                        color: '#ef4444',
                                                        fontWeight: 600
                                                    }}
                                                />
                                            )}
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                            {func.desc}
                                        </Typography>
                                    </Stack>
                                    
                                    <ArrowUpRight className="arrow-icon" size={20} />
                                </FunctionCard>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </motion.div>

            {/* Bottom Section */}
            <Grid container spacing={GRID_SPACING}>
                {/* Quick Actions */}
                <Grid item xs={12} lg={8}>
                    <Paper
                        sx={{
                            p: 3,
                            borderRadius: CARD_BORDER_RADIUS / 8,
                            border: '1px solid #e5e7eb',
                            height: '100%'
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                            <Typography variant="h6" fontWeight={600}>
                                Báo Cáo & Phân Tích
                            </Typography>
                            <IconButton size="small">
                                <MoreVertical size={20} />
                            </IconButton>
                        </Stack>
                        
                        <Grid container spacing={2}>
                            {[
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
                            ].map((action, index) => (
                                <Grid item xs={12} sm={6} key={index}>
                                    <QuickActionCard component={Link} to={action.to}>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                backgroundColor: alpha(action.color, 0.1),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: action.color,
                                                flexShrink: 0
                                            }}
                                        >
                                            {action.icon}
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body1" fontWeight={600}>
                                                {action.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {action.desc}
                                            </Typography>
                                        </Box>
                                        <ArrowRight className="action-arrow" size={18} style={{ color: '#9ca3af', transition: 'all 0.2s ease' }} />
                                    </QuickActionCard>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                </Grid>

                {/* Recent Activities */}
                <Grid item xs={12} lg={4}>
                    <Paper
                        sx={{
                            p: 3,
                            borderRadius: CARD_BORDER_RADIUS / 8,
                            border: '1px solid #e5e7eb',
                            height: '100%'
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                            <Typography variant="h6" fontWeight={600}>
                                Hoạt Động Gần Đây
                            </Typography>
                            <Chip
                                size="small"
                                label={`${recentActivities.length} mới`}
                                sx={{ backgroundColor: '#fee2e2', color: '#ef4444' }}
                            />
                        </Stack>
                        
                        <Stack spacing={1}>
                            {loading ? (
                                <>
                                    <Skeleton height={60} />
                                    <Skeleton height={60} />
                                    <Skeleton height={60} />
                                </>
                            ) : (
                                <AnimatePresence>
                                    {recentActivities.map((activity, index) => (
                                        <motion.div
                                            key={activity.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <ActivityItem>
                                                <Avatar
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        backgroundColor:
                                                            activity.type === 'success' ? '#d1fae5' :
                                                            activity.type === 'warning' ? '#fef3c7' :
                                                            activity.type === 'error' ? '#fee2e2' : '#e0e7ff',
                                                        color:
                                                            activity.type === 'success' ? '#10b981' :
                                                            activity.type === 'warning' ? '#f59e0b' :
                                                            activity.type === 'error' ? '#ef4444' : '#6366f1'
                                                    }}
                                                >
                                                    {activity.type === 'success' ? <CheckCircle size={18} /> :
                                                     activity.type === 'warning' ? <AlertCircle size={18} /> :
                                                     activity.type === 'error' ? <XCircle size={18} /> :
                                                     <Activity size={18} />}
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {activity.title}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {activity.time}
                                                    </Typography>
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