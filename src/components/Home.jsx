import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box, Card, CardContent, Typography, Grid, Badge } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Construction, Building, BookCheck, FileSpreadsheet, BarChart3,
  Landmark, ClipboardList, BookUser, PieChart, LineChart, TrendingUp,
  FileCheck2, FileBarChart2,
  Archive,
  ArrowRightLeft
} from 'lucide-react';

// Styled Card với hiệu ứng ERP hiện đại
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: 20,
  transition: 'all 0.3s ease',
  border: `1px solid ${theme.palette.divider}`,
  background: 'linear-gradient(180deg, #fff 0%, #f9fafb 100%)',
  boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
  '&:hover': {
    transform: 'translateY(-6px) scale(1.01)',
    boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
  },
}));

// Animation cho card
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.45, ease: "easeOut" },
  })
};

const Home = () => {
  const userName = "Admin";

  const allModules = [
        // --- CÁC MODULE CHÍNH ---
        { icon: <Construction size={26} />, title: "Kế Hoạch Thi Công", to: "/construction-plan", desc: "Lập và theo dõi tiến độ công việc", color: '#3b82f6', bgColor: '#eff6ff' },

        { icon: <Building size={26} />, title: "Quản Lý Công Trình", to: "/project-manager", desc: "Xem chi tiết thông tin các công trình", color: '#8b5cf6', bgColor: '#f5f3ff' },
                { icon: <ArrowRightLeft size={26} />, title: "QL Luân chuyển Tài sản", to: "/asset-transfer", desc: "Theo dõi và luân chuyển tài sản", color: '#0891b2', bgColor: '#cffafe', isNew: true },

        { icon: <BookCheck size={26} />, title: "Phân Bổ Chi Phí", to: "/allocations", desc: "Quản lý và phân bổ chi phí dự án", color: '#10b981', bgColor: '#ecfdf5' },
        { icon: <FileSpreadsheet size={26} />, title: "Công Nợ Phải Trả", to: "/construction-payables", desc: "Theo dõi và quản lý các khoản công nợ", color: '#f59e0b', bgColor: '#fffbeb' },
        { icon: <FileCheck2 size={26} />, title: "Công Nợ Phải Thu", to: "/accounts-receivable", desc: "Theo dõi các khoản phải thu từ khách hàng", color: '#ec4899', bgColor: '#fdf2f8' },
        { icon: <BarChart3 size={26} />, title: "Bảng Cân Đối Kế Toán", to: "/balance-sheet", desc: "Tình hình tài sản và nguồn vốn", color: '#14b8a6', bgColor: '#f0fdfa' },
        { icon: <ClipboardList size={26} />, title: "Hệ Thống Tài Khoản", to: "/chart-of-accounts", desc: "Danh mục các tài khoản kế toán", color: '#64748b', bgColor: '#f8fafc' },
        { icon: <FileSpreadsheet size={26} />, title: "Quản Lý Danh Mục", to: "/categories", desc: "Theo dõi công nợ", color: '#f59e0b', bgColor: '#fef3c7' },
        { icon: <PieChart size={26} />, title: 'Chi Phí Theo Quý', to: '/cost-allocation-quarter', desc: 'Theo dõi phân bổ chi phí', color: '#8b5cf6', bgColor: '#f5f3ff' },
        { icon: <TrendingUp size={26} />, title: 'Tăng Giảm Lợi Nhuận', to: '/profit-change', desc: 'Phân tích các yếu tố ảnh hưởng', color: '#f59e0b', bgColor: '#fffbeb' },


        // --- CÁC MODULE BÁO CÁO (ĐÃ CẬP NHẬT ĐƯỜNG DẪN) ---
        { icon: <Landmark size={26} />, title: "Báo Cáo Sử Dụng Vốn", to: "/reports/capital-utilization", desc: "Đối chiếu kế hoạch và thực tế sử dụng", color: '#6366f1', bgColor: '#eef2ff' },
        { icon: <BookUser size={26} />, title: "Báo Cáo Nợ Có", to: "/reports/broker-debt", desc: "Theo dõi và đối chiếu số dư nợ có", color: '#ef4444', bgColor: '#fef2f2' },
        { icon: <BarChart3 size={26} />, title: 'Báo Cáo Lợi Nhuận Quý', to: '/reports/profit-quarter', desc: 'Phân tích theo từng quý', color: '#3b82f6', bgColor: '#eff6ff' },
        { icon: <FileBarChart2 size={26} />, title: "Báo cáo Phân bổ Chi phí", to: "/reports/quarterly-cost-allocation", desc: "Phân bổ chi phí theo doanh thu dự án", color: '#0d9488', bgColor: '#ccfbf1' },
        { icon: <LineChart size={26} />, title: 'Báo Cáo Lợi Nhuận Năm', to: '/reports/profit-year', desc: 'Xem báo cáo tổng kết năm', color: '#10b981', bgColor: '#ecfdf5' },
        { icon: <PieChart size={26} />, title: 'Báo Cáo Tổng Quát', to: '/reports/overall', desc: 'Tổng hợp tình hình hoạt động', color: '#6366f1', bgColor: '#eef2ff' },
    ];


  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, sm: 4 } }}>
      <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Box component="header" sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#1e293b' }}>
            Chào mừng trở lại, {userName}!
          </Typography>
          <Typography sx={{ color: '#64748b', mt: 0.5 }}>
            Hãy chọn một chức năng để bắt đầu công việc của bạn.
          </Typography>
        </Box>

        {/* Modules */}
        <Grid container spacing={3}>
          {allModules.map((module, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={index}>
              <motion.div custom={index} initial="hidden" animate="visible" variants={cardVariants} style={{ height: '100%' }}>
                <Link to={module.to} style={{ textDecoration: 'none' }}>
                  <StyledCard>
                    {module.isNew && (
                      <Badge badgeContent="MỚI" color="error" sx={{ position: 'absolute', top: 16, right: 16 }} />
                    )}
                    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <Box
                        sx={{
                          width: 54,
                          height: 54,
                          borderRadius: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: module.color,
                          color: 'white',
                          mb: 2,
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        }}
                      >
                        {module.icon}
                      </Box>

                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 700, color: module.color, fontSize: '1.05rem' }}>
                          {module.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                          {module.desc}
                        </Typography>
                      </Box>
                    </CardContent>
                  </StyledCard>
                </Link>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default Home;
