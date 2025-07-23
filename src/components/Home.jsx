import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Box, Paper, Grid, Typography, CardActionArea,
    Skeleton, Chip, styled, Divider,
    Stack,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import {
    LineChart, FolderKanban, PieChart, Construction, Building,
    Settings, BarChart3, TrendingUp, BookCheck, ArrowRight, Sun, Moon, Coffee,
    FileSpreadsheet // ===== THÊM ICON MỚI =====
} from "lucide-react";

// --- DỮ LIỆU CẤU HÌNH (Đã cập nhật) ---
const mainFunctions = [
    { icon: <Construction size={32} />, text: "Kế Hoạch Thi Công", to: "/construction-plan", desc: "Lập và theo dõi tiến độ các dự án" },
    { icon: <Building size={32} />, text: "Quản Lý Công Trình", to: "/project-manager", desc: "Xem chi tiết, quản lý từng công trình" },
    { icon: <BookCheck size={32} />, text: "Phân bổ chi phí", to: "/allocations", desc: "Nhập và quản lý chi phí cho dự án" },
    // ===== THÊM CHỨC NĂNG MỚI =====
    { icon: <FileSpreadsheet size={32} />, text: "Công Nợ Phải Trả", to: "/construction-payables", desc: "Theo dõi và quản lý công nợ phải trả", isNew: true },
];
const reportFunctions = [
    { icon: <BarChart3 size={24} />, text: "Báo Cáo Lợi Nhuận", to: "/profit-report-quarter", desc: "Phân tích doanh thu - chi phí" },
    { icon: <PieChart size={24} />, text: "Chi Phí Theo Quý", to: "/cost-allocation-quarter", desc: "Theo dõi phân bổ quý" },
    { icon: <LineChart size={24} />, text: "Lợi Nhuận Theo Năm", to: "/profit-report-year", desc: "Báo cáo doanh thu - chi phí cả năm" },
    { icon: <TrendingUp size={24} />, text: "Tăng Giảm Lợi Nhuận", to: "/profit-change", desc: "Phát sinh ảnh hưởng lợi nhuận" },
];
const settingsFunctions = [
    { icon: <Settings size={24} />, text: "Quản Trị Khoản Mục", to: "/categories", desc: "Cấu hình các khoản mục chi phí" },
];

const formatVND = (v) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);

// --- STYLED COMPONENTS (Không đổi) ---
const StyledRoot = styled(Box)(({ theme }) => ({
    position: 'relative',
    overflow: 'hidden',
    padding: theme.spacing(3),
    '&::before': {
        content: '""',
        position: 'absolute',
        top: '-20%',
        left: '-20%',
        width: '400px',
        height: '400px',
        background: `radial-gradient(circle, ${alpha(theme.palette.primary.light, 0.2)} 0%, transparent 70%)`,
        filter: 'blur(100px)',
        zIndex: -1,
    },
    '&::after': {
        content: '""',
        position: 'absolute',
        bottom: '-20%',
        right: '-15%',
        width: '400px',
        height: '400px',
        background: `radial-gradient(circle, ${alpha(theme.palette.secondary.light, 0.2)} 0%, transparent 70%)`,
        filter: 'blur(120px)',
        zIndex: -1,
    }
}));

const KpiCard = styled(Paper)(({ theme, color = 'primary' }) => ({
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius * 4,
    position: 'relative',
    overflow: 'hidden',
    border: `1px solid ${theme.palette.divider}`,
    transition: 'all 300ms ease-in-out',
    boxShadow: 'none',
    display: 'flex',
    alignItems: 'center',
    '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: `0 20px 40px -15px ${alpha(theme.palette[color].main, 0.3)}`,
    },
    '& .icon-glow': {
        width: 64,
        height: 64,
        position: 'absolute',
        top: -8,
        left: -8,
        borderRadius: '50%',
        background: alpha(theme.palette[color].main, 0.15),
        filter: 'blur(12px)',
        zIndex: 1,
    },
    '& .icon-wrapper': {
        zIndex: 2,
        position: 'relative',
    }
}));

const MainFunctionCard = styled(CardActionArea)(({ theme }) => ({
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius * 4,
    backgroundColor: alpha(theme.palette.background.paper, 0.7),
    backdropFilter: 'blur(10px)',
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'rgba(145, 158, 171, 0.1) 0px 4px 12px',
    textAlign: 'center',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease-in-out',
    '& .icon-wrapper': {
        color: theme.palette.primary.main,
        marginBottom: theme.spacing(2),
        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    '&:hover': {
        transform: 'translateY(-8px) scale(1.02)',
        boxShadow: `rgba(145, 158, 171, 0.2) 0px 20px 40px -10px`,
        borderColor: theme.palette.primary.main,
    },
}));

const SubFunctionCard = styled(CardActionArea)(({ theme }) => ({
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius * 3,
    textAlign: 'left',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.text.primary,
    borderLeft: '3px solid transparent',
    transition: 'all 0.3s ease',
    '& .arrow-icon': {
        opacity: 0,
        marginLeft: 'auto',
        transform: 'translateX(-10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
    },
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.light, 0.08),
        borderLeft: `3px solid ${theme.palette.primary.main}`,
        '& .arrow-icon': {
            opacity: 1,
            transform: 'translateX(0)',
        },
    },
}));

const Section = ({ title, children }) => (
    <Box component="section" mb={6}>
        <Typography variant="h5" fontWeight={600} mb={3}>{title}</Typography>
        {children}
    </Box>
);

// --- COMPONENT CHÍNH (Không đổi) ---
export default function Home() {
    const [summary, setSummary] = useState(null);
    const [greeting, setGreeting] = useState({ icon: <Coffee />, text: "Chào mừng bạn" });

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting({ icon: <Sun size={24} />, text: "Chào buổi sáng" });
        else if (hour < 18) setGreeting({ icon: <Coffee size={24} />, text: "Chào buổi chiều" });
        else setGreeting({ icon: <Moon size={24} />, text: "Chào buổi tối" });

        const timer = setTimeout(() => {
            setSummary({ totalProjects: 12, totalRevenue: 1585000000, totalCost: 834000000 });
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const kpis = [
        { label: "Tổng Dự Án", value: summary?.totalProjects, icon: <FolderKanban size={28} />, color: 'primary' },
        { label: "Tổng Doanh Thu", value: summary ? formatVND(summary.totalRevenue) : undefined, icon: <LineChart size={28} />, color: 'success' },
        { label: "Tổng Chi Phí", value: summary ? formatVND(summary.totalCost) : undefined, icon: <PieChart size={28} />, color: 'error' },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
    };
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
    };

    return (
        <StyledRoot>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    {greeting.icon}
                    <Typography variant="h4" fontWeight={700}>{greeting.text}!</Typography>
                </Stack>
                <Typography color="text.secondary" mb={4}>Đây là tổng quan hệ thống của bạn hôm nay.</Typography>
            </motion.div>

            <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <Grid container spacing={3} sx={{ mb: 6 }}>
                    {kpis.map((k) => (
                        <Grid item xs={12} sm={6} md={4} key={k.label}>
                            <motion.div variants={itemVariants}>
                                <KpiCard color={k.color}>
                                    <Box className="icon-glow" />
                                    <Box className="icon-wrapper" sx={{ color: `${k.color}.dark`, mr: 2.5 }}>{k.icon}</Box>
                                    <Box>
                                        <Typography variant="body1" color="text.secondary">{k.label}</Typography>
                                        {summary ? (
                                            <Typography variant="h5" fontWeight={700}>{k.value}</Typography>
                                        ) : (
                                            <Skeleton width={150} height={32} sx={{ mt: 0.5 }}/>
                                        )}
                                    </Box>
                                </KpiCard>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
                
                <Section title="Không gian làm việc">
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        <Grid container spacing={{ xs: 2, md: 3 }}>
                            {mainFunctions.map((item) => (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={item.to}>
                                    <motion.div variants={itemVariants} style={{ height: '100%' }}>
                                        <MainFunctionCard component={Link} to={item.to}>
                                            <Box className="icon-wrapper">{item.icon}</Box>
                                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                                {item.text}
                                                {item.isNew && <Chip label="New" size="small" color="secondary" sx={{ ml: 1, height: 20 }} />}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                                        </MainFunctionCard>
                                    </motion.div>
                                </Grid>
                            ))}
                        </Grid>
                    </motion.div>
                </Section>
                
                <Grid container spacing={{ xs: 4, md: 5 }} mt={2}>
                    <Grid item xs={12} md={6}>
                        <Section title="Báo cáo & Phân tích">
                            <Stack spacing={1.5}>
                            {reportFunctions.map((item) => (
                                <motion.div variants={itemVariants} key={item.to}>
                                    <SubFunctionCard component={Link} to={item.to}>
                                        {item.icon}
                                        <Box ml={2}><Typography variant="body1" fontWeight={500}>{item.text}</Typography></Box>
                                        <ArrowRight className="arrow-icon" size={20} />
                                    </SubFunctionCard>
                                </motion.div>
                            ))}
                            </Stack>
                        </Section>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Section title="Thiết lập hệ thống">
                            <Stack spacing={1.5}>
                            {settingsFunctions.map((item) => (
                                <motion.div variants={itemVariants} key={item.to}>
                                    <SubFunctionCard component={Link} to={item.to}>
                                        {item.icon}
                                        <Box ml={2}><Typography variant="body1" fontWeight={500}>{item.text}</Typography></Box>
                                        <ArrowRight className="arrow-icon" size={20}/>
                                    </SubFunctionCard>
                                </motion.div>
                            ))}
                            </Stack>
                        </Section>
                    </Grid>
                </Grid>
            </motion.div>
        </StyledRoot>
    );
}