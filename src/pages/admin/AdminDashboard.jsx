import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Box, Typography, Grid, Paper, Stack, List, ListItemButton, ListItemText, Chip, useTheme, Avatar, Card, CardContent, useMediaQuery } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase-config';

// ✅ BƯỚC 1: Thêm icon mới
import { People as Users, Settings, BarChart, Storage as HardDrive, Assignment as ClipboardList, ChevronRight, Description as FileText, AccountBalance as Landmark, VerifiedUser as ShieldCheck } from '@mui/icons-material';

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
const AdminItemCard = styled(Card)(({ theme, disabled, color }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2.5),
    borderRadius: theme.shape.borderRadius * 2.5,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled 
        ? alpha(theme.palette.background.paper, 0.5)
        : theme.palette.mode === 'light'
            ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: `1px solid ${disabled ? alpha(theme.palette.divider, 0.3) : alpha(theme.palette[color]?.main || theme.palette.primary.main, 0.2)}`,
    boxShadow: theme.palette.mode === 'light'
        ? "0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)"
        : "0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)",
    opacity: disabled ? 0.6 : 1,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: disabled 
            ? 'transparent'
            : `linear-gradient(90deg, ${theme.palette[color]?.main || theme.palette.primary.main} 0%, ${theme.palette[color]?.light || theme.palette.primary.light} 100%)`,
        opacity: 0,
        transition: 'opacity 0.3s ease',
    },
    '&:hover': !disabled && {
        transform: 'translateY(-6px)',
        boxShadow: theme.palette.mode === 'light'
            ? `0 12px 32px ${alpha(theme.palette[color]?.main || theme.palette.primary.main, 0.15)}, 0 0 0 1px ${alpha(theme.palette[color]?.main || theme.palette.primary.main, 0.3)}`
            : `0 12px 32px ${alpha(theme.palette[color]?.main || theme.palette.primary.main, 0.3)}, 0 0 0 1px ${alpha(theme.palette[color]?.main || theme.palette.primary.main, 0.4)}`,
        borderColor: alpha(theme.palette[color]?.main || theme.palette.primary.main, 0.4),
        '&::before': {
            opacity: 1,
        },
    }
}));

const NavLinkButton = styled(ListItemButton)(({ theme }) => ({
    borderRadius: theme.shape.borderRadius * 2,
    marginBottom: theme.spacing(0.75),
    padding: theme.spacing(1.25, 1.5),
    transition: 'all 0.2s ease',
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        transform: 'translateX(4px)',
    },
    '&.Mui-selected': {
        backgroundColor: alpha(theme.palette.primary.main, 0.15),
        color: theme.palette.primary.main,
        fontWeight: 700,
        borderLeft: `3px solid ${theme.palette.primary.main}`,
        '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
        },
    }
}));

// --- COMPONENT CHÍNH ---
export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ userCount: null, reportCount: null, departmentCount: null });
    const sectionRefs = useRef({});
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

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
        <Box sx={{ 
            p: { xs: 1.5, sm: 2, md: 3 },
            position: 'relative',
            minHeight: '100vh',
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '300px',
                background: theme.palette.mode === 'light'
                    ? `radial-gradient(ellipse 80% 50% at 50% 0%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 50%)`
                    : `radial-gradient(ellipse 80% 50% at 50% 0%, ${alpha(theme.palette.primary.main, 0.12)} 0%, transparent 50%)`,
                pointerEvents: 'none',
                zIndex: 0,
            },
        }}>
            {/* Header với Glassmorphism */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5 }}
                style={{ position: 'relative', zIndex: 1 }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2.5, sm: 3 },
                        mb: 4,
                        borderRadius: 3,
                        background: theme.palette.mode === 'light'
                            ? `linear-gradient(135deg, ${alpha('#ffffff', 0.9)} 0%, ${alpha('#f8fafc', 0.9)} 100%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
                        backdropFilter: "blur(20px) saturate(180%)",
                        WebkitBackdropFilter: "blur(20px) saturate(180%)",
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: theme.palette.mode === 'light'
                            ? "0 4px 20px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)"
                            : "0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)",
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                        <Avatar
                            sx={{
                                bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                width: { xs: 48, sm: 56 },
                                height: { xs: 48, sm: 56 },
                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                            }}
                        >
                            <ShieldCheck sx={{ fontSize: { xs: 28, sm: 32 } }} />
                        </Avatar>
                        <Box>
                            <Typography 
                                variant={isMobile ? "h5" : "h4"} 
                                fontWeight={800}
                                sx={{
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    mb: 0.5,
                                }}
                            >
                                Trang quản trị
                            </Typography>
                            <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                            >
                                Tổng quan các chức năng quản lý, cấu hình và báo cáo hệ thống.
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
            </motion.div>

            <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} sx={{ position: 'relative', zIndex: 1 }}>
                {!isTablet && (
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Paper 
                            sx={{ 
                                p: 2.5, 
                                borderRadius: 3, 
                                position: 'sticky', 
                                top: '88px',
                                background: theme.palette.mode === 'light'
                                    ? `linear-gradient(135deg, ${alpha('#ffffff', 0.9)} 0%, ${alpha('#f8fafc', 0.9)} 100%)`
                                    : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
                                backdropFilter: "blur(20px) saturate(180%)",
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                boxShadow: theme.palette.mode === 'light'
                                    ? "0 2px 8px rgba(0,0,0,0.04)"
                                    : "0 2px 8px rgba(0,0,0,0.2)",
                            }}
                        >
                            <Typography 
                                variant="overline" 
                                color="text.secondary" 
                                display="block" 
                                mb={2}
                                sx={{ 
                                    fontWeight: 700,
                                    letterSpacing: 1.2,
                                    fontSize: '0.75rem',
                                }}
                            >
                                DANH MỤC
                            </Typography>
                            <List sx={{ p: 0 }}>
                                {Object.keys(groupedItems).map(group => (
                                    <NavLinkButton key={group} onClick={() => handleNavClick(group)}>
                                        <ListItemText 
                                            primary={group}
                                            primaryTypographyProps={{
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                            }}
                                        />
                                    </NavLinkButton>
                                ))}
                            </List>
                        </Paper>
                    </Grid>
                )}

                <Grid size={{ xs: 12, md: isTablet ? 12 : 9 }}>
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        {Object.entries(groupedItems).map(([group, items], groupIdx) => (
                            <Box key={group} mb={5} ref={el => sectionRefs.current[group] = el}>
                                <motion.div variants={itemVariants}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            mb: 3,
                                            borderRadius: 2,
                                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 100%)`,
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                        }}
                                    >
                                        <Typography 
                                            variant={isMobile ? "h6" : "h5"} 
                                            fontWeight={700}
                                            sx={{
                                                color: 'primary.main',
                                            }}
                                        >
                                            {group}
                                        </Typography>
                                    </Paper>
                                </motion.div>
                                <Stack spacing={2}>
                                    <AnimatePresence>
                                        {items && items.map((item, idx) => (
                                            <motion.div
                                                key={`${group}-${idx}`}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="hidden"
                                                transition={{ delay: groupIdx * 0.1 + idx * 0.05 }}
                                                whileHover={!item.disabled ? { scale: 1.01 } : {}}
                                                whileTap={!item.disabled ? { scale: 0.99 } : {}}
                                            >
                                                <AdminItemCard
                                                    onClick={() => !item.disabled && navigate(item.path)}
                                                    disabled={item.disabled}
                                                    color={item.color}
                                                >
                                                    <Avatar
                                                        sx={{
                                                            bgcolor: `${item.color}.light`,
                                                            color: `${item.color}.dark`,
                                                            width: { xs: 48, sm: 56 },
                                                            height: { xs: 48, sm: 56 },
                                                            mr: 2,
                                                            boxShadow: `0 4px 12px ${alpha(theme.palette[item.color]?.main || theme.palette.primary.main, 0.2)}`,
                                                        }}
                                                    >
                                                        {item.icon}
                                                    </Avatar>
                                                    <Box flexGrow={1} sx={{ minWidth: 0 }}>
                                                        <Typography 
                                                            fontWeight={700}
                                                            sx={{ 
                                                                fontSize: { xs: '0.95rem', sm: '1rem' },
                                                                mb: 0.5,
                                                            }}
                                                        >
                                                            {item.title}
                                                        </Typography>
                                                        <Typography 
                                                            variant="body2" 
                                                            color="text.secondary"
                                                            sx={{ 
                                                                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                                                lineHeight: 1.5,
                                                            }}
                                                        >
                                                            {item.description}
                                                        </Typography>
                                                    </Box>
                                                    {typeof item.count === 'number' && (
                                                        <Chip 
                                                            label={item.count} 
                                                            size="small" 
                                                            sx={{ 
                                                                mx: 2, 
                                                                fontWeight: 700,
                                                                bgcolor: `${item.color}.light`,
                                                                color: `${item.color}.dark`,
                                                                fontSize: '0.75rem',
                                                            }} 
                                                        />
                                                    )}
                                                    {!item.disabled && (
                                                        <ChevronRight 
                                                            sx={{ 
                                                                color: theme.palette.text.secondary,
                                                                transition: 'transform 0.2s ease',
                                                                '&:hover': {
                                                                    transform: 'translateX(4px)',
                                                                },
                                                            }} 
                                                        />
                                                    )}
                                                </AdminItemCard>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </Stack>
                            </Box>
                        ))}
                    </motion.div>
                </Grid>
            </Grid>
        </Box>
    );
}

