import React, { useMemo } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Container, useTheme, Avatar, Divider, Link } from '@mui/material';
import { motion } from 'framer-motion';
import { GitCommit, Calendar, Clock, Activity, Hash, User, Code, DollarSign, Award, Server } from 'lucide-react';
import commitData from '../../data/commitHistory.json';
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';

const HistoryPage = () => {
    const theme = useTheme();

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
            fontFamily: 'Inter, sans-serif'
        }}>
            {/* Hero Section */}
            <Box sx={{
                position: 'relative',
                height: '450px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.background.default} 100%)`,
                overflow: 'hidden',
                mb: 6
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <Typography variant="h2" component="h1" sx={{
                        fontWeight: 800,
                        color: 'white',
                        textAlign: 'center',
                        mb: 2,
                        background: '-webkit-linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0px 10px 20px rgba(0,0,0,0.2)'
                    }}>
                        Lịch Sử & Giá Trị Dự Án
                    </Typography>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                >
                    <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', maxWidth: '800px', textAlign: 'center', px: 2, lineHeight: 1.6 }}>
                        Một hệ thống quản lý tài chính doanh nghiệp toàn diện. <br />
                        Khởi động từ 02/2024, liên tục phát triển và tối ưu hóa trên nền tảng Vercel.
                    </Typography>
                </motion.div>
            </Box>

            <Container maxWidth="xl">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Introduction & Valuation Section */}
                    <Grid container spacing={4} sx={{ mb: 6 }}>
                        <Grid item xs={12} md={7}>
                            <Card sx={{ height: '100%', borderRadius: 4, background: `linear-gradient(to right bottom, ${theme.palette.background.paper}, ${theme.palette.background.default})` }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Award color="#FFD700" /> Giới Thiệu Dự Án
                                    </Typography>
                                    <Typography paragraph color="text.secondary" sx={{ fontSize: '1rem', lineHeight: 1.8 }}>
                                        Dự án <strong>Báo Cáo Doanh Thu & Lợi Nhuận</strong> (Revenue & Profit Report) được khởi động vào <strong>tháng 02/2024</strong>.
                                        Đây là giải pháp chuyên sâu nhằm giải quyết bài toán quản lý tài chính phức tạp, bao gồm theo dõi dòng tiền, quản lý tài sản, và báo cáo thuế nội bộ.
                                    </Typography>
                                    <Typography paragraph color="text.secondary" sx={{ fontSize: '1rem', lineHeight: 1.8 }}>
                                        Mặc dù hệ thống Git chỉ bắt đầu ghi nhận từ <strong>tháng 05/2024</strong>, nhưng nền tảng cốt lõi đã được xây dựng kiên cố trước đó.
                                        Hệ thống hiện đang vận hành ổn định và được triển khai tự động (CI/CD) thông qua <strong>Vercel</strong>, đảm bảo tốc độ và độ tin cậy cao nhất.
                                    </Typography>
                                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                                        <Chip icon={<Server size={16} />} label="Hosted on Vercel" color="default" variant="outlined" />
                                        <Chip icon={<Code size={16} />} label="React / Vite / Firebase" color="primary" variant="outlined" />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Card sx={{ height: '100%', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                                <Box sx={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '8px',
                                    background: 'linear-gradient(90deg, #00C853, #64DD17)'
                                }} />
                                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography variant="h5" sx={{ mb: 4, fontWeight: 700, color: 'text.primary' }}>
                                        Định Giá Hệ Thống
                                    </Typography>

                                    <Box sx={{ mb: 4 }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom textTransform="uppercase" fontWeight="600">
                                            Giá trị phát triển (Development Cost)
                                        </Typography>
                                        <Typography variant="h3" fontWeight="800" color="primary.main">
                                            300.000.000 ₫
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            (Dựa trên ~50.000 LOC & 6 tháng nỗ lực)
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ my: 3 }} />

                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom textTransform="uppercase" fontWeight="600">
                                            Giá trị thị trường (Market Value)
                                        </Typography>
                                        <Typography variant="h4" fontWeight="700" sx={{ color: '#00C853' }}>
                                            ~ 500.000.000 ₫
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            (Giải pháp Custom-design trọn gói)
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Stats Grid */}
                    <Grid container spacing={3} sx={{ mb: 6 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatsCard icon={<GitCommit size={32} />} title="Tổng Commits (từ T5)" value={stats.totalCommits} color="#3f51b5" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatsCard icon={<Clock size={32} />} title="Thời gian phát triển" value={`${stats.totalDays} ngày`} color="#f50057" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatsCard icon={<Calendar size={32} />} title="Khởi động dự án" value="02/2024" color="#009688" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatsCard icon={<Code size={32} />} title="Quy mô mã nguồn" value="~50,596 LOC" color="#ff9800" />
                        </Grid>
                    </Grid>

                    {/* Activity Heatmap Section */}
                    <Card sx={{
                        mb: 6,
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 4
                    }}>
                        <CardContent>
                            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Activity /> Biểu Đồ Nỗ Lực (Activity Heatmap)
                            </Typography>
                            <Box sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.5,
                                justifyContent: 'center',
                                p: 2,
                                borderRadius: 2,
                                bgcolor: 'rgba(0,0,0,0.02)'
                            }}>
                                {Object.entries(stats.commitsByDay).map(([day, count], index) => {
                                    const intensity = Math.min((count / stats.maxCommitsInOneDay), 1);
                                    return (
                                        <motion.div
                                            key={day}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: index * 0.005 }}
                                            title={`${day}: ${count} commits`}
                                            style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '2px',
                                                backgroundColor: `rgba(76, 175, 80, ${0.2 + (intensity * 0.8)})`,
                                                cursor: 'help'
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Timeline Section */}
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Hash /> Chi Tiết Thay Đổi (Git Log)
                    </Typography>

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

                                <Card sx={{
                                    borderRadius: 3,
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: theme.shadows[4]
                                    }
                                }}>
                                    <CardContent sx={{ pb: 1, '&:last-child': { pb: 1 } }}>
                                        <Grid container alignItems="center" spacing={2}>
                                            <Grid item>
                                                <Avatar sx={{ bgcolor: getRandomColor(commit.author), width: 40, height: 40, fontSize: '1rem' }}>
                                                    {commit.author.charAt(0).toUpperCase()}
                                                </Avatar>
                                            </Grid>
                                            <Grid item xs>
                                                <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                                                    {commit.message}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 2, mt: 0.5, alignItems: 'center', color: 'text.secondary' }}>
                                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <User size={14} /> {commit.author}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Clock size={14} /> {format(parseISO(commit.date), 'HH:mm dd/MM/yyyy', { locale: vi })}
                                                    </Typography>
                                                    <Chip
                                                        label={commit.hash}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(commit.hash);
                                                            // Optional: toast success
                                                        }}
                                                    />
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
};

// Helper components
const StatsCard = ({ icon, title, value, color }) => (
    <Card sx={{ height: '100%', borderRadius: 4 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
                p: 1.5,
                borderRadius: 3,
                bgcolor: `${color}20`,
                color: color,
                display: 'flex'
            }}>
                {icon}
            </Box>
            <Box>
                <Typography variant="h4" fontWeight="800" sx={{ color: color }}>
                    {value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {title}
                </Typography>
            </Box>
        </CardContent>
    </Card>
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
