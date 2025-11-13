import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// --- CÁC HOOK VÀ CẤU HÌNH ---
import { useAuth } from '../contexts/AuthContext'; // Hook để lấy thông tin người dùng
import { db } from '../services/firebase-config'; // Import db instance
import { doc, getDoc } from 'firebase/firestore'; // Firestore functions

// --- CÁC COMPONENT TỪ MUI (Đã thêm Paper, TextField, InputAdornment) ---
import { Box, Card, CardContent, Typography, Grid, Badge, CircularProgress, Paper, TextField, InputAdornment } from '@mui/material';
import { styled } from '@mui/material/styles';

// --- CÁC ICON (Đã thêm Search) ---
import {
    Construction, Building, BookCheck, FileSpreadsheet, BarChart3,
    Landmark, ClipboardList, BookUser, PieChart, LineChart, TrendingUp,
    FileCheck2, FileBarChart2, ArrowRightLeft, ShieldOff,
    UserCheck, Search, // Thêm icon Search
    ClipboardCheck
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
    const { user } = useAuth();
    const [allowedModules, setAllowedModules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // State mới cho thanh tìm kiếm
    const [searchQuery, setSearchQuery] = useState('');

    // Danh sách TẤT CẢ các module trong hệ thống (ĐÃ THÊM THUỘC TÍNH 'category')
    const allModules = [
        // --- NHÓM 1: CHỨC NĂNG CHÍNH ---
        { category: 'Chức Năng Chính', icon: <UserCheck size={26} />, title: "Quản Lý Chấm Công", to: "/attendance", desc: "Theo dõi, quản lý và in bảng chấm công", color: '#16a34a', isNew: true },
        { category: 'Chức Năng Chính', icon: <Construction size={26} />, title: "Kế Hoạch Thi Công", to: "/construction-plan", desc: "Lập và theo dõi tiến độ công việc", color: '#3b82f6' },
        { category: 'Chức Năng Chính', icon: <Building size={26} />, title: "Quản Lý Công Trình", to: "/project-manager", desc: "Xem chi tiết thông tin các công trình", color: '#8b5cf6' },
        { category: 'Chức Năng Chính', icon: <ArrowRightLeft size={26} />, title: "QL Luân chuyển Tài sản", to: "/asset-transfer", desc: "Theo dõi và luân chuyển tài sản", color: '#0891b2', isNew: true },
        { 
            category: 'Chức Năng Chính', 
            icon: <ClipboardCheck size={26} />, 
            title: "So Sánh Báo Giá Vật Tư", 
            to: "/material-price-comparison", // Đường dẫn bạn đã tạo ở Router
            desc: "Tổng hợp, so sánh giá từ nhà cung cấp", 
            color: '#f97316', // (Một màu cam mới)
            isNew: true 
        },
        { category: 'Chức Năng Chính', icon: <BookCheck size={26} />, title: "Phân Bổ Chi Phí", to: "/allocations", desc: "Quản lý và phân bổ chi phí dự án", color: '#10b981' },
        { category: 'Chức Năng Chính', icon: <FileSpreadsheet size={26} />, title: "Công Nợ Phải Trả", to: "/construction-payables", desc: "Theo dõi và quản lý các khoản công nợ", color: '#f59e0b' },
        { category: 'Chức Năng Chính', icon: <FileCheck2 size={26} />, title: "Công Nợ Phải Thu", to: "/accounts-receivable", desc: "Theo dõi các khoản phải thu từ khách hàng", color: '#ec4899' },
        { category: 'Chức Năng Chính', icon: <BarChart3 size={26} />, title: "Bảng Cân Đối Kế Toán", to: "/balance-sheet", desc: "Tình hình tài sản và nguồn vốn", color: '#14b8a6' },
        { category: 'Chức Năng Chính', icon: <ClipboardList size={26} />, title: "Hệ Thống Tài Khoản", to: "/chart-of-accounts", desc: "Danh mục các tài khoản kế toán", color: '#64748b' },
        { category: 'Chức Năng Chính', icon: <FileSpreadsheet size={26} />, title: "Quản Lý Danh Mục", to: "/categories", desc: "Theo dõi công nợ", color: '#f59e0b' },
        { category: 'Chức Năng Chính', icon: <PieChart size={26} />, title: 'Chi Phí Theo Quý', to: '/cost-allocation-quarter', desc: 'Theo dõi phân bổ chi phí', color: '#8b5cf6' },
        { category: 'Chức Năng Chính', icon: <TrendingUp size={26} />, title: 'Tăng Giảm Lợi Nhuận', to: '/profit-change', desc: 'Phân tích các yếu tố ảnh hưởng', color: '#f59e0b' },

        // --- NHÓM 2: BÁO CÁO ---
        { category: 'Báo Cáo', icon: <Landmark size={26} />, title: "Báo Cáo Sử Dụng Vốn", to: "/reports/capital-utilization", desc: "Đối chiếu kế hoạch và thực tế sử dụng", color: '#6366f1' },
        { category: 'Báo Cáo', icon: <BookUser size={26} />, title: "Báo Cáo Nợ Có", to: "/reports/broker-debt", desc: "Theo dõi và đối chiếu số dư nợ có", color: '#ef4444' },
        { category: 'Báo Cáo', icon: <BarChart3 size={26} />, title: 'Báo Cáo Lợi Nhuận Quý', to: '/reports/profit-quarter', desc: 'Phân tích theo từng quý', color: '#3b82f6' },
        { category: 'Báo Cáo', icon: <FileBarChart2 size={26} />, title: "Báo cáo Phân bổ Chi phí", to: "/reports/quarterly-cost-allocation", desc: "Phân bổ chi phí theo doanh thu dự án", color: '#0d9488' },
        { category: 'Báo Cáo', icon: <LineChart size={26} />, title: 'Báo Cáo Lợi Nhuận Năm', to: '/reports/profit-year', desc: 'Xem báo cáo tổng kết năm', color: '#10b981' },
        { category: 'Báo Cáo', icon: <PieChart size={26} />, title: 'Báo Cáo Tổng Quát', to: '/reports/overall', desc: 'Tổng hợp tình hình hoạt động', color: '#6366f1' },
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

    // Lọc các module dựa trên searchQuery
    const filteredModules = allowedModules.filter(module =>
        module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Gom nhóm các module đã được lọc theo category
    const groupedModules = filteredModules.reduce((acc, module) => {
        const category = module.category || 'Khác';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(module);
        return acc;
    }, {});

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        // Tối ưu hóa background: Giữ nền sáng, sạch.
        <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', p: { xs: 2, sm: 4 } }}>
            <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
                
                {/* --- (1) HEADER VÀ THANH TÌM KIẾM TỐI ƯU --- */}
                <Paper
                    elevation={1} // Nâng elevation nhẹ để tạo độ sâu
                    sx={{ 
                        p: { xs: 2, sm: 3, md: 4 }, 
                        mb: 5, 
                        borderRadius: 3, // Giảm nhẹ độ cong của border
                        background: 'white', // Nền trắng tinh khôi
                        border: '1px solid #e0e8f4',
                    }}
                >
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} md={6} sx={{ mb: { xs: 2, md: 0 } }}>
                            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#1e293b' }}>
                                🚀 Trung Tâm Điều Hành ERP
                            </Typography>
                            <Typography sx={{ color: '#64748b', mt: 0.5 }}>
                                Chào mừng, **{user?.displayName || user?.email || 'bạn'}**! Khởi động công việc của bạn.
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                variant="outlined"
                                placeholder="Tìm kiếm chức năng (ví dụ: Công nợ, Kế hoạch...)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search size={20} color="#64748b" />
                                        </InputAdornment>
                                    ),
                                    sx: { borderRadius: '12px', bgcolor: '#f9fafb', '& fieldset': { borderColor: '#cbd5e1' } } // Nâng cấp màu sắc và border
                                }}
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {/* --- (2) HIỂN THỊ CÁC MODULE THEO NHÓM --- */}
                {Object.entries(groupedModules).map(([category, modules]) => (
                    <Box key={category} sx={{ mb: 6 }}>
                        {/* Cải tiến tiêu đề nhóm */}
                        <Typography 
                            variant="h5" 
                            sx={{ 
                                fontWeight: 700, 
                                color: '#0f172a', // Màu chữ đậm hơn
                                mb: 3, 
                                pb: 1,
                                borderBottom: '2px solid #e2e8f0', // Dải phân cách nhẹ nhàng
                                display: 'inline-block', // Để borderBottom chỉ chạy dưới chữ
                            }}
                        >
                            {category} <span style={{ color: '#6366f1', fontWeight: 600, fontSize: '1rem' }}>({modules.length})</span>
                        </Typography>

                        {/* Tối ưu hóa Grid: Hiển thị 5 cột trên màn hình XL và 6 cột trên màn hình lớn */}
                        <Grid container spacing={3}>
                            {modules.map((module, index) => (
                                <Grid 
                                    item 
                                    xs={12} 
                                    sm={6} 
                                    md={4} 
                                    lg={3} 
                                    xl={2.4} // (12/5 = 2.4 để có 5 cột trên màn hình XL)
                                    key={module.to}
                                >
                                    <motion.div custom={index} initial="hidden" animate="visible" variants={cardVariants} style={{ height: '100%' }}>
                                        <Link to={module.to} style={{ textDecoration: 'none' }}>
                                            <StyledCard>
                                                {module.isNew && (
                                                    // Sử dụng Badge hiện đại hơn, màu xanh nổi bật
                                                    <Badge 
                                                        badgeContent="NEW" 
                                                        sx={{ 
                                                            '& .MuiBadge-badge': { 
                                                                bgcolor: '#f97316', 
                                                                color: 'white', 
                                                                fontWeight: 700,
                                                                fontSize: '0.65rem',
                                                                p: '0 8px',
                                                                height: 20,
                                                                borderRadius: '10px'
                                                            },
                                                            position: 'absolute', 
                                                            top: 16, 
                                                            right: 16 
                                                        }} 
                                                    />
                                                )}
                                                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                    {/* Tối ưu hóa Icon Box */}
                                                    <Box 
                                                        sx={{ 
                                                            width: 50, 
                                                            height: 50, 
                                                            borderRadius: '12px', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center', 
                                                            backgroundColor: module.color, 
                                                            color: 'white', 
                                                            mb: 2, 
                                                            flexShrink: 0, 
                                                            boxShadow: (theme) => `0 4px 12px ${module.color + '40'}` // Thêm shadow nhẹ cùng màu
                                                        }}
                                                    >
                                                        {module.icon}
                                                    </Box>
                                                    <Box sx={{ flexGrow: 1 }}>
                                                         {/* Tối ưu hóa Tiêu đề: Giữ chiều cao cố định */}
                                                         <Typography 
                                                            variant="subtitle1" 
                                                            component="h3" 
                                                            sx={{ 
                                                                fontWeight: 700, 
                                                                color: '#1e293b', // Tiêu đề chính màu đen đậm
                                                                fontSize: '1.05rem', 
                                                                lineHeight: 1.3,
                                                                minHeight: '2.6rem', // Đủ cho 2 dòng
                                                            }}
                                                        >
                                                            {module.title}
                                                        </Typography>
                                                         {/* Tối ưu hóa Mô tả: Nhỏ và màu xám rõ ràng */}
                                                        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, fontSize: '0.85rem' }}>
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
                ))}

                {/* --- (3) TRẠNG THÁI KHÔNG TÌM THẤY TỐI ƯU --- */}
                {!isLoading && filteredModules.length === 0 && (
                    <Box 
                        sx={{ 
                            mt: 5, 
                            p: 6, 
                            bgcolor: 'white', 
                            borderRadius: 4, 
                            textAlign: 'center', 
                            border: '2px dashed #94a3b8', 
                            maxWidth: 600, 
                            mx: 'auto' 
                        }}
                    >
                        <ShieldOff size={64} color="#94a3b8" style={{ margin: '0 auto' }} />
                        <Typography variant="h5" sx={{ mt: 3, fontWeight: 700, color: '#334155' }}>
                            {allowedModules.length > 0 ? 'Không tìm thấy chức năng' : 'Truy cập bị Hạn chế'}
                        </Typography>
                        <Typography sx={{ color: '#64748b', mt: 1.5, fontSize: '1rem' }}>
                            {allowedModules.length > 0 
                                ? 'Không có module nào khớp với từ khóa tìm kiếm của bạn. Vui lòng kiểm tra lại.' 
                                : 'Tài khoản của bạn chưa được cấp quyền truy cập. Vui lòng liên hệ bộ phận hỗ trợ hoặc quản trị viên hệ thống.'
                            }
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default Home;