import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Box, Alert, Paper, Grid, Typography, CardActionArea,
  Skeleton, Chip, AlertTitle, Divider, styled,
} from "@mui/material";
import { motion } from "framer-motion";
import {
  LineChart, FolderKanban, PieChart, Construction, Building,
  Settings, BarChart3, TrendingUp, BookCheck, ArrowRight,
} from "lucide-react";

// --- DỮ LIỆU CẤU HÌNH ---
const mainFunctions = [
  { icon: <Construction size={32} />, text: "Kế Hoạch Thi Công", to: "/construction-plan", desc: "Lập và theo dõi tiến độ các dự án" },
  { icon: <Building size={32} />, text: "Quản Lý Công Trình", to: "/project-manager", desc: "Xem chi tiết, quản lý từng công trình", isNew: true },
  { icon: <BookCheck size={32} />, text: "Phân bổ chi phí", to: "/allocations", desc: "Nhập và quản lý chi phí cho dự án" },
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

// --- CÁC STYLED COMPONENTS CHO NỘI DUNG TRANG HOME ---
const KpiCard = styled(Paper)(({ theme, color = 'primary' }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 4,
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(10px)',
  border: `1px solid rgba(224, 224, 224, 0.6)`,
  transition: 'all 300ms ease-in-out',
  boxShadow: 'rgba(149, 157, 165, 0.1) 0px 8px 24px',
  display: 'flex',
  alignItems: 'center',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 0 25px -5px ${theme.palette[color].light}`,
  }
}));

const MainFunctionCard = styled(CardActionArea)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 4,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(12px)',
  border: `1px solid white`,
  boxShadow: `rgba(145, 158, 171, 0.15) 0px 10px 30px -5px`,
  textAlign: 'center',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  transition: 'all 0.3s ease-in-out',
  '& .icon-wrapper': {
    color: theme.palette.primary.dark,
    marginBottom: theme.spacing(2),
    transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  '&::after': {
    content: '""',
    position: 'absolute', top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 'inherit',
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    zIndex: -1,
    opacity: 0,
    transition: 'opacity 0.4s ease',
  },
  '&:hover': {
    transform: 'translateY(-8px)',
    color: 'white',
    '& .icon-wrapper': {
      color: 'white',
      transform: 'scale(1.1) rotate(-5deg)'
    },
    '& .MuiTypography-body2': {
      color: 'rgba(255, 255, 255, 0.8)'
    },
    '&::after': { opacity: 1 },
  },
}));

const SubFunctionCard = styled(CardActionArea)(({ theme }) => ({
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius * 3,
    backgroundColor: 'transparent',
    textAlign: 'left',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.text.secondary,
    border: '1px solid transparent',
    transition: 'all 0.3s ease-in-out',
    '& .arrow-icon': {
        opacity: 0,
        marginLeft: 'auto',
        transition: 'opacity 0.3s ease-in-out',
    },
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
        borderColor: theme.palette.divider,
        color: theme.palette.text.primary,
        '& .arrow-icon': {
            opacity: 1,
        },
    },
}));

const Section = ({ title, children }) => (
  <Box mb={6}>
    <Divider sx={{ mb: 4, '&::before, &::after': { borderColor: 'rgba(0, 0, 0, 0.08)' } }}>
      <Typography variant="overline" color="text.secondary" sx={{ px: 2, fontSize: '0.8rem', letterSpacing: '1px' }}>{title}</Typography>
    </Divider>
    {children}
  </Box>
);

export default function Home() {
  const [showAlert, setShowAlert] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSummary({ totalProjects: 12, totalRevenue: 1500000, totalCost: 800000 });
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const kpis = [
    { label: "Tổng Dự Án", value: summary?.totalProjects, icon: <FolderKanban size={32} />, color: 'primary' },
    { label: "Tổng Doanh Thu", value: summary ? formatVND(summary.totalRevenue) : undefined, icon: <LineChart size={32} />, color: 'success' },
    { label: "Tổng Chi Phí", value: summary ? formatVND(summary.totalCost) : undefined, icon: <PieChart size={32} />, color: 'error' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <React.Fragment>
      {showAlert && (
        <Alert severity="info" onClose={() => setShowAlert(false)} sx={{ mb: 4, borderRadius: 2, bgcolor: 'info.lighter', color: 'info.darker', border: '1px solid', borderColor: 'info.light' }}>
          <AlertTitle sx={{ fontWeight: 'bold' }}>Thông báo</AlertTitle>
          Hệ thống đã cập nhật tính năng phân tích lợi nhuận theo quý!
        </Alert>
      )}

      <motion.div variants={containerVariants} initial="hidden" animate={!!summary ? "visible" : "hidden"}>
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {kpis.map((k) => (
            <Grid item xs={12} sm={6} md={4} key={k.label}>
              <motion.div variants={itemVariants}>
                <KpiCard color={k.color}>
                  <Box sx={{ color: `${k.color}.main`, mr: 2 }}>{k.icon}</Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{k.label}</Typography>
                    <Typography variant="h5" fontWeight={700}>{summary ? k.value : <Skeleton width={120} />}</Typography>
                  </Box>
                </KpiCard>
              </motion.div>
            </Grid>
          ))}
        </Grid>
        
        <Section title="Không gian làm việc">
          <motion.div variants={containerVariants}>
            <Grid container spacing={{ xs: 2, md: 3 }}>
              {mainFunctions.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.to}>
                  <motion.div variants={itemVariants} style={{ height: '100%' }}>
                    <MainFunctionCard component={Link} to={item.to}>
                      <Box className="icon-wrapper">{item.icon}</Box>
                      <Typography variant="h6" fontWeight={600}>
                        {item.text}
                        {item.isNew && <Chip label="New" size="small" color="warning" sx={{ ml: 1 }} />}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                    </MainFunctionCard>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Section>

        <motion.div variants={containerVariants}>
          <Grid container spacing={{ xs: 4, md: 8 }} mt={2}>
            <Grid item xs={12} md={6}>
              <Section title="Báo cáo & Phân tích">
                {reportFunctions.map((item) => (
                  <motion.div variants={itemVariants} key={item.to}>
                    <SubFunctionCard component={Link} to={item.to}>
                      {item.icon}
                      <Box ml={1.5}><Typography variant="body1" fontWeight={500}>{item.text}</Typography></Box>
                      <ArrowRight className="arrow-icon" />
                    </SubFunctionCard>
                  </motion.div>
                ))}
              </Section>
            </Grid>
            <Grid item xs={12} md={6}>
              <Section title="Thiết lập hệ thống">
                {settingsFunctions.map((item) => (
                  <motion.div variants={itemVariants} key={item.to}>
                    <SubFunctionCard component={Link} to={item.to}>
                      {item.icon}
                      <Box ml={1.5}><Typography variant="body1" fontWeight={500}>{item.text}</Typography></Box>
                      <ArrowRight className="arrow-icon" />
                    </SubFunctionCard>
                  </motion.div>
                ))}
              </Section>
            </Grid>
          </Grid>
        </motion.div>
      </motion.div>

      <Typography variant="body2" textAlign="center" mt={8} color="text.secondary">
        Cần hỗ trợ? Liên hệ <strong>buinhutminh1999@gmail.com</strong>
      </Typography>
    </React.Fragment>
  );
}