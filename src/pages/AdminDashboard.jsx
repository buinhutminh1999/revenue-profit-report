import React, { useEffect, useState, useRef } from 'react';
// ✨ FIX 1: Thêm 'useTheme' vào import từ @mui/material
import { Box, Typography, Grid, Paper, Stack, List, ListItem, ListItemButton, ListItemText, Chip, useTheme } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase-config';

import { Users, Settings, BarChart, HardDrive, ClipboardList, ChevronRight, FileText } from 'lucide-react';

// --- DỮ LIỆU CẤU HÌNH (Giữ nguyên) ---
const adminItems = [
    {
        title: "Quản lý người dùng",
        description: "Thêm, xóa, và phân quyền cho người dùng hệ thống.",
        icon: <Users />,
        count: 0,
        color: 'primary',
        path: "/admin/users",
        group: "Người dùng & Phân quyền",
    },
    {
        title: "Cấu hình Danh mục",
        description: "Quản lý các danh mục chi phí và các khoản mục khác.",
        icon: <Settings />,
        color: 'secondary',
        path: "/categories",
        group: "Hệ thống & Cấu hình",
    },
    {
        title: "Báo cáo Lợi nhuận Quý",
        description: "Xem và phân tích các báo cáo tài chính theo từng quý.",
        icon: <BarChart />,
        color: 'success',
        path: "/profit-report-quarter",
        group: "Thống kê & Báo cáo",
    },
    {
        title: "Báo cáo Tuần",
        description: "Tổng hợp các báo cáo công việc được gửi lên hàng tuần.",
        icon: <FileText />,
        count: 0,
        path: "/reports",
        color: 'info',
        group: "Thống kê & Báo cáo",
    },
    {
        title: "Sao lưu Dữ liệu",
        description: "Tạo bản sao lưu hoặc khôi phục dữ liệu hệ thống.",
        icon: <HardDrive />,
        disabled: true,
        color: 'warning',
        group: "Công cụ & Bảo trì",
    },
    {
        title: "Nhật ký Hệ thống",
        description: "Theo dõi các hoạt động và lỗi phát sinh trên toàn hệ thống.",
        icon: <ClipboardList />,
        disabled: true,
        color: 'error',
        group: "Công cụ & Bảo trì",
    },
];

// --- STYLED COMPONENTS (Giữ nguyên) ---
const AdminItemCard = styled(Paper)(({ theme, disabled }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius * 3,
    transition: 'all 0.2s ease-in-out',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: alpha(theme.palette.background.paper, 0.7),
    boxShadow: 'none',
    border: `1px solid ${theme.palette.divider}`,
    opacity: disabled ? 0.6 : 1,
    '&:hover': !disabled && {
        transform: 'translateY(-4px)',
        boxShadow: `0 8px 24px ${alpha(theme.palette.text.primary, 0.05)}`,
        borderColor: theme.palette.primary.main,
    }
}));

const NavLinkButton = styled(ListItemButton)(({ theme }) => ({
    borderRadius: theme.shape.borderRadius * 2,
    marginBottom: theme.spacing(1),
    '&.Mui-selected': {
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        color: theme.palette.primary.main,
        fontWeight: 'bold',
        '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.15),
        },
        '& .MuiListItemIcon-root': {
            color: theme.palette.primary.main,
        }
    }
}));


// --- COMPONENT CHÍNH ---
export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ userCount: 0, reportCount: 0 });
    const sectionRefs = useRef({});
    
    // ✨ FIX 2: Gọi hook useTheme() để có thể sử dụng biến 'theme'
    const theme = useTheme(); 

    useEffect(() => {
        const fetchStats = async () => {
            const usersSnap = await getDocs(collection(db, "users"));
            const reportsSnap = await getDocs(collection(db, "weeklyReports"));
            setStats({ userCount: usersSnap.size, reportCount: reportsSnap.size });
        };
        fetchStats();
    }, []);

    const itemsWithStats = adminItems.map(item => {
        if (item.title === "Quản lý người dùng") return { ...item, count: stats.userCount };
        if (item.title === "Báo cáo Tuần") return { ...item, count: stats.reportCount };
        return item;
    });

    const groupedItems = itemsWithStats.reduce((acc, item) => {
        acc[item.group] = acc[item.group] || [];
        acc[item.group].push(item);
        return acc;
    }, {});

    const handleNavClick = (groupId) => {
        sectionRefs.current[groupId]?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <Box p={{xs: 2, md: 3}}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                 <Typography variant="h4" gutterBottom fontWeight={700}>
                    Trang quản trị
                </Typography>
                <Typography variant="body1" color="text.secondary" mb={4}>
                    Tổng quan các chức năng quản lý, cấu hình và báo cáo hệ thống.
                </Typography>
            </motion.div>

            <Grid container spacing={5}>
                <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, borderRadius: 4, position: 'sticky', top: '88px', background: 'transparent', boxShadow: 'none' }}>
                        <Typography variant="overline" color="text.secondary" display="block" mb={1}>DANH MỤC</Typography>
                        <List>
                            {Object.keys(groupedItems).map(group => (
                                <NavLinkButton key={group} onClick={() => handleNavClick(group)}>
                                    <ListItemText primary={group} />
                                </NavLinkButton>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={9}>
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        {Object.entries(groupedItems).map(([group, items]) => (
                            <Box key={group} mb={5} ref={el => sectionRefs.current[group] = el}>
                                <motion.div variants={itemVariants}>
                                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>{group}</Typography>
                                </motion.div>
                                <Stack spacing={2}>
                                    {items.map((item, idx) => (
                                        <motion.div variants={itemVariants} key={idx}>
                                            <AdminItemCard
                                                onClick={() => !item.disabled && navigate(item.path)}
                                                disabled={item.disabled}
                                            >
                                                <Box color={`${item.color}.main`} display="flex" mr={2}>{item.icon}</Box>
                                                <Box flexGrow={1}>
                                                    <Typography fontWeight="bold">{item.title}</Typography>
                                                    <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                                                </Box>
                                                {item.count !== undefined && <Chip label={item.count} size="small" sx={{ mx: 2, fontWeight: 'bold' }} />}
                                                
                                                {/* ✨ FIX 3: Dùng prop 'sx' để gán màu tùy chỉnh cho icon */}
                                                {!item.disabled && <ChevronRight style={{ color: theme.palette.text.secondary }} />}
                                            </AdminItemCard>
                                        </motion.div>
                                    ))}
                                </Stack>
                            </Box>
                        ))}
                    </motion.div>
                </Grid>
            </Grid>
        </Box>
    );
}