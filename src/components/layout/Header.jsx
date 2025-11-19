import React, { useContext, useEffect, useMemo, useState } from "react";
import {
    Toolbar, Box, IconButton, Tooltip, Menu, MenuItem, Divider,
    useTheme, Avatar, Badge, Stack, Typography, Paper,
    InputBase, ListItemButton, ListItemIcon, ListItemText, Breadcrumbs, Link as MuiLink,
    Tabs, Tab, Button,
    Chip, Skeleton, CircularProgress
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";

// Context & Hooks
import { ThemeSettingsContext } from "../../styles/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import DensityToggleButton from "../../components/DensityToggleButton";
import { EmptyState, ErrorState } from "../common";

// Firestore
import { db } from "../../services/firebase-config";
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    doc,
    updateDoc,
    arrayUnion,
    writeBatch,
} from "firebase/firestore";

// lucide-react icons
import {
    Search, Moon, Sun, Settings as SettingsIcon, LogOut, User as UserIcon, Bell,
    HelpCircle, Shield, Menu as MenuIcon, ChevronRight, Home, LayoutDashboard,
    Building2, BarChart2, FolderOpen, TrendingUp, ChevronsLeft, PlusCircle, Trash2,
    FilePlus,
    Check,
    X,
    UserCheck,
    Send,
    FilePen,
} from "lucide-react";

// ---------- styled ----------
const NotificationBadge = styled(Badge)(({ theme }) => ({
    "& .MuiBadge-badge": {
        backgroundColor: theme.palette.error.main,
        color: theme.palette.error.contrastText,
        right: 4,
        top: 4,
        border: `2px solid ${theme.palette.background.paper}`,
    },
}));

const UserSection = styled(Box)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 1.5), // Tăng padding ngang
    borderRadius: theme.shape.borderRadius * 3, // Bo góc nhiều hơn, hiện đại hơn
    cursor: "pointer",
    transition: "background-color 0.2s ease, box-shadow 0.2s ease",
    backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[100] : alpha(theme.palette.common.white, 0.05), 
    "&:hover": {
        backgroundColor: alpha(theme.palette.primary.main, 0.1), // Hover nổi bật
    },
}));

const CommandPalette = styled(Paper)(({ theme }) => ({
    position: "absolute",
    top: "15%", // Đưa lên cao hơn một chút
    left: "50%",
    transform: "translateX(-50%)",
    width: "90%",
    maxWidth: 680,
    maxHeight: "70vh", // Tăng chiều cao tối đa
    overflow: "hidden",
    borderRadius: theme.shape.borderRadius * 3,
    boxShadow: theme.shadows[24],
    border: `1px solid ${theme.palette.divider}`,
}));

const QuickAction = styled(ListItemButton)(({ theme }) => ({
    padding: theme.spacing(1, 1.5), // Tăng padding
    borderRadius: theme.spacing(1.5), // Bo góc rõ ràng
    marginBottom: theme.spacing(0.5),
    transition: "all 0.2s ease",
    "&:hover": {
        backgroundColor: alpha(theme.palette.primary.main, 0.15), // Hover mạnh mẽ hơn
        transform: "scale(1.01)", // Thêm hiệu ứng phóng to nhẹ
    },
    "& .action-icon": {
        color: theme.palette.primary.main,
    },
}));

// ---------- breadcrumbs map ----------
const pathMap = {
    "project-manager": "Quản lý Dự án",
    "construction-plan": "Kế hoạch Thi công",
    "accounts-receivable": "Công nợ Phải thu",
    "construction-payables": "Công nợ Phải trả",
    "profit-report-quarter": "Báo cáo Lợi nhuận Quý",
    "profit-report-year": "Báo cáo Lợi nhuận Năm",
    "balance-sheet": "Bảng Cân đối Kế toán",
    "allocations": "Phân bổ Chi phí",
    "user": "Hồ sơ Người dùng",
    "settings": "Cài đặt",
    "admin": "Quản trị Hệ thống",
};

// ---------- Notification Config ----------
const notificationConfig = {
    ASSET_CREATED: { icon: <PlusCircle size={20} color="#2e7d32" />, template: (actor, target) => `**${actor}** đã tạo tài sản mới **${target}**.` },
    ASSET_DELETED: { icon: <Trash2 size={20} color="#d32f2f" />, template: (actor, target) => `**${actor}** đã xóa tài sản **${target}**.` },
    ASSET_REQUEST_CREATED: { icon: <FilePlus size={20} color="#0288d1" />, template: (actor, target) => `**${actor}** đã gửi yêu cầu thêm tài sản **${target}**.` },
    ASSET_REQUEST_DELETED: { icon: <Trash2 size={20} color="#d32f2f" />, template: (actor) => `**${actor}** đã xóa một yêu cầu thay đổi.` },
    ASSET_REQUEST_REJECTED: { icon: <X size={20} color="#d32f2f" />, template: (actor, target) => `**${actor}** đã từ chối yêu cầu cho tài sản **${target}**.` },
    ASSET_REQUEST_APPROVED: { icon: <Check size={20} color="#2e7d32" />, template: (actor, target) => `**${actor}** đã duyệt yêu cầu cho tài sản **${target}**.` },
    ASSET_REQUEST_HC_APPROVED: { icon: <UserCheck size={20} color="#1976d2" />, template: (actor, target) => `**${actor}** (P.HC) đã duyệt yêu cầu cho **${target}**.` },
    ASSET_REQUEST_KT_APPROVED: { icon: <Check size={20} color="#2e7d32" />, template: (actor, target) => `**${actor}** (P.KT) đã duyệt xong yêu cầu cho **${target}**.` },
    TRANSFER_CREATED: { icon: <Send size={20} color="#0288d1" />, template: (actor, target) => `**${actor}** đã tạo phiếu luân chuyển **${target}**.` },
    TRANSFER_DELETED: { icon: <Trash2 size={20} color="#d32f2f" />, template: (actor, target) => `**${actor}** đã xóa phiếu luân chuyển **${target}**.` },
    TRANSFER_SIGNED: { icon: <FilePen size={20} color="#1976d2" />, template: (actor, target, details) => `**${actor}** đã ký **${details}** cho phiếu **${target}**.` },
    REPORT_CREATED: { icon: <FilePlus size={20} color="#0288d1" />, template: (actor, target) => `**${actor}** đã tạo **${target}**.` },
    REPORT_SIGNED: { icon: <Check size={20} color="#2e7d32" />, template: (actor, target, details) => `**${actor}** đã ký **${details}** cho **${target}**.` },
    REPORT_DELETED: { icon: <Trash2 size={20} color="#d32f2f" />, template: (actor, target) => `**${actor}** đã xóa **${target}**.` },
    REPORT_DELETED_BY_CALLABLE: { icon: <Trash2 size={20} color="#d32f2f" />, template: (actor, target) => `**${actor}** đã xóa **${target}** (qua tác vụ hệ thống).` },
    DEFAULT: { icon: <Bell size={20} />, template: (actor) => `**${actor}** đã thực hiện một hành động.` }
};

export default function Header({ onSidebarToggle, isSidebarOpen }) {
    const theme = useTheme();
    const reduce = useReducedMotion();
    const { toggleColorMode } = useContext(ThemeSettingsContext);
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [searchOpen, setSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [userMenuAnchor, setUserMenuAnchor] = useState(null);
    const [notificationAnchor, setNotificationAnchor] = useState(null);
    const [notificationTab, setNotificationTab] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(true); // ✅ Thêm loading state
    const [notificationsError, setNotificationsError] = useState(null); // ✅ Thêm error state

    // ✅ Cải thiện: Thêm loading và error handling cho notifications
    useEffect(() => {
        if (!user?.uid) {
            setNotificationsLoading(false);
            return;
        }
        setNotificationsLoading(true);
        setNotificationsError(null);
        const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(20));
        const unsubscribe = onSnapshot(
            q, 
            (querySnapshot) => {
                const logsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    isRead: doc.data().readBy?.includes(user.uid),
                }));
                setNotifications(logsData);
                setNotificationsLoading(false);
            },
            (error) => {
                console.error("Error loading notifications:", error);
                setNotificationsError(error);
                setNotificationsLoading(false);
            }
        );
        return () => unsubscribe();
    }, [user?.uid]);

    useHotkeys("ctrl+k, cmd+k", (e) => { e.preventDefault(); setSearchOpen(true); });
    useHotkeys("ctrl+b, cmd+b", (e) => { e.preventDefault(); onSidebarToggle?.(); });
    useHotkeys("esc", () => { setSearchOpen(false); setSearchValue(""); }, { enableOnFormTags: true });

    useEffect(() => {
        setUserMenuAnchor(null);
        setNotificationAnchor(null);
    }, [location.pathname, location.search]);

    const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

    const handleMarkAsRead = async (notificationId) => {
        if (!user?.uid || !notificationId) return;
        const notifRef = doc(db, "audit_logs", notificationId);
        try {
            await updateDoc(notifRef, { readBy: arrayUnion(user.uid) });
        } catch (error) {
            console.error("Lỗi khi đánh dấu đã đọc:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user?.uid) return;
        const unreadNotifications = notifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) return;
        const batch = writeBatch(db);
        unreadNotifications.forEach(notif => {
            const notifRef = doc(db, "audit_logs", notif.id);
            batch.update(notifRef, { readBy: arrayUnion(user.uid) });
        });
        try {
            await batch.commit();
        } catch (error) {
            console.error("Lỗi khi đánh dấu tất cả đã đọc:", error);
        }
    };

    const handleLogout = async () => {
        setUserMenuAnchor(null);
        const { signOut, getAuth } = await import("firebase/auth");
        await signOut(getAuth());
        navigate("/login");
    };

    // ✅ Cải thiện: Mở rộng quick actions với nhiều tùy chọn hơn
    const quickActions = useMemo(
        () => [
            {
                category: "Điều hướng",
                items: [
                    { icon: <LayoutDashboard size={20} />, text: "Dashboard", action: () => navigate("/") },
                    { icon: <Building2 size={20} />, text: "Danh sách dự án", action: () => navigate("/project-manager") },
                    { icon: <BarChart2 size={20} />, text: "Báo cáo lợi nhuận", action: () => navigate("/profit-report-quarter") },
                    { icon: <TrendingUp size={20} />, text: "Báo cáo lợi nhuận năm", action: () => navigate("/profit-report-year") },
                    { icon: <FolderOpen size={20} />, text: "Công nợ phải thu", action: () => navigate("/accounts-receivable") },
                    { icon: <FolderOpen size={20} />, text: "Công nợ phải trả", action: () => navigate("/construction-payables") },
                ],
            },
            {
                category: "Hành động",
                items: [
                    { icon: <FolderOpen size={20} />, text: "Tạo dự án mới", action: () => navigate("/construction-plan") },
                    { icon: <PlusCircle size={20} />, text: "Quản lý tài sản", action: () => navigate("/asset-transfer") },
                    { icon: <FilePlus size={20} />, text: "So sánh giá vật tư", action: () => navigate("/material-price-comparison") },
                ],
            },
            ...(user?.role === 'admin' ? [{
                category: "Quản trị",
                items: [
                    { icon: <Shield size={20} />, text: "Quản trị hệ thống", action: () => navigate("/admin") },
                    { icon: <UserCheck size={20} />, text: "Quản lý người dùng", action: () => navigate("/admin") },
                ],
            }] : []),
        ],
        [navigate, user?.role]
    );

    const pathnames = location.pathname.split("/").filter((x) => x);
    const filteredActions = useMemo(() => {
        const q = searchValue.trim().toLowerCase();
        if (!q) return quickActions;
        return quickActions.map((g) => ({
            ...g,
            items: g.items.filter((i) => i.text.toLowerCase().includes(q)),
        }));
    }, [searchValue, quickActions]);
    const noActionFound = filteredActions.every((g) => g.items.length === 0);
    
    // ✅ Cải thiện: Tính toán total items cho keyboard navigation
    const totalItems = useMemo(() => 
        filteredActions.reduce((sum, group) => sum + group.items.length, 0),
        [filteredActions]
    );
    
    // ✅ Cải thiện: Thêm keyboard navigation cho command palette
    const [selectedIndex, setSelectedIndex] = useState(0);
    
    // ✅ Cải thiện: Reset selectedIndex khi searchValue thay đổi
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchValue]);
    
    useEffect(() => {
        if (!searchOpen) {
            setSelectedIndex(0);
            return;
        }
        
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && totalItems > 0) {
                e.preventDefault();
                // Tìm và thực thi action được chọn
                let currentIndex = 0;
                for (const group of filteredActions) {
                    for (const item of group.items) {
                        if (currentIndex === selectedIndex) {
                            item.action();
                            setSearchOpen(false);
                            setSearchValue("");
                            return;
                        }
                        currentIndex++;
                    }
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchOpen, totalItems, selectedIndex, filteredActions]);

    return (
        <>
            <Toolbar
                sx={{
                    px: { xs: 2, sm: 3 },
                    height: 64,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    // ✨ TỐI ƯU UI/UX ✨
                    borderBottom: (t) => `1px solid ${t.palette.divider}`,
                    backgroundColor: (t) => t.palette.background.paper,
                    boxShadow: (t) => t.shadows[1], // Thêm shadow nhẹ
                    zIndex: 1100, // Đảm bảo nó luôn ở trên nội dung trang
                    position: 'sticky', // Giữ thanh Header cố định khi cuộn
                    top: 0,
                }}
            >
                {/* Left: toggle + breadcrumbs */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Tooltip title={isSidebarOpen ? "Thu gọn (⌘B)" : "Mở rộng (⌘B)"}>
                        <IconButton
                            color="inherit"
                            onClick={onSidebarToggle}
                            edge="start"
                            aria-label={isSidebarOpen ? "Thu gọn thanh điều hướng" : "Mở thanh điều hướng"}
                        >
                            {isSidebarOpen ? <ChevronsLeft /> : <MenuIcon />}
                        </IconButton>
                    </Tooltip>

                    <Box sx={{ display: { xs: "none", md: "block" } }}>
                        <Breadcrumbs 
                            aria-label="breadcrumb" 
                            separator={<ChevronRight size={16} />} 
                            sx={{ '& .MuiBreadcrumbs-separator': { mx: 0.5 } }} // Giảm khoảng cách giữa các dấu >
                        >
                            <MuiLink
                                component={RouterLink}
                                underline="hover"
                                sx={{ display: "flex", alignItems: "center", transition: 'color 0.2s' }}
                                color="text.secondary" // Màu xám nhẹ cho link chưa active
                                to="/"
                            >
                                <Home size={16} style={{ marginRight: 6 }} /> {/* Icon nhỏ hơn */}
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>Tổng quan</Typography>
                            </MuiLink>
                            {pathnames.map((value, index) => {
                                const last = index === pathnames.length - 1;
                                const to = `/${pathnames.slice(0, index + 1).join("/")}`;
                                const label = pathMap[value] || value.charAt(0).toUpperCase() + value.slice(1);
                                return last ? (
                                    <Typography
                                        color="text.primary"
                                        key={to}
                                        sx={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            fontWeight: 700, 
                                            fontSize: '0.9rem' // Tăng fontWeight
                                        }}
                                        aria-current="page"
                                    >
                                        {label}
                                    </Typography>
                                ) : (
                                    <MuiLink 
                                        component={RouterLink} 
                                        underline="hover" 
                                        color="text.secondary" 
                                        to={to} 
                                        key={to}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
                                    </MuiLink>
                                );
                            })}
                        </Breadcrumbs>
                    </Box>
                </Box>

                {/* Right: actions */}
                <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1.5 }}>
                    <Tooltip title="Tìm kiếm nhanh (⌘K)">
                        <IconButton color="inherit" onClick={() => setSearchOpen(true)} aria-label="Mở bảng lệnh nhanh">
                            <Search size={20} />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Chế độ Sáng/Tối">
                        <IconButton
                            sx={{ display: { xs: "none", sm: "inline-flex" } }}
                            color="inherit"
                            onClick={toggleColorMode}
                            aria-label="Đổi chế độ sáng/tối"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={theme.palette.mode}
                                    initial={reduce ? {} : { rotate: -90, opacity: 0 }}
                                    animate={reduce ? {} : { rotate: 0, opacity: 1 }}
                                    exit={reduce ? {} : { rotate: 90, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {theme.palette.mode === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                                </motion.div>
                            </AnimatePresence>
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Thay đổi mật độ hiển thị">
                        <Box sx={{ display: { xs: "none", sm: "block" } }}>
                            <DensityToggleButton />
                        </Box>
                    </Tooltip>

                    <Tooltip title="Thông báo">
                        <IconButton
                            color="inherit"
                            onClick={(e) => setNotificationAnchor(e.currentTarget)}
                            aria-label={`Mở thông báo, ${unreadCount} chưa đọc`}
                        >
                            <NotificationBadge badgeContent={unreadCount} max={9}>
                                <Bell size={20} />
                            </NotificationBadge>
                        </IconButton>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: "none", sm: "block" } }} />

                    <UserSection
                        onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                        aria-label="Mở menu người dùng"
                        role="button"
                    >
                        <Avatar src={user?.photoURL ?? ""} alt={user?.displayName ?? "User"} sx={{ width: 36, height: 36 }}>
                            {user?.displayName?.[0] || "U"}
                        </Avatar>
                        <Box sx={{ display: { xs: "none", md: "block" } }}>
                            <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                                {user?.displayName || "User"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                            </Typography>
                        </Box>
                    </UserSection>
                </Stack>
            </Toolbar>

            {/* USER MENU */}
            <Menu
                keepMounted
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{ sx: { mt: 1, minWidth: 220, borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } }}
            >
                <MenuItem onClick={() => { setUserMenuAnchor(null); navigate("/user"); }}>
                    <ListItemIcon><UserIcon size={18} /></ListItemIcon>
                    <ListItemText primary="Hồ sơ cá nhân" />
                </MenuItem>
                <MenuItem onClick={() => { setUserMenuAnchor(null); navigate("/settings"); }}>
                    <ListItemIcon><SettingsIcon size={18} /></ListItemIcon>
                    <ListItemText primary="Cài đặt" />
                </MenuItem>
                
                {/* Bọc mục "Quản trị" trong điều kiện kiểm tra vai trò */}
                {user?.role === 'admin' && (
                    <MenuItem onClick={() => { setUserMenuAnchor(null); navigate("/admin"); }}>
                        <ListItemIcon><Shield size={18} /></ListItemIcon>
                        <ListItemText primary="Quản trị" />
                    </MenuItem>
                )}
                
                <MenuItem onClick={() => { setUserMenuAnchor(null); navigate("/help"); }}>
                    <ListItemIcon><HelpCircle size={18} /></ListItemIcon>
                    <ListItemText primary="Trợ giúp" />
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { toggleColorMode(); }}>
                    <ListItemIcon>{theme.palette.mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}</ListItemIcon>
                    <ListItemText primary={theme.palette.mode === "dark" ? "Chế độ Sáng" : "Chế độ Tối"} />
                </MenuItem>
                <MenuItem onClick={async () => { setUserMenuAnchor(null); await handleLogout(); }}>
                    <ListItemIcon><LogOut size={18} /></ListItemIcon>
                    <ListItemText primary="Đăng xuất" />
                </MenuItem>
            </Menu>

            {/* NOTIFICATION MENU */}
            <Menu
                keepMounted
                anchorEl={notificationAnchor}
                open={Boolean(notificationAnchor)}
                onClose={() => setNotificationAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{ sx: { mt: 1, width: 380, maxWidth: "90vw", borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } }}
            >
                <Box sx={{ px: 2, pt: 1.5, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={700}>Thông báo</Typography>
                    {unreadCount > 0 && (
                        <Button size="small" onClick={handleMarkAllAsRead} sx={{ mr: -1 }}>
                            Đánh dấu đã đọc
                        </Button>
                    )}
                </Box>
                <Tabs
                    value={notificationTab}
                    onChange={(_, v) => setNotificationTab(v)}
                    variant="fullWidth"
                    sx={{ borderBottom: (t) => `1px solid ${t.palette.divider}` }}
                >
                    <Tab label="Tất cả" />
                    <Tab label={`Chưa đọc (${unreadCount})`} />
                </Tabs>
                <Box sx={{ maxHeight: 360, overflowY: "auto", p: 1 }}>
                    {/* ✅ Cải thiện: Loading state */}
                    {notificationsLoading ? (
                        <Box sx={{ p: 2 }}>
                            {[...Array(3)].map((_, i) => (
                                <Box key={i} sx={{ mb: 2 }}>
                                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                        <Skeleton variant="circular" width={36} height={36} />
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Skeleton height={20} width="80%" sx={{ mb: 0.5 }} />
                                            <Skeleton height={16} width="60%" />
                                        </Box>
                                    </Stack>
                                </Box>
                            ))}
                        </Box>
                    ) : notificationsError ? (
                        // ✅ Cải thiện: Error state
                        <Box sx={{ p: 3 }}>
                            <ErrorState
                                error={notificationsError}
                                title="Lỗi tải thông báo"
                                onRetry={() => {
                                    setNotificationsError(null);
                                    setNotificationsLoading(true);
                                }}
                                retryLabel="Thử lại"
                                size="small"
                            />
                        </Box>
                    ) : notifications.filter((n) => (notificationTab === 0 ? true : !n.isRead)).length === 0 ? (
                        // ✅ Cải thiện: Empty state với component
                        <EmptyState
                            icon={<Bell size={48} />}
                            title="Không có thông báo nào"
                            description={
                                notificationTab === 0 
                                    ? "Bạn chưa có thông báo nào. Thông báo sẽ xuất hiện ở đây khi có hoạt động mới."
                                    : "Tất cả thông báo đã được đọc."
                            }
                            size="small"
                        />
                    ) : (
                        // ✅ Hiển thị notifications
                        notifications
                            .filter((n) => (notificationTab === 0 ? true : !n.isRead))
                            .map((n) => {
                            const config = notificationConfig[n.action] || notificationConfig.DEFAULT;
                            return (
                                <ListItemButton
                                    key={n.id}
                                    onClick={() => {
                                        if (!n.isRead) handleMarkAsRead(n.id);
                                        setNotificationAnchor(null);
                                    }}
                                    sx={{ 
                                        borderRadius: 1.5, 
                                        mb: 0.5, 
                                        alignItems: 'flex-start',
                                        // Highlight thông báo chưa đọc
                                        bgcolor: n.isRead ? 'transparent' : alpha(theme.palette.primary.light, 0.05),
                                        "&:hover": {
                                            bgcolor: alpha(theme.palette.primary.light, 0.1),
                                        }
                                    }}
                                >
                                    <ListItemIcon sx={{ mt: 0.5, minWidth: 36 }}>{config.icon}</ListItemIcon>

                                    <ListItemText
                                        primary={
                                            <Typography variant="body2" fontWeight={n.isRead ? 400 : 700} sx={{ mb: 0.25 }}>
                                                {config.template(
                                                    n.actor?.name || "Một người dùng",
                                                    n.target?.name || "",
                                                    n.details?.step || ""
                                                ).split('**').map((text, index) => (
                                                    <b key={index} style={{ color: n.isRead ? undefined : theme.palette.primary.main }}>{index % 2 === 1 ? text : text}</b> 
                                                ))}
                                            </Typography>
                                        }
                                        secondary={
                                            <Typography variant="caption" color="text.secondary">
                                                {n.timestamp?.toDate().toLocaleString("vi-VN", {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </Typography>
                                        }
                                    />
                                    {!n.isRead && (
                                        <Box sx={{ mt: 0.75, width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                                    )}
                                </ListItemButton>
                            );
                        })
                    )}
                </Box>
                <Box sx={{ p: 1, borderTop: t => `1px solid ${t.palette.divider}` }}>
                    <Button fullWidth size="small" onClick={() => {
                        setNotificationAnchor(null)
                    }}>
                        Xem tất cả
                    </Button>
                </Box>
            </Menu>

            {/* COMMAND PALETTE (⌘/Ctrl + K) */}
            <AnimatePresence>
                {searchOpen && (
                    <motion.div
                        initial={reduce ? {} : { opacity: 0 }}
                        animate={reduce ? {} : { opacity: 1 }}
                        exit={reduce ? {} : { opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ position: "fixed", inset: 0, zIndex: 1400, background: alpha(theme.palette.background.default, 0.4), backdropFilter: "blur(2px)" }}
                        onClick={() => setSearchOpen(false)}
                    >
                        <CommandPalette onClick={(e) => e.stopPropagation()}>
                            <Box sx={{ p: 1.5, borderBottom: (t) => `1px solid ${t.palette.divider}`, display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Search size={18} color={theme.palette.primary.main} /> {/* Highlight icon Search */}
                                <InputBase
                                    fullWidth
                                    placeholder="Tìm nhanh chức năng, dự án, báo cáo... (gõ để lọc)"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    autoFocus
                                    inputProps={{ "aria-label": "Tìm kiếm nhanh" }}
                                    sx={{ fontSize: '1.1rem' }} // Chữ to hơn
                                />
                                <Button 
                                    onClick={() => setSearchOpen(false)} 
                                    size="small"
                                    color="inherit"
                                    startIcon={<X size={14} />}
                                    sx={{ textTransform: 'none', minWidth: 'auto', p: '2px 8px', borderRadius: 1.5 }}
                                >
                                    Đóng
                                </Button>
                            </Box>
                            <Box sx={{ p: 2, maxHeight: 360, overflowY: "auto" }}>
                                {filteredActions.map((group) => {
                                    let groupStartIndex = 0;
                                    // Tính toán start index cho group này
                                    for (const g of filteredActions) {
                                        if (g.category === group.category) break;
                                        groupStartIndex += g.items.length;
                                    }
                                    
                                    return (
                                        <Box key={group.category} sx={{ mb: 2 }}>
                                            <Typography variant="overline" color="text.secondary">{group.category}</Typography>
                                            {group.items.map((item, itemIndex) => {
                                                const currentIndex = groupStartIndex + itemIndex;
                                                const isSelected = currentIndex === selectedIndex;
                                                
                                                return (
                                                    <QuickAction 
                                                        key={item.text} 
                                                        onClick={() => { 
                                                            item.action(); 
                                                            setSearchOpen(false); 
                                                            setSearchValue("");
                                                        }}
                                                        sx={{
                                                            ...(isSelected && {
                                                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                                                                transform: "scale(1.01)",
                                                            })
                                                        }}
                                                    >
                                                        <ListItemIcon className="action-icon">{item.icon}</ListItemIcon>
                                                        <ListItemText primary={item.text} />
                                                    </QuickAction>
                                                );
                                            })}
                                        </Box>
                                    );
                                })}
                                {noActionFound && (
                                    <Box sx={{ p: 3, textAlign: 'center' }}>
                                        <Typography color="text.secondary">Không tìm thấy hành động phù hợp.</Typography>
                                    </Box>
                                )}
                            </Box>
                        </CommandPalette>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}