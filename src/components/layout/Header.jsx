// src/components/layout/Header.jsx — ERP-modern header (a11y, reduced-motion, shortcuts, tidy menus)

import React, { useContext, useEffect, useMemo, useState } from "react";
import {
    Toolbar, Box, IconButton, Tooltip, Menu, MenuItem, Divider,
    useTheme, Avatar, Badge, Stack, Typography, Paper,
    InputBase, ListItemButton, ListItemIcon, ListItemText, Breadcrumbs, Link as MuiLink,
    Tabs, Tab, Button,
    Chip
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";

// Context & Hooks
import { ThemeSettingsContext } from "../../styles/ThemeContext";
import { useAuth } from "../../App";
import DensityToggleButton from "../../components/DensityToggleButton";

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
    writeBatch, // << Bổ sung writeBatch
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
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius * 2,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    "&:hover": {
        backgroundColor: alpha(theme.palette.action.active, 0.05),
    },
}));

const CommandPalette = styled(Paper)(({ theme }) => ({
    position: "absolute",
    top: "20%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "90%",
    maxWidth: 680,
    maxHeight: "60vh",
    overflow: "hidden",
    borderRadius: theme.shape.borderRadius * 3,
    boxShadow: theme.shadows[24],
    border: `1px solid ${theme.palette.divider}`,
}));

const QuickAction = styled(ListItemButton)(({ theme }) => ({
    borderRadius: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    transition: "all 0.2s ease",
    "&:hover": {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        transform: "translateX(4px)",
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

// ---------- Notification Config (Tùy chỉnh icon & text) ----------
const notificationConfig = {
    // Luồng Tài sản (Asset)
    ASSET_CREATED: { icon: <PlusCircle size={20} color="#2e7d32" />, template: (actor, target) => `**${actor}** đã tạo tài sản mới **${target}**.` },
    ASSET_DELETED: { icon: <Trash2 size={20} color="#d32f2f" />, template: (actor, target) => `**${actor}** đã xóa tài sản **${target}**.` },

    // Luồng Yêu cầu Thay đổi (Asset Request)
    ASSET_REQUEST_CREATED: { icon: <FilePlus size={20} color="#0288d1" />, template: (actor, target) => `**${actor}** đã gửi yêu cầu thêm tài sản **${target}**.` },
    ASSET_REQUEST_DELETED: { icon: <Trash2 size={20} color="#d32f2f" />, template: (actor) => `**${actor}** đã xóa một yêu cầu thay đổi.` },
    ASSET_REQUEST_REJECTED: { icon: <X size={20} color="#d32f2f" />, template: (actor, target) => `**${actor}** đã từ chối yêu cầu cho tài sản **${target}**.` },
    ASSET_REQUEST_APPROVED: { icon: <Check size={20} color="#2e7d32" />, template: (actor, target) => `**${actor}** đã duyệt yêu cầu cho tài sản **${target}**.` },
    ASSET_REQUEST_HC_APPROVED: { icon: <UserCheck size={20} color="#1976d2" />, template: (actor, target) => `**${actor}** (P.HC) đã duyệt yêu cầu cho **${target}**.` },
    ASSET_REQUEST_KT_APPROVED: { icon: <Check size={20} color="#2e7d32" />, template: (actor, target) => `**${actor}** (P.KT) đã duyệt xong yêu cầu cho **${target}**.` },

    // NEW: Bổ sung các hành động cho Phiếu Luân Chuyển
    TRANSFER_CREATED: {
        icon: <Send size={20} color="#0288d1" />,
        template: (actor, target) => `**${actor}** đã tạo phiếu luân chuyển **${target}**.`
    },
    TRANSFER_DELETED: {
        icon: <Trash2 size={20} color="#d32f2f" />,
        template: (actor, target) => `**${actor}** đã xóa phiếu luân chuyển **${target}**.`
    },
    TRANSFER_SIGNED: {
        icon: <FilePen size={20} color="#1976d2" />,
        template: (actor, target, details) => `**${actor}** đã ký **${details}** cho phiếu **${target}**.`
    },
    // --- Inventory Report (Báo cáo kiểm kê) ---
    REPORT_CREATED: {
        icon: <FilePlus size={20} color="#0288d1" />,
        template: (actor, target) => `**${actor}** đã tạo **${target}**.`
    },
    REPORT_SIGNED: {
        icon: <Check size={20} color="#2e7d32" />,
        // details = bước ký: "P.HC", "Lãnh đạo Phòng", "P.KT", "BTGĐ"
        template: (actor, target, details) => `**${actor}** đã ký **${details}** cho **${target}**.`
    },
    REPORT_DELETED: {
        icon: <Trash2 size={20} color="#d32f2f" />,
        template: (actor, target) => `**${actor}** đã xóa **${target}**.`
    },
    REPORT_DELETED_BY_CALLABLE: {
        icon: <Trash2 size={20} color="#d32f2f" />,
        template: (actor, target) => `**${actor}** đã xóa **${target}** (qua tác vụ hệ thống).`
    },

    // Mặc định
    DEFAULT: { icon: <Bell size={20} />, template: (actor) => `**${actor}** đã thực hiện một hành động.` }
};
//xóa phiếu luân chuyển, yêu cầu thêm xóa tài sản cũng hiện thông báo cho hợp lý nhất nhé
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

    // State và useEffect cho thông báo
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, "audit_logs"),
            orderBy("timestamp", "desc"),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const logsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                isRead: doc.data().readBy?.includes(user.uid),
            }));
            setNotifications(logsData);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Shortcuts
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
            await updateDoc(notifRef, {
                readBy: arrayUnion(user.uid),
            });
        } catch (error) {
            console.error("Lỗi khi đánh dấu đã đọc:", error);
        }
    };

    // ✅ HÀM MỚI: ĐÁNH DẤU TẤT CẢ LÀ ĐÃ ĐỌC
    const handleMarkAllAsRead = async () => {
        if (!user?.uid) return;

        const unreadNotifications = notifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) return;

        const batch = writeBatch(db);
        unreadNotifications.forEach(notif => {
            const notifRef = doc(db, "audit_logs", notif.id);
            batch.update(notifRef, {
                readBy: arrayUnion(user.uid)
            });
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

    const quickActions = useMemo(
        () => [
            {
                category: "Điều hướng",
                items: [
                    { icon: <LayoutDashboard size={20} />, text: "Dashboard", action: () => navigate("/") },
                    { icon: <Building2 size={20} />, text: "Danh sách dự án", action: () => navigate("/project-manager") },
                    { icon: <BarChart2 size={20} />, text: "Báo cáo lợi nhuận", action: () => navigate("/profit-report-quarter") },
                ],
            },
            {
                category: "Hành động",
                items: [
                    { icon: <FolderOpen size={20} />, text: "Tạo dự án mới", action: () => navigate("/construction-plan") },
                    { icon: <TrendingUp size={20} />, text: "Xem báo cáo tháng", action: () => navigate("/profit-report-quarter") },
                ],
            },
        ],
        [navigate]
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

    return (
        <>
            <Toolbar
                sx={{
                    px: { xs: 2, sm: 3 },
                    height: 64,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                {/* Left: toggle + breadcrumbs */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Tooltip title={isSidebarOpen ? "Thu gọn" : "Mở rộng"}>
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
                        <Breadcrumbs aria-label="breadcrumb" separator={<ChevronRight size={16} />}>
                            <MuiLink
                                component={RouterLink}
                                underline="hover"
                                sx={{ display: "flex", alignItems: "center" }}
                                color="inherit"
                                to="/"
                            >
                                <Home size={18} style={{ marginRight: 8 }} />
                                Tổng quan
                            </MuiLink>
                            {pathnames.map((value, index) => {
                                const last = index === pathnames.length - 1;
                                const to = `/${pathnames.slice(0, index + 1).join("/")}`;
                                const label = pathMap[value] || value.charAt(0).toUpperCase() + value.slice(1);
                                return last ? (
                                    <Typography
                                        color="text.primary"
                                        key={to}
                                        sx={{ display: "flex", alignItems: "center", fontWeight: 600 }}
                                        aria-current="page"
                                    >
                                        {label}
                                    </Typography>
                                ) : (
                                    <MuiLink component={RouterLink} underline="hover" color="inherit" to={to} key={to}>
                                        {label}
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

                    {/* Notification */}
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

                    {/* User */}
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
                <MenuItem onClick={() => { setUserMenuAnchor(null); navigate("/admin"); }}>
                    <ListItemIcon><Shield size={18} /></ListItemIcon>
                    <ListItemText primary="Quản trị" />
                </MenuItem>
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
                    {notifications
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
                                    sx={{ borderRadius: 1.5, mb: 0.5, alignItems: 'flex-start' }}
                                >
                                    <ListItemIcon sx={{ mt: 0.5, minWidth: 36 }}>{config.icon}</ListItemIcon>

                                    <ListItemText
                                        primary={
                                            <Typography variant="body2" fontWeight={n.isRead ? 400 : 600} sx={{ mb: 0.25 }}>
                                                {/* Logic mới để tạo câu văn */}
                                                {config.template(
                                                    n.actor?.name || "Một người dùng",
                                                    n.target?.name || "",
                                                    n.details?.step || "" // Truyền chi tiết nếu có
                                                ).split('**').map((text, index) => (
                                                    index % 2 === 1 ? <b key={index}>{text}</b> : text
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
                        })}
                    {notifications.filter((n) => (notificationTab === 0 ? true : !n.isRead)).length === 0 && (
                        <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
                            <Bell size={40} strokeWidth={1} />
                            <Typography>Không có thông báo nào.</Typography>
                        </Box>
                    )}
                </Box>
                <Box sx={{ p: 1, borderTop: t => `1px solid ${t.palette.divider}` }}>
                    <Button fullWidth size="small" onClick={() => {
                        // Tùy chọn: navigate đến một trang xem tất cả thông báo
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
                                <Search size={18} />
                                <InputBase
                                    fullWidth
                                    placeholder="Tìm nhanh… (gõ để lọc hành động)"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    autoFocus
                                    inputProps={{ "aria-label": "Tìm kiếm nhanh" }}
                                />
                                <Chip size="small" label="Esc" />
                            </Box>
                            <Box sx={{ p: 2, maxHeight: 360, overflowY: "auto" }}>
                                {filteredActions.map((group) => (
                                    <Box key={group.category} sx={{ mb: 2 }}>
                                        <Typography variant="overline" color="text.secondary">{group.category}</Typography>
                                        {group.items.map((item) => (
                                            <QuickAction key={item.text} onClick={() => { item.action(); setSearchOpen(false); }}>
                                                <ListItemIcon className="action-icon">{item.icon}</ListItemIcon>
                                                <ListItemText primary={item.text} />
                                            </QuickAction>
                                        ))}
                                    </Box>
                                ))}
                                {noActionFound && <Typography color="text.secondary">Không tìm thấy hành động phù hợp.</Typography>}
                            </Box>
                        </CommandPalette>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}