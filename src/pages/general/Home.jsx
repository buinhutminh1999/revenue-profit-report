import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import {
    Box, Card, CardContent, Typography, Grid, Badge, CircularProgress,
    Paper, TextField, InputAdornment, Chip, Avatar, Stack, IconButton,
    Tooltip, Skeleton, alpha, useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    Construction, Business as Building, LibraryBooks as BookCheck, TableView as FileSpreadsheet, BarChart as BarChart3,
    AccountBalance as Landmark, Assignment as ClipboardList, ImportContacts as BookUser, PieChart, ShowChart as LineChart, TrendingUp,
    RuleFolder as FileCheck2, Assessment as FileBarChart2, SwapHoriz as ArrowRightLeft, GppBad as ShieldOff,
    HowToReg as UserCheck, Search, AssignmentTurnedIn as ClipboardCheck, Close as X, FilterList as Filter, AutoAwesome as Sparkles, Star,
    TrendingDown, MonitorHeart as Activity, Bolt as Zap
} from '@mui/icons-material';

// Enhanced Styled Card với glassmorphism
const StyledCard = styled(Card)(({ theme, color }) => ({
    height: '100%',
    borderRadius: 24,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    background: `linear-gradient(145deg, #ffffff 0%, ${alpha('#f8fafc', 0.6)} 100%)`,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '100%',
        background: `linear-gradient(180deg, ${alpha(color || theme.palette.primary.main, 0.05)} 0%, transparent 100%)`,
        opacity: 0,
        transition: 'opacity 0.4s ease',
    },
    '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: `0 20px 40px ${alpha(color || theme.palette.primary.main, 0.12)}`,
        borderColor: alpha(color || theme.palette.primary.main, 0.3),
        '&::before': {
            opacity: 1,
        },
        '& .icon-box': {
            transform: 'scale(1.1) rotate(5deg)',
            background: `linear-gradient(135deg, ${color || theme.palette.primary.main} 0%, ${alpha(color || theme.palette.primary.main, 0.8)} 100%)`,
            boxShadow: `0 8px 20px ${alpha(color || theme.palette.primary.main, 0.4)}`,
        }
    },
}));

// Glassmorphism Header
const GlassHeader = styled(Paper)(({ theme }) => ({
    background: `linear-gradient(135deg, ${alpha('#ffffff', 0.9)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`,
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent)',
    },
}));

// Stats Card
const StatCard = styled(Paper)(({ theme, color }) => ({
    padding: theme.spacing(2.5),
    borderRadius: 16,
    background: `linear-gradient(135deg, ${alpha(color || theme.palette.primary.main, 0.1)} 0%, ${alpha(color || theme.palette.primary.main, 0.05)} 100%)`,
    border: `1.5px solid ${alpha(color || theme.palette.primary.main, 0.2)}`,
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 24px ${alpha(color || theme.palette.primary.main, 0.15)}`,
    },
}));

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            delay: i * 0.05,
            duration: 0.5,
            type: "spring",
            stiffness: 100,
            damping: 15,
        },
    }),
};

const Home = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [allowedModules, setAllowedModules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');

    // All modules
    const allModules = [
        { category: 'Chức Năng Chính', icon: <UserCheck sx={{ fontSize: 26 }} />, title: "Quản Lý Chấm Công", to: "/attendance", desc: "Theo dõi, quản lý và in bảng chấm công", color: '#16a34a', isNew: true },
        { category: 'Chức Năng Chính', icon: <Construction sx={{ fontSize: 26 }} />, title: "Kế Hoạch Thi Công", to: "/construction-plan", desc: "Lập và theo dõi tiến độ công việc", color: '#3b82f6' },
        { category: 'Chức Năng Chính', icon: <Building sx={{ fontSize: 26 }} />, title: "Quản Lý Công Trình", to: "/project-manager", desc: "Xem chi tiết thông tin các công trình", color: '#8b5cf6' },
        { category: 'Chức Năng Chính', icon: <ArrowRightLeft sx={{ fontSize: 26 }} />, title: "QL Luân chuyển Tài sản", to: "/asset-transfer", desc: "Theo dõi và luân chuyển tài sản", color: '#0891b2', isNew: true },
        { category: 'Chức Năng Chính', icon: <ClipboardCheck sx={{ fontSize: 26 }} />, title: "So Sánh Báo Giá Vật Tư", to: "/material-price-comparison", desc: "Tổng hợp, so sánh giá từ nhà cung cấp", color: '#f97316', isNew: true },
        { category: 'Chức Năng Chính', icon: <BookCheck sx={{ fontSize: 26 }} />, title: "Phân Bổ Chi Phí", to: "/allocations", desc: "Quản lý và phân bổ chi phí dự án", color: '#10b981' },
        { category: 'Chức Năng Chính', icon: <FileSpreadsheet sx={{ fontSize: 26 }} />, title: "Công Nợ Phải Trả", to: "/construction-payables", desc: "Theo dõi và quản lý các khoản công nợ", color: '#f59e0b' },
        { category: 'Chức Năng Chính', icon: <FileCheck2 sx={{ fontSize: 26 }} />, title: "Công Nợ Phải Thu", to: "/accounts-receivable", desc: "Theo dõi các khoản phải thu từ khách hàng", color: '#ec4899' },
        { category: 'Chức Năng Chính', icon: <BarChart3 sx={{ fontSize: 26 }} />, title: "Bảng Cân Đối Kế Toán", to: "/balance-sheet", desc: "Tình hình tài sản và nguồn vốn", color: '#14b8a6' },
        { category: 'Chức Năng Chính', icon: <ClipboardList sx={{ fontSize: 26 }} />, title: "Hệ Thống Tài Khoản", to: "/chart-of-accounts", desc: "Danh mục các tài khoản kế toán", color: '#64748b' },
        { category: 'Chức Năng Chính', icon: <FileSpreadsheet sx={{ fontSize: 26 }} />, title: "Quản Lý Danh Mục", to: "/categories", desc: "Theo dõi công nợ", color: '#f59e0b' },
        { category: 'Chức Năng Chính', icon: <PieChart sx={{ fontSize: 26 }} />, title: 'Chi Phí Theo Quý', to: '/cost-allocation-quarter', desc: 'Theo dõi phân bổ chi phí', color: '#8b5cf6' },
        { category: 'Chức Năng Chính', icon: <TrendingUp sx={{ fontSize: 26 }} />, title: 'Tăng Giảm Lợi Nhuận', to: '/profit-change', desc: 'Phân tích các yếu tố ảnh hưởng', color: '#f59e0b' },
        { category: 'Báo Cáo', icon: <Landmark sx={{ fontSize: 26 }} />, title: "Báo Cáo Sử Dụng Vốn", to: "/reports/capital-utilization", desc: "Đối chiếu kế hoạch và thực tế sử dụng", color: '#6366f1' },
        { category: 'Báo Cáo', icon: <BookUser sx={{ fontSize: 26 }} />, title: "Báo Cáo Nợ Có", to: "/reports/broker-debt", desc: "Theo dõi và đối chiếu số dư nợ có", color: '#ef4444' },
        { category: 'Báo Cáo', icon: <BarChart3 sx={{ fontSize: 26 }} />, title: 'Báo Cáo Lợi Nhuận Quý', to: '/reports/profit-quarter', desc: 'Phân tích theo từng quý', color: '#3b82f6' },
        { category: 'Báo Cáo', icon: <FileBarChart2 sx={{ fontSize: 26 }} />, title: "Báo cáo Phân bổ Chi phí", to: "/reports/quarterly-cost-allocation", desc: "Phân bổ chi phí theo doanh thu dự án", color: '#0d9488' },
        { category: 'Báo Cáo', icon: <LineChart sx={{ fontSize: 26 }} />, title: 'Báo Cáo Lợi Nhuận Năm', to: '/reports/profit-year', desc: 'Xem báo cáo tổng kết năm', color: '#10b981' },
        { category: 'Báo Cáo', icon: <PieChart sx={{ fontSize: 26 }} />, title: 'Báo Cáo Tổng Quát', to: '/reports/overall', desc: 'Tổng hợp tình hình hoạt động', color: '#6366f1' },
    ];

    useEffect(() => {
        const fetchPermissionsAndFilterModules = async () => {
            if (!user) return;
            if (user.role === 'admin') {
                setAllowedModules(allModules);
                setIsLoading(false);
                return;
            }
            const whitelistDocRef = doc(db, 'configuration', 'accessControl');
            try {
                const docSnap = await getDoc(whitelistDocRef);
                const rules = docSnap.exists() ? docSnap.data() : {};
                const filteredModules = allModules.filter(module => {
                    const pathKey = module.to.startsWith('/') ? module.to.substring(1) : module.to;
                    return rules[pathKey]?.includes(user.email);
                });
                setAllowedModules(filteredModules);
            } catch (error) {
                console.error("Lỗi khi tải và lọc module:", error);
                setAllowedModules([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPermissionsAndFilterModules();
    }, [user]);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = ['Tất cả', ...new Set(allowedModules.map(m => m.category))];
        return cats;
    }, [allowedModules]);

    // Filter modules
    const filteredModules = useMemo(() => {
        let filtered = allowedModules;

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(module =>
                module.title.toLowerCase().includes(query) ||
                module.desc.toLowerCase().includes(query) ||
                module.category.toLowerCase().includes(query)
            );
        }

        // Filter by category
        if (selectedCategory !== 'Tất cả') {
            filtered = filtered.filter(module => module.category === selectedCategory);
        }

        return filtered;
    }, [allowedModules, searchQuery, selectedCategory]);

    // Group modules by category
    const groupedModules = useMemo(() => {
        return filteredModules.reduce((acc, module) => {
            const category = module.category || 'Khác';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(module);
            return acc;
        }, {});
    }, [filteredModules]);

    // Stats
    const stats = useMemo(() => {
        const total = allowedModules.length;
        const newCount = allowedModules.filter(m => m.isNew).length;
        const mainFeatures = allowedModules.filter(m => m.category === 'Chức Năng Chính').length;
        const reports = allowedModules.filter(m => m.category === 'Báo Cáo').length;
        return { total, newCount, mainFeatures, reports };
    }, [allowedModules]);

    // Clear search
    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
    }, []);

    // Highlight search term
    const highlightText = useCallback((text, query) => {
        if (!query) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <mark key={i} style={{ background: alpha(theme.palette.primary.main, 0.2), padding: '0 2px', borderRadius: 3 }}>
                    {part}
                </mark>
            ) : (
                part
            )
        );
    }, [theme]);

    if (isLoading) {
        return (
            <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', p: { xs: 2, sm: 4 } }}>
                <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
                    <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3, mb: 4 }} />
                    <Grid container spacing={3}>
                        {[...Array(6)].map((_, i) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3 }} />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', p: { xs: 2, sm: 4 } }}>
            <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
                {/* Enhanced Header */}
                <Box>
                    <GlassHeader elevation={0} sx={{ p: { xs: 3, sm: 4, md: 5 }, mb: 5, borderRadius: 4 }}>
                        <Stack spacing={3}>
                            {/* Welcome Section */}
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                                    <motion.div
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                    >
                                        <Sparkles sx={{ fontSize: 32 }} color={theme.palette.primary.main} />
                                    </motion.div>
                                    <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#1e293b' }}>
                                        Trung Tâm Điều Hành ERP
                                    </Typography>
                                </Stack>
                                <Typography sx={{ color: '#64748b', mt: 0.5, fontSize: '1.05rem' }}>
                                    Chào mừng, <strong>{user?.displayName || user?.email || 'bạn'}</strong>! Khởi động công việc của bạn.
                                </Typography>
                            </Box>

                            {/* Stats Cards */}
                            {/* Stats Cards */}
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        <StatCard color={theme.palette.primary.main}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, borderRadius: '12px' }}>
                                                    <Activity sx={{ fontSize: 20 }} />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                                                        {stats.total}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                                        Tổng chức năng
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </StatCard>
                                    </motion.div>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        <StatCard color="#f97316">
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar sx={{ bgcolor: alpha('#f97316', 0.1), color: '#f97316', borderRadius: '12px' }}>
                                                    <Zap sx={{ fontSize: 20 }} />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#f97316' }}>
                                                        {stats.newCount}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                                        Mới
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </StatCard>
                                    </motion.div>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        <StatCard color="#10b981">
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar sx={{ bgcolor: alpha('#10b981', 0.1), color: '#10b981', borderRadius: '12px' }}>
                                                    <TrendingUp sx={{ fontSize: 20 }} />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#10b981' }}>
                                                        {stats.mainFeatures}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                                        Chức năng chính
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </StatCard>
                                    </motion.div>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        <StatCard color="#6366f1">
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar sx={{ bgcolor: alpha('#6366f1', 0.1), color: '#6366f1', borderRadius: '12px' }}>
                                                    <BarChart3 sx={{ fontSize: 20 }} />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#6366f1' }}>
                                                        {stats.reports}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                                        Báo cáo
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </StatCard>
                                    </motion.div>
                                </Grid>
                            </Grid>

                            {/* Search and Filter */}
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    placeholder="Tìm kiếm chức năng (ví dụ: Công nợ, Kế hoạch, Báo cáo...)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search sx={{ fontSize: 20 }} color={theme.palette.primary.main} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: searchQuery && (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={handleClearSearch} edge="end">
                                                    <X sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                        sx: {
                                            borderRadius: '14px',
                                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                                            '& fieldset': {
                                                borderColor: alpha(theme.palette.primary.main, 0.2),
                                                borderWidth: 1.5,
                                            },
                                            '&:hover fieldset': {
                                                borderColor: alpha(theme.palette.primary.main, 0.4),
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: theme.palette.primary.main,
                                                borderWidth: 2,
                                            },
                                        },
                                    }}
                                />

                                {/* Category Filter */}
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {categories.map((cat) => (
                                        <Chip
                                            key={cat}
                                            label={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            icon={cat === selectedCategory ? <Filter sx={{ fontSize: 16 }} /> : undefined}
                                            sx={{
                                                bgcolor: cat === selectedCategory
                                                    ? theme.palette.primary.main
                                                    : alpha(theme.palette.primary.main, 0.1),
                                                color: cat === selectedCategory ? '#fff' : theme.palette.primary.main,
                                                fontWeight: cat === selectedCategory ? 700 : 500,
                                                '&:hover': {
                                                    bgcolor: cat === selectedCategory
                                                        ? alpha(theme.palette.primary.main, 0.9)
                                                        : alpha(theme.palette.primary.main, 0.15),
                                                },
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Stack>
                        </Stack>
                    </GlassHeader>
                </Box>

                {/* Modules Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {Object.entries(groupedModules).map(([category, modules]) => (
                        <Box key={category} sx={{ mb: 6 }}>
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                                    <Box
                                        sx={{
                                            width: 4,
                                            height: 32,
                                            borderRadius: 2,
                                            background: `linear-gradient(180deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.5)})`,
                                        }}
                                    />
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                        }}
                                    >
                                        {category}
                                        <Chip
                                            label={modules.length}
                                            size="small"
                                            sx={{
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                color: theme.palette.primary.main,
                                                fontWeight: 700,
                                                height: 24,
                                            }}
                                        />
                                    </Typography>
                                </Stack>
                            </motion.div>

                            <Grid container spacing={3}>
                                <AnimatePresence>
                                    {modules.map((module, index) => (
                                        <Grid
                                            size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                                            key={module.to}
                                        >
                                            <motion.div
                                                custom={index}
                                                initial="hidden"
                                                animate="visible"
                                                variants={cardVariants}
                                                style={{ height: '100%' }}
                                                whileHover={{ scale: 1.02 }}
                                            >
                                                <Link to={module.to} style={{ textDecoration: 'none' }}>
                                                    <StyledCard color={module.color}>
                                                        {module.isNew && (
                                                            <Badge
                                                                badgeContent="NEW"
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 12,
                                                                    right: 12,
                                                                    zIndex: 1,
                                                                    '& .MuiBadge-badge': {
                                                                        bgcolor: '#f97316',
                                                                        color: 'white',
                                                                        fontWeight: 700,
                                                                        fontSize: '0.65rem',
                                                                        p: '0 8px',
                                                                        height: 20,
                                                                        borderRadius: '10px',
                                                                        boxShadow: `0 2px 8px ${alpha('#f97316', 0.4)}`,
                                                                    },
                                                                }}
                                                            />
                                                        )}
                                                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                            <Box
                                                                className="icon-box"
                                                                sx={{
                                                                    width: 56,
                                                                    height: 56,
                                                                    borderRadius: '16px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    background: `linear-gradient(135deg, ${alpha(module.color, 0.1)} 0%, ${alpha(module.color, 0.2)} 100%)`,
                                                                    color: module.color,
                                                                    mb: 2,
                                                                    flexShrink: 0,
                                                                    transition: 'all 0.3s ease',
                                                                }}
                                                            >
                                                                {module.icon}
                                                            </Box>
                                                            <Box sx={{ flexGrow: 1 }}>
                                                                <Typography
                                                                    variant="subtitle1"
                                                                    component="h3"
                                                                    sx={{
                                                                        fontWeight: 700,
                                                                        color: '#1e293b',
                                                                        fontSize: '1.05rem',
                                                                        lineHeight: 1.3,
                                                                        minHeight: '2.6rem',
                                                                        mb: 0.5,
                                                                    }}
                                                                >
                                                                    {searchQuery ? highlightText(module.title, searchQuery) : module.title}
                                                                </Typography>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        color: '#64748b',
                                                                        fontSize: '0.85rem',
                                                                        lineHeight: 1.5,
                                                                    }}
                                                                >
                                                                    {searchQuery ? highlightText(module.desc, searchQuery) : module.desc}
                                                                </Typography>
                                                            </Box>
                                                        </CardContent>
                                                    </StyledCard>
                                                </Link>
                                            </motion.div>
                                        </Grid>
                                    ))}
                                </AnimatePresence>
                            </Grid>
                        </Box>
                    ))}
                </motion.div>

                {/* Empty State */}
                {!isLoading && filteredModules.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        <Box
                            sx={{
                                mt: 5,
                                p: 6,
                                bgcolor: 'white',
                                borderRadius: 4,
                                textAlign: 'center',
                                border: `2px dashed ${alpha(theme.palette.divider, 0.5)}`,
                                maxWidth: 600,
                                mx: 'auto',
                            }}
                        >
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <ShieldOff sx={{ fontSize: 64 }} color={theme.palette.text.secondary} />
                            </motion.div>
                            <Typography variant="h5" sx={{ mt: 3, fontWeight: 700, color: '#334155' }}>
                                {allowedModules.length > 0 ? 'Không tìm thấy chức năng' : 'Truy cập bị Hạn chế'}
                            </Typography>
                            <Typography sx={{ color: '#64748b', mt: 1.5, fontSize: '1rem' }}>
                                {allowedModules.length > 0
                                    ? 'Không có module nào khớp với từ khóa tìm kiếm của bạn. Vui lòng thử lại với từ khóa khác.'
                                    : 'Tài khoản của bạn chưa được cấp quyền truy cập. Vui lòng liên hệ bộ phận hỗ trợ hoặc quản trị viên hệ thống.'}
                            </Typography>
                            {allowedModules.length > 0 && (
                                <Button
                                    variant="outlined"
                                    onClick={handleClearSearch}
                                    sx={{ mt: 3 }}
                                >
                                    Xóa bộ lọc
                                </Button>
                            )}
                        </Box>
                    </motion.div>
                )}
            </Box>
        </Box>
    );
};

export default Home;

