import React, { useMemo, useState, useEffect } from 'react';
import { 
    Box, Typography, Card, CardContent, Grid, Chip, Container, useTheme, Avatar, Divider, 
    Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
    Tooltip, Paper, Stack, useMediaQuery, LinearProgress, Snackbar, Alert
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Edit, Save, Cancel, TrendingUp, TrendingDown, AttachMoney as DollarIcon,
    Code, EmojiEvents as Award, Cloud as Server, Timeline, CalendarToday as Calendar, AccessTime as Clock, 
    ShowChart as Activity, Tag as Hash, Person as User
} from '@mui/icons-material';
import commitData from '../../data/commitHistory.json';
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase-config';

const StyledValueCard = styled(Card)(({ theme }) => ({
    position: 'relative',
    overflow: 'hidden',
    background: theme.palette.mode === 'light'
        ? `linear-gradient(135deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`
        : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: theme.palette.mode === 'light'
        ? "0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02)"
        : "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)",
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #00C853 0%, #64DD17 100%)',
    },
}));

const HistoryPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // State for project values
    const [projectValues, setProjectValues] = useState({
        developmentCost: 300000000,
        marketValue: 500000000,
        loc: 50596,
        description: 'Dựa trên ~50.000 LOC & 6 tháng nỗ lực',
        marketDescription: 'Giải pháp Custom-design trọn gói',
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState(projectValues);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Load project values from Firestore
    useEffect(() => {
        const loadProjectValues = async () => {
            try {
                const docRef = doc(db, 'configuration', 'projectValues');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProjectValues(docSnap.data());
                    setEditValues(docSnap.data());
                }
            } catch (error) {
                console.error('Error loading project values:', error);
            }
        };
        loadProjectValues();
    }, []);

    // Save project values to Firestore
    const handleSaveValues = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'configuration', 'projectValues');
            await setDoc(docRef, {
                ...editValues,
                updatedAt: new Date().toISOString(),
                updatedBy: user?.email || user?.displayName || 'Unknown',
            });
            setProjectValues(editValues);
            setIsEditing(false);
            setSnackbar({ open: true, message: 'Đã cập nhật giá trị dự án thành công!', severity: 'success' });
        } catch (error) {
            console.error('Error saving project values:', error);
            setSnackbar({ open: true, message: 'Lỗi khi lưu giá trị dự án', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditValues(projectValues);
        setIsEditing(false);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Process data
    const stats = useMemo(() => {
        if (!commitData || !commitData.commits || commitData.commits.length === 0) return null;

        const commits = [...commitData.commits].reverse(); // Oldest first
        // Manual override: Project started in Feb, but git started in May
        const realStartDate = new Date(2024, 1, 1); // Feb 1st, 2024 (Month is 0-indexed)
        const firstCommitDate = parseISO(commits[0].date);
        const lastDate = parseISO(commits[commits.length - 1].date);

        // Calculate total days from real start date
        const totalDays = differenceInDays(lastDate, realStartDate) + 1;

        // Group by day for activity chart
        const commitsByDay = {};
        commits.forEach(c => {
            const day = c.date.split('T')[0];
            commitsByDay[day] = (commitsByDay[day] || 0) + 1;
        });

        const maxCommitsInOneDay = Math.max(...Object.values(commitsByDay));

        return {
            totalCommits: commitData.totalCommits,
            firstDate: realStartDate,
            firstCommitDate: firstCommitDate,
            lastDate,
            totalDays,
            commitsByDay,
            maxCommitsInOneDay,
            sortedCommits: [...commitData.commits] // Newest first
        };
    }, []);

    if (!stats) {
        return (
            <Container sx={{ py: 10, textAlign: 'center' }}>
                <Typography>Không có dữ liệu lịch sử.</Typography>
            </Container>
        );
    }

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            pb: 10,
            fontFamily: 'Inter, sans-serif',
            position: 'relative',
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '400px',
                background: theme.palette.mode === 'light'
                    ? `radial-gradient(ellipse 80% 50% at 50% 0%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%)`
                    : `radial-gradient(ellipse 80% 50% at 50% 0%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 50%)`,
                pointerEvents: 'none',
                zIndex: 0,
            },
        }}>
            {/* Hero Section với Glassmorphism */}
            <Box sx={{
                position: 'relative',
                minHeight: { xs: '350px', sm: '450px' },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: theme.palette.mode === 'light'
                    ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${alpha(theme.palette.background.default, 0.9)} 100%)`
                    : `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.background.default} 100%)`,
                overflow: 'hidden',
                mb: 6,
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at 30% 50%, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 50%)`,
                },
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    style={{ position: 'relative', zIndex: 1 }}
                >
                    <Typography 
                        variant={isMobile ? "h4" : "h2"} 
                        component="h1" 
                        sx={{
                            fontWeight: 800,
                            textAlign: 'center',
                            mb: 2,
                            background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.9) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0px 10px 20px rgba(0,0,0,0.2)',
                            px: 2,
                        }}
                    >
                        Lịch Sử & Giá Trị Dự Án
                    </Typography>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    style={{ position: 'relative', zIndex: 1 }}
                >
                    <Typography 
                        variant={isMobile ? "body1" : "h6"} 
                        sx={{ 
                            color: 'rgba(255,255,255,0.9)', 
                            maxWidth: '800px', 
                            textAlign: 'center', 
                            px: 2, 
                            lineHeight: 1.6,
                            fontWeight: 400,
                        }}
                    >
                        Một hệ thống quản lý tài chính doanh nghiệp toàn diện. <br />
                        Khởi động từ 02/2024, liên tục phát triển và tối ưu hóa trên nền tảng Vercel.
                    </Typography>
                </motion.div>
            </Box>

            <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Introduction & Valuation Section */}
                    <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} sx={{ mb: 6 }}>
                        <Grid item xs={12} md={7}>
                            <motion.div variants={itemVariants}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        height: '100%',
                                        borderRadius: 3,
                                        p: { xs: 3, sm: 4 },
                                        background: theme.palette.mode === 'light'
                                            ? `linear-gradient(135deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`
                                            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
                                        backdropFilter: "blur(20px) saturate(180%)",
                                        WebkitBackdropFilter: "blur(20px) saturate(180%)",
                                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        boxShadow: theme.palette.mode === 'light'
                                            ? "0 4px 20px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)"
                                            : "0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)",
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
                                        <Avatar
                                            sx={{
                                                bgcolor: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.light} 100%)`,
                                                background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.light} 100%)`,
                                                width: { xs: 40, sm: 48 },
                                                height: { xs: 40, sm: 48 },
                                                boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.3)}`,
                                            }}
                                        >
                                            <Award sx={{ fontSize: { xs: 24, sm: 28 } }} />
                                        </Avatar>
                                        <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 700 }}>
                                            Giới Thiệu Dự Án
                                        </Typography>
                                    </Stack>
                                    <Typography 
                                        paragraph 
                                        color="text.secondary" 
                                        sx={{ 
                                            fontSize: { xs: '0.9rem', sm: '1rem' }, 
                                            lineHeight: 1.8,
                                            mb: 2,
                                        }}
                                    >
                                        Dự án <strong>Báo Cáo Doanh Thu & Lợi Nhuận</strong> (Revenue & Profit Report) được khởi động vào <strong>tháng 02/2024</strong>.
                                        Đây là giải pháp chuyên sâu nhằm giải quyết bài toán quản lý tài chính phức tạp, bao gồm theo dõi dòng tiền, quản lý tài sản, và báo cáo thuế nội bộ.
                                    </Typography>
                                    <Typography 
                                        paragraph 
                                        color="text.secondary" 
                                        sx={{ 
                                            fontSize: { xs: '0.9rem', sm: '1rem' }, 
                                            lineHeight: 1.8,
                                        }}
                                    >
                                        Mặc dù hệ thống Git chỉ bắt đầu ghi nhận từ <strong>tháng 05/2024</strong>, nhưng nền tảng cốt lõi đã được xây dựng kiên cố trước đó.
                                        Hệ thống hiện đang vận hành ổn định và được triển khai tự động (CI/CD) thông qua <strong>Vercel</strong>, đảm bảo tốc độ và độ tin cậy cao nhất.
                                    </Typography>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
                                        <Chip 
                                            icon={<Server sx={{ fontSize: 18 }} />} 
                                            label="Hosted on Vercel" 
                                            color="default" 
                                            variant="outlined"
                                            sx={{ fontWeight: 600 }}
                                        />
                                        <Chip 
                                            icon={<Code sx={{ fontSize: 18 }} />} 
                                            label="React / Vite / Firebase" 
                                            color="primary" 
                                            variant="outlined"
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </Stack>
                                </Paper>
                            </motion.div>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <motion.div variants={itemVariants}>
                                <StyledValueCard sx={{ height: '100%' }}>
                                    <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center', position: 'relative' }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                                            <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 700, color: 'text.primary' }}>
                                                Định Giá Hệ Thống
                                            </Typography>
                                            {isAdmin && (
                                                <Tooltip title="Chỉnh sửa giá trị dự án">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setIsEditing(true)}
                                                        sx={{
                                                            color: 'primary.main',
                                                            '&:hover': {
                                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            },
                                                        }}
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>

                                        <Box sx={{ mb: 4 }}>
                                            <Typography 
                                                variant="body2" 
                                                color="text.secondary" 
                                                gutterBottom 
                                                textTransform="uppercase" 
                                                fontWeight="600"
                                                sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                            >
                                                Giá trị phát triển (Development Cost)
                                            </Typography>
                                            <Typography 
                                                variant={isMobile ? "h4" : "h3"} 
                                                fontWeight="800" 
                                                color="primary.main"
                                                sx={{ 
                                                    mb: 0.5,
                                                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                                    backgroundClip: 'text',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                }}
                                            >
                                                {formatCurrency(projectValues.developmentCost)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                                {projectValues.description}
                                            </Typography>
                                        </Box>

                                        <Divider sx={{ my: 3 }} />

                                        <Box>
                                            <Typography 
                                                variant="body2" 
                                                color="text.secondary" 
                                                gutterBottom 
                                                textTransform="uppercase" 
                                                fontWeight="600"
                                                sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                            >
                                                Giá trị thị trường (Market Value)
                                            </Typography>
                                            <Typography 
                                                variant={isMobile ? "h5" : "h4"} 
                                                fontWeight="700" 
                                                sx={{ 
                                                    color: '#00C853',
                                                    mb: 0.5,
                                                }}
                                            >
                                                ~ {formatCurrency(projectValues.marketValue)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                                {projectValues.marketDescription}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </StyledValueCard>
                            </motion.div>
                        </Grid>
                    </Grid>

                    {/* Stats Grid với Modern Design */}
                    <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 6 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div variants={itemVariants} whileHover={{ y: -4 }}>
                                <StatsCard 
                                    icon={<Timeline sx={{ fontSize: { xs: 28, sm: 32 } }} />} 
                                    title="Tổng Commits (từ T5)" 
                                    value={stats.totalCommits} 
                                    color={theme.palette.primary.main}
                                    theme={theme}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div variants={itemVariants} whileHover={{ y: -4 }}>
                                <StatsCard 
                                    icon={<Clock sx={{ fontSize: { xs: 28, sm: 32 } }} />} 
                                    title="Thời gian phát triển" 
                                    value={`${stats.totalDays} ngày`} 
                                    color={theme.palette.error.main}
                                    theme={theme}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div variants={itemVariants} whileHover={{ y: -4 }}>
                                <StatsCard 
                                    icon={<Calendar sx={{ fontSize: { xs: 28, sm: 32 } }} />} 
                                    title="Khởi động dự án" 
                                    value="02/2024" 
                                    color={theme.palette.info.main}
                                    theme={theme}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div variants={itemVariants} whileHover={{ y: -4 }}>
                                <StatsCard 
                                    icon={<Code sx={{ fontSize: { xs: 28, sm: 32 } }} />} 
                                    title="Quy mô mã nguồn" 
                                    value={`~${projectValues.loc.toLocaleString('vi-VN')} LOC`} 
                                    color={theme.palette.warning.main}
                                    theme={theme}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                        </Grid>
                    </Grid>

                    {/* Activity Heatmap Section */}
                    <motion.div variants={itemVariants}>
                        <Paper
                            elevation={0}
                            sx={{
                                mb: 6,
                                p: { xs: 2.5, sm: 3 },
                                borderRadius: 3,
                                background: theme.palette.mode === 'light'
                                    ? `linear-gradient(135deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`
                                    : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
                                backdropFilter: "blur(20px) saturate(180%)",
                                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                boxShadow: theme.palette.mode === 'light'
                                    ? "0 4px 20px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)"
                                    : "0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)",
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                                <Avatar
                                    sx={{
                                        bgcolor: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
                                        background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
                                        width: { xs: 40, sm: 48 },
                                        height: { xs: 40, sm: 48 },
                                    }}
                                >
                                    <Activity sx={{ fontSize: { xs: 24, sm: 28 } }} />
                                </Avatar>
                                <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 700 }}>
                                    Biểu Đồ Nỗ Lực (Activity Heatmap)
                                </Typography>
                            </Stack>
                            <Box sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.75,
                                justifyContent: 'center',
                                p: 2.5,
                                borderRadius: 2,
                                bgcolor: alpha(theme.palette.background.default, 0.5),
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            }}>
                                {Object.entries(stats.commitsByDay).map(([day, count], index) => {
                                    const intensity = Math.min((count / stats.maxCommitsInOneDay), 1);
                                    return (
                                        <Tooltip key={day} title={`${day}: ${count} commit${count > 1 ? 's' : ''}`} arrow>
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: index * 0.003, duration: 0.2 }}
                                                whileHover={{ scale: 1.3, zIndex: 10 }}
                                                style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '3px',
                                                    backgroundColor: `rgba(76, 175, 80, ${0.3 + (intensity * 0.7)})`,
                                                    cursor: 'pointer',
                                                    border: `1px solid ${alpha('#4CAF50', 0.2)}`,
                                                }}
                                            />
                                        </Tooltip>
                                    );
                                })}
                            </Box>
                        </Paper>
                    </motion.div>

                    {/* Timeline Section */}
                    <motion.div variants={itemVariants}>
                        <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                            <Avatar
                                sx={{
                                    bgcolor: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.light} 100%)`,
                                    background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.light} 100%)`,
                                    width: { xs: 40, sm: 48 },
                                    height: { xs: 40, sm: 48 },
                                }}
                            >
                                <Hash sx={{ fontSize: { xs: 24, sm: 28 } }} />
                            </Avatar>
                            <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 700 }}>
                                Chi Tiết Thay Đổi (Git Log)
                            </Typography>
                        </Stack>
                    </motion.div>

                    <Box sx={{ position: 'relative', pl: 4 }}>
                        {/* Timeline Line */}
                        <Box sx={{
                            position: 'absolute',
                            left: '19px',
                            top: 0,
                            bottom: 0,
                            width: '2px',
                            bgcolor: 'divider'
                        }} />

                        {stats.sortedCommits.map((commit, index) => (
                            <motion.div
                                key={commit.hash}
                                variants={itemVariants}
                                style={{ marginBottom: '24px', position: 'relative' }}
                            >
                                {/* Timeline Dot */}
                                <Box sx={{
                                    position: 'absolute',
                                    left: '-36px',
                                    top: '12px',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    border: '2px solid white'
                                }} />

                                <Paper
                                    elevation={0}
                                    sx={{
                                        borderRadius: 2.5,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        background: theme.palette.mode === 'light'
                                            ? `linear-gradient(135deg, ${alpha('#ffffff', 0.9)} 0%, ${alpha('#f8fafc', 0.9)} 100%)`
                                            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: theme.palette.mode === 'light'
                                                ? "0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)"
                                                : "0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
                                            borderColor: alpha(theme.palette.primary.main, 0.3),
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                                        <Stack direction="row" spacing={2} alignItems="flex-start">
                                            <Avatar 
                                                sx={{ 
                                                    bgcolor: getRandomColor(commit.author), 
                                                    width: { xs: 36, sm: 40 }, 
                                                    height: { xs: 36, sm: 40 }, 
                                                    fontSize: { xs: '0.875rem', sm: '1rem' },
                                                    fontWeight: 700,
                                                    boxShadow: `0 2px 8px ${alpha(getRandomColor(commit.author), 0.3)}`,
                                                }}
                                            >
                                                {commit.author.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography 
                                                    variant={isMobile ? "body1" : "subtitle1"} 
                                                    fontWeight="600" 
                                                    color="text.primary"
                                                    sx={{ mb: 1 }}
                                                >
                                                    {commit.message}
                                                </Typography>
                                                <Stack 
                                                    direction={{ xs: 'column', sm: 'row' }} 
                                                    spacing={{ xs: 0.5, sm: 2 }} 
                                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                                    flexWrap="wrap"
                                                >
                                                    <Chip
                                                        icon={<User sx={{ fontSize: 14 }} />}
                                                        label={commit.author}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ 
                                                            height: 24, 
                                                            fontSize: '0.75rem',
                                                            fontWeight: 500,
                                                        }}
                                                    />
                                                    <Chip
                                                        icon={<Clock sx={{ fontSize: 14 }} />}
                                                        label={format(parseISO(commit.date), 'HH:mm dd/MM/yyyy', { locale: vi })}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ 
                                                            height: 24, 
                                                            fontSize: '0.75rem',
                                                            fontWeight: 500,
                                                        }}
                                                    />
                                                    <Chip
                                                        label={commit.hash.substring(0, 7)}
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(commit.hash);
                                                            setSnackbar({ open: true, message: 'Đã sao chép hash!', severity: 'success' });
                                                        }}
                                                        sx={{ 
                                                            height: 24, 
                                                            fontSize: '0.7rem',
                                                            cursor: 'pointer',
                                                            '&:hover': {
                                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            },
                                                        }}
                                                    />
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Paper>
                            </motion.div>
                        ))}
                    </Box>
                </motion.div>
            </Container>

            {/* Edit Dialog */}
            <Dialog
                open={isEditing}
                onClose={handleCancelEdit}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        background: theme.palette.mode === 'light'
                            ? `linear-gradient(135deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f8fafc', 0.98)} 100%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
                        backdropFilter: "blur(20px)",
                    }
                }}
            >
                <DialogTitle sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    pb: 1,
                }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                        <DollarIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            Chỉnh sửa Giá trị Dự án
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Cập nhật thông tin định giá hệ thống
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Giá trị phát triển (VND)"
                            type="number"
                            fullWidth
                            value={editValues.developmentCost}
                            onChange={(e) => setEditValues({ ...editValues, developmentCost: Number(e.target.value) || 0 })}
                            InputProps={{
                                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₫</Typography>,
                            }}
                            helperText="Chi phí phát triển hệ thống"
                        />
                        <TextField
                            label="Mô tả giá trị phát triển"
                            fullWidth
                            multiline
                            rows={2}
                            value={editValues.description}
                            onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                        />
                        <TextField
                            label="Giá trị thị trường (VND)"
                            type="number"
                            fullWidth
                            value={editValues.marketValue}
                            onChange={(e) => setEditValues({ ...editValues, marketValue: Number(e.target.value) || 0 })}
                            InputProps={{
                                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₫</Typography>,
                            }}
                            helperText="Giá trị ước tính trên thị trường"
                        />
                        <TextField
                            label="Mô tả giá trị thị trường"
                            fullWidth
                            multiline
                            rows={2}
                            value={editValues.marketDescription}
                            onChange={(e) => setEditValues({ ...editValues, marketDescription: e.target.value })}
                        />
                        <TextField
                            label="Số dòng mã (LOC)"
                            type="number"
                            fullWidth
                            value={editValues.loc}
                            onChange={(e) => setEditValues({ ...editValues, loc: Number(e.target.value) || 0 })}
                            helperText="Lines of Code"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
                    <Button onClick={handleCancelEdit} disabled={loading}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSaveValues}
                        variant="contained"
                        startIcon={<Save />}
                        disabled={loading}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                        }}
                    >
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setSnackbar({ ...snackbar, open: false })} 
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

// Helper components
const StatsCard = ({ icon, title, value, color, theme, isMobile }) => (
    <Paper
        elevation={0}
        sx={{
            height: '100%',
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            background: theme.palette.mode === 'light'
                ? `linear-gradient(135deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: `1px solid ${alpha(color, 0.2)}`,
            boxShadow: theme.palette.mode === 'light'
                ? "0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)"
                : "0 2px 8px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)",
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.6)} 100%)`,
            },
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${alpha(color, 0.2)}, 0 0 0 1px ${alpha(color, 0.3)}`,
                borderColor: alpha(color, 0.4),
            }
        }}
    >
        <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
                sx={{
                    bgcolor: alpha(color, 0.15),
                    color: color,
                    width: { xs: 48, sm: 56 },
                    height: { xs: 48, sm: 56 },
                    boxShadow: `0 4px 12px ${alpha(color, 0.2)}`,
                }}
            >
                {icon}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    fontWeight="800" 
                    sx={{ 
                        color: color,
                        fontSize: { xs: '1.5rem', sm: '2rem' },
                    }}
                >
                    {value}
                </Typography>
                <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        mt: 0.25,
                    }}
                >
                    {title}
                </Typography>
            </Box>
        </Stack>
    </Paper>
);

const getRandomColor = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export default HistoryPage;
