import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Box, Typography, Grid, Paper, Stack, List, ListItemButton, ListItemText, Chip, useTheme } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase-config';

// ✅ BƯỚC 1: Thêm icon mới
import { Users, Settings, BarChart, HardDrive, ClipboardList, ChevronRight, FileText, Landmark, ShieldCheck } from 'lucide-react';

// --- DỮ LIỆU CẤU HÌNH ---
const adminItems = [
    {
        title: "Quản lý người dùng",
        description: "Thêm, xóa, và phân quyền cho người dùng hệ thống.",
        icon: <Users />,
        countKey: 'userCount',
        color: 'primary',
        path: "/admin/users",
        group: "Người dùng & Phân quyền",
    },
    {
        title: "Quản lý Phòng ban",
        description: "Tạo, sửa đổi và chỉ định trưởng phòng cho các đơn vị.",
        icon: <Landmark />,
        countKey: 'departmentCount',
        color: 'secondary',
        path: "/admin/departments",
        group: "Người dùng & Phân quyền",
    },
    // ✅ BƯỚC 2: Thêm mục mới cho trang quản lý phân quyền tại đây
    {
        title: "Quản lý Phân quyền",
        description: "Cấp quyền truy cập chi tiết cho người dùng vào các trang.",
        icon: <ShieldCheck />,
        color: 'warning',
        path: "/admin/whitelist", // Đường dẫn đến trang quản lý
        group: "Người dùng & Phân quyền",
    },
    {
        title: "Cấu hình Danh mục",
        description: "Quản lý các danh mục chi phí và các khoản mục khác.",
        icon: <Settings />,
        color: 'info',
        path: "/categories",
        group: "Hệ thống & Cấu hình",
    },
    {
        title: "Báo cáo Lợi nhuận Quý",
        description: "Xem và phân tích các báo cáo tài chính theo từng quý.",
        icon: <BarChart />,
        color: 'success',
        path: "/reports/profit-quarter",
        group: "Thống kê & Báo cáo",
    },
    {
        title: "Báo cáo Tuần",
        description: "Tổng hợp các báo cáo công việc được gửi lên hàng tuần.",
        icon: <FileText />,
        countKey: 'reportCount',
        path: "/reports/weekly",
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
        path: "/admin/audit-log",
        disabled: false,
        color: 'error',
        group: "Công cụ & Bảo trì",
    },
];

// --- STYLED COMPONENTS ---
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
    }
}));

// --- COMPONENT CHÍNH ---
export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ userCount: null, reportCount: null, departmentCount: null });
    const sectionRefs = useRef({});
    const theme = useTheme(); 

    useEffect(() => {
        const fetchStats = async () => {
            const safeGetDocs = async (collectionName) => {
                try {
                    const snap = await getDocs(collection(db, collectionName));
                    return snap.size;
                } catch (error) {
                    console.warn(`Cảnh báo: Không thể tải collection '${collectionName}'.`, error.message);
                    return 0;
                }
            };

            const [userCount, reportCount, departmentCount] = await Promise.all([
                safeGetDocs("users"),
                safeGetDocs("weeklyReports"),
                safeGetDocs("departments")
            ]);
            
            setStats({ userCount, reportCount, departmentCount });
        };
        fetchStats();
    }, []);

    const groupedItems = useMemo(() => {
        return adminItems.reduce((acc, item) => {
            const itemWithStat = { ...item, count: stats[item.countKey] };
            const group = item.group || 'Chưa phân loại';
            acc[group] = acc[group] || [];
            acc[group].push(itemWithStat);
            return acc;
        }, {});
    }, [stats]);

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
                                    {items && items.map((item, idx) => (
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
                                                {typeof item.count === 'number' && <Chip label={item.count} size="small" sx={{ mx: 2, fontWeight: 'bold' }} />}
                                                
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
