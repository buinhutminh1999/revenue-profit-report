import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Import components từ Material-UI (MUI)
import { Box, Card, CardContent, Typography, Grid, Badge } from '@mui/material';
import { styled } from '@mui/material/styles';

// Import icons từ Lucide React
import { 
    Construction, Building, BookCheck, FileSpreadsheet, BarChart3, 
    Landmark, ClipboardList, BookUser, PieChart, LineChart, TrendingUp
} from 'lucide-react';

// Gộp tất cả chức năng và báo cáo vào một danh sách duy nhất
const allModules = [
    {
        icon: <Construction size={28} />,
        title: "Kế Hoạch Thi Công",
        to: "/construction-plan",
        desc: "Lập và theo dõi tiến độ công việc",
        color: '#3b82f6',
        bgColor: '#eff6ff'
    },
    {
        icon: <Building size={28} />,
        title: "Quản Lý Công Trình",
        to: "/project-manager",
        desc: "Xem chi tiết thông tin các công trình",
        color: '#8b5cf6',
        bgColor: '#f5f3ff'
    },
    {
        icon: <BookCheck size={28} />,
        title: "Phân Bổ Chi Phí",
        to: "/allocations",
        desc: "Quản lý và phân bổ chi phí dự án",
        color: '#10b981',
        bgColor: '#ecfdf5'
    },
    {
        icon: <FileSpreadsheet size={28} />,
        title: "Công Nợ Phải Trả",
        to: "/construction-payables",
        desc: "Theo dõi và quản lý các khoản công nợ",
        color: '#f59e0b',
        bgColor: '#fffbeb',
    },
    {
        icon: <BarChart3 size={28} />,
        title: "Bảng Cân Đối Kế Toán",
        to: "/balance-sheet",
        desc: "Tình hình tài sản và nguồn vốn",
        color: '#14b8a6',
        bgColor: '#f0fdfa',
    },
    {
        icon: <Landmark size={28} />,
        title: "Báo Cáo Sử Dụng Vốn",
        to: "/capital-utilization",
        desc: "Đối chiếu kế hoạch và thực tế sử dụng",
        color: '#6366f1',
        bgColor: '#eef2ff',
    },
    {
        icon: <ClipboardList size={28} />,
        title: "Hệ Thống Tài Khoản",
        to: "/chart-of-accounts",
        desc: "Danh mục các tài khoản kế toán",
        color: '#64748b',
        bgColor: '#f8fafc',
    },
    {
        icon: <BookUser size={28} />,
        title: "Báo Cáo Nợ Có",
        to: "/broker-debt-report",
        desc: "Theo dõi và đối chiếu số dư nợ có",
        color: '#ef4444',
        bgColor: '#fef2f2',
    },
    {
        icon: <BarChart3 size={28} />,
        title: 'Báo Cáo Lợi Nhuận',
        desc: 'Phân tích theo từng quý',
        to: '/profit-report-quarter',
        color: '#3b82f6',
        bgColor: '#eff6ff'
    },
    {
        icon: <PieChart size={28} />,
        title: 'Chi Phí Theo Quý',
        desc: 'Theo dõi phân bổ chi phí',
        to: '/cost-allocation-quarter',
        color: '#8b5cf6',
        bgColor: '#f5f3ff'
    },
    {
        icon: <LineChart size={28} />,
        title: 'Lợi Nhuận Theo Năm',
        desc: 'Xem báo cáo tổng kết năm',
        to: '/profit-report-year',
        color: '#10b981',
        bgColor: '#ecfdf5'
    },
    {
        icon: <TrendingUp size={28} />,
        title: 'Tăng Giảm Lợi Nhuận',
        desc: 'Phân tích các yếu tố ảnh hưởng',
        to: '/profit-change',
        color: '#f59e0b',
        bgColor: '#fffbeb'
    },
    {
        icon: <PieChart size={28} />,
        title: 'Báo Cáo Tổng Quát',
        desc: 'Tổng hợp tình hình hoạt động',
        to: '/overall-report',
        color: '#6366f1',
        bgColor: '#eef2ff'
    },
     { 
        icon: <FileSpreadsheet size={24} />, 
        title: "Quản Lý Danh Mục", 
        to: "/categories", 
        desc: "Theo dõi công nợ",
        color: '#f59e0b',
        bgColor: '#fef3c7',
    },
];

// Styled component cho Card để thêm hiệu ứng hover
const StyledCard = styled(Card)(({ theme }) => ({
    height: '100%',
    borderRadius: '16px', // Bo góc lớn hơn
    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
    '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
    },
}));

// Định nghĩa animation cho card
const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.04,
            duration: 0.4,
            ease: "easeOut"
        }
    })
};

const Home = () => {
    const userName = "Admin";

    return (
        <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, sm: 4 } }}>
            <Box sx={{ maxWidth: '1600px', mx: 'auto' }}>
                {/* Header */}
                <Box component="header" sx={{ mb: 4 }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                        Chào mừng trở lại, {userName}!
                    </Typography>
                    <Typography sx={{ color: '#64748b', mt: 0.5 }}>
                        Hãy chọn một chức năng để bắt đầu công việc của bạn.
                    </Typography>
                </Box>

                {/* Main Content Area */}
                <Box>
                    <Grid container spacing={3}>
                        {allModules.map((module, index) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={index}>
                                <motion.div
                                    custom={index}
                                    initial="hidden"
                                    animate="visible"
                                    variants={cardVariants}
                                    style={{ height: '100%' }}
                                >
                                    <Link to={module.to} style={{ textDecoration: 'none' }}>
                                        <StyledCard sx={{ backgroundColor: module.bgColor, position: 'relative', border: '1px solid #e2e8f0' }}>
                                            {module.isNew && (
                                                <Badge 
                                                    badgeContent="MỚI" 
                                                    color="error"
                                                    sx={{ position: 'absolute', top: 16, right: 16 }}
                                                />
                                            )}
                                            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <Box 
                                                    sx={{ 
                                                        width: 52, 
                                                        height: 52, 
                                                        borderRadius: '12px', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        backgroundColor: module.color,
                                                        color: 'white',
                                                        mb: 2,
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {module.icon}
                                                </Box>
                                                <Box sx={{ flexGrow: 1 }}>
                                                    <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', color: module.color, fontSize: '1.1rem' }}>
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
        </Box>
    );
};

export default Home;
