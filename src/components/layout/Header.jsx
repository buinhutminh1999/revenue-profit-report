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
import DensityToggleButton from "../ui/DensityToggleButton";
import { EmptyState, ErrorState } from "../common";
import { isPushSupported, getPermissionStatus, requestNotificationPermission, setupForegroundListener } from "../../services/pushNotification";

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

// MUI icons
import {
    Search, DarkMode as Moon, LightMode as Sun, Settings as SettingsIcon, Logout as LogOut, Person as UserIcon, Notifications as Bell,
    Help as HelpCircle, AdminPanelSettings as Shield, Menu as MenuIcon, ChevronRight, Home, Dashboard as LayoutDashboard,
    Business as Building2, BarChart as BarChart2, FolderOpen, TrendingUp, MenuOpen as ChevronsLeft, AddCircle as PlusCircle, Delete as Trash2,
    NoteAdd as FilePlus,
    Check,
    Close as X,
    HowToReg as UserCheck,
    Send,
    DriveFileRenameOutline as FilePen,
    NotificationsActive,
    NotificationsOff,
} from "@mui/icons-material";

// ---------- styled ----------
const NotificationBadge = styled(Badge)(({ theme }) => ({
    "& .MuiBadge-badge": {
        backgroundColor: theme.palette.error.main,
        color: theme.palette.error.contrastText,
        right: 4,
        top: 4,
        border: `2px solid ${theme.palette.background.paper}`,
        fontWeight: 700,
        fontSize: '0.7rem',
        minWidth: 18,
        height: 18,
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        '@keyframes pulse': {
            '0%, 100%': {
                opacity: 1,
            },
            '50%': {
                opacity: 0.8,
            },
        },
    },
}));

const UserSection = styled(Box)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    padding: theme.spacing(0.75, 1.5),
    borderRadius: theme.shape.borderRadius * 2.5,
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    background: theme.palette.mode === 'light'
        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`
        : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.common.white, 0.05)} 100%)`,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
    "&:hover": {
        background: theme.palette.mode === 'light'
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.25)} 0%, ${alpha(theme.palette.primary.main, 0.15)} 100%)`,
        transform: "translateY(-1px)",
        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
        borderColor: alpha(theme.palette.primary.main, 0.3),
    },
}));

const StyledIconButton = styled(IconButton)(({ theme }) => ({
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        transform: "scale(1.1)",
    },
}));

const CommandPalette = styled(Paper)(({ theme }) => ({
    position: "absolute",
    top: "12%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "90%",
    maxWidth: 720,
    maxHeight: "75vh",
    overflow: "hidden",
    borderRadius: theme.shape.borderRadius * 3,
    boxShadow: theme.palette.mode === 'light'
        ? "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)"
        : "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
    background: theme.palette.mode === 'light'
        ? `linear-gradient(135deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`
        : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
    backdropFilter: "blur(20px)",
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}));

const QuickAction = styled(ListItemButton)(({ theme }) => ({
    padding: theme.spacing(1.25, 1.5),
    borderRadius: theme.spacing(1.5),
    marginBottom: theme.spacing(0.5),
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
        backgroundColor: alpha(theme.palette.primary.main, 0.12),
        transform: "translateX(4px)",
        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`,
    },
    "& .action-icon": {
        color: theme.palette.primary.main,
        transition: "transform 0.2s ease",
    },
    "&:hover .action-icon": {
        transform: "scale(1.1)",
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
// ---------- Notification Config ----------
const notificationConfig = {
    ASSET_CREATED: { icon: <PlusCircle htmlColor="#2e7d32" sx={{ fontSize: 20 }} />, template: (actor, target) => `**${actor}** đã tạo tài sản mới **${target}**.` },
    ASSET_DELETED: { icon: <Trash2 htmlColor="#d32f2f" sx={{ fontSize: 20 }} />, template: (actor, target) => `**${actor}** đã xóa tài sản **${target}**.` },

    // Existing keys
    ASSET_REQUEST_CREATED: { icon: <FilePlus htmlColor="#0288d1" sx={{ fontSize: 20 }} />, template: (actor, target) => `**${actor}** đã gửi yêu cầu thêm tài sản **${target}**.` },
    ASSET_REQUEST_DELETED: { icon: <Trash2 htmlColor="#d32f2f" sx={{ fontSize: 20 }} />, template: (actor) => `**${actor}** đã xóa một yêu cầu thay đổi.` },
    ASSET_REQUEST_REJECTED: { icon: <X htmlColor="#d32f2f" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** đã từ chối yêu cầu **${details?.displayId || target}**${details?.reason ? ` (Lý do: ${details.reason})` : ''}.` },
    ASSET_REQUEST_APPROVED: { icon: <Check htmlColor="#2e7d32" sx={{ fontSize: 20 }} />, template: (actor, target) => `**${actor}** đã duyệt yêu cầu cho tài sản **${target}**.` },
    ASSET_REQUEST_HC_APPROVED: { icon: <UserCheck htmlColor="#1976d2" sx={{ fontSize: 20 }} />, template: (actor, target) => `**${actor}** (P.HC) đã duyệt yêu cầu **${target || ''}**.` },
    ASSET_REQUEST_KT_APPROVED: { icon: <Check htmlColor="#2e7d32" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** (P.KT) đã duyệt xong yêu cầu **${details?.executedType || ''}**.` },

    // NEW KEYS mapped to Backend Actions
    ASSET_REQUEST_ADD_CREATED: { icon: <FilePlus htmlColor="#0288d1" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** gửi yêu cầu thêm **${details?.name || target}** (${details?.displayId || ''}).` },
    ASSET_REQUEST_DELETE_CREATED: { icon: <Trash2 htmlColor="#d32f2f" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** gửi yêu cầu xóa **${details?.name || target}** (${details?.displayId || ''}).` },
    ASSET_REQUEST_REDUCE_CREATED: { icon: <FilePen htmlColor="#ed6c02" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** gửi yêu cầu giảm SL **${details?.name || target}** (${details?.displayId || ''}).` },
    ASSET_REQUEST_INCREASE_CREATED: { icon: <FilePlus htmlColor="#0288d1" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** gửi yêu cầu tăng SL **${details?.name || target}** (${details?.displayId || ''}).` },
    ASSET_REQUEST_BATCH_ADD_CREATED: { icon: <FilePlus htmlColor="#0288d1" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** gửi ${details?.count} yêu cầu thêm tài sản mới.` },

    ASSET_REQUEST_BLOCK_APPROVED: { icon: <Check htmlColor="#1976d2" sx={{ fontSize: 20 }} />, template: (actor, target) => `**${actor}** (Khối) đã duyệt yêu cầu.` },

    ASSET_BATCH_ADD_WITH_SKIP: { icon: <PlusCircle htmlColor="#2e7d32" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** nhập nhanh **${details?.created}** tài sản (Bỏ qua ${details?.skipped}).` },
    ASSET_DATES_BATCH_UPDATED: { icon: <FilePen htmlColor="#1976d2" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** cập nhật ngày kiểm kê cho **${details?.count}** tài sản.` },

    CLOSE_QUARTER: { icon: <Check htmlColor="#2e7d32" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** đã chốt số liệu **${details?.quarter}/${details?.year}**.` },
    CLOSE_QUARTER_FAILED: { icon: <X htmlColor="#d32f2f" sx={{ fontSize: 20 }} />, template: (actor) => `**${actor}** chốt số liệu thất bại.` },

    TRANSFER_CREATED: { icon: <Send htmlColor="#0288d1" sx={{ fontSize: 20 }} />, template: (actor, target) => `**${actor}** đã tạo phiếu luân chuyển **${target}**.` },
    TRANSFER_CREATED_VIA_FUNC: { icon: <Send htmlColor="#0288d1" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** đã tạo phiếu luân chuyển **${details?.displayId || target}**.` },

    TRANSFER_DELETED: { icon: <Trash2 htmlColor="#d32f2f" sx={{ fontSize: 20 }} />, template: (actor, target) => `**${actor}** đã xóa phiếu luân chuyển **${target}**.` },
    TRANSFER_SIGNED: { icon: <FilePen htmlColor="#1976d2" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** đã ký **${details?.step || details}** cho phiếu **${target}**.` },
    REPORT_CREATED: { icon: <FilePlus htmlColor="#0288d1" sx={{ fontSize: 20 }} />, template: (actor, target) => `**${actor}** đã tạo **${target}**.` },
    REPORT_SIGNED: { icon: <Check htmlColor="#2e7d32" sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** đã ký **${details?.step || details}** cho **${target}**.` },
    REPORT_DELETED: { icon: <Trash2 htmlColor="#d32f2f" sx={{ fontSize: 20 }} />, template: (actor, target) => `**${actor}** đã xóa **${target}**.` },
    REPORT_DELETED_BY_CALLABLE: { icon: <Trash2 htmlColor="#d32f2f" sx={{ fontSize: 20 }} />, template: (actor, target) => `**${actor}** đã xóa **${target}** (qua tác vụ hệ thống).` },
    DEFAULT: { icon: <Bell sx={{ fontSize: 20 }} />, template: (actor, target, details) => `**${actor}** đã thực hiện một hành động${details?.type ? ` (${details.type})` : ''}.` }
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

    // Push Notification States
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);

    // ✅ Cải thiện: Thêm loading và error handling cho notifications
    // Kiểm tra xem user có thuộc P.HC hoặc Kế toán không (xem được tất cả thông báo)
    const isHCOrKT = useMemo(() => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        const dept = (user.departmentName || user.department || '').toLowerCase();
        return dept.includes('hành chính') || dept.includes('kế toán') ||
            dept.includes('hanh chinh') || dept.includes('ke toan');
    }, [user]);

    useEffect(() => {
        if (!user?.uid) {
            setNotificationsLoading(false);
            return;
        }
        setNotificationsLoading(true);
        setNotificationsError(null);
        const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(30));
        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                let logsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    isRead: doc.data().readBy?.includes(user.uid),
                }));

                // ✅ Lọc thông báo theo phòng ban - chỉ HC và Kế toán mới thấy tất cả
                if (!isHCOrKT) {
                    const userDeptId = user.departmentId;
                    const userDeptName = (user.departmentName || user.department || '').toLowerCase();

                    logsData = logsData.filter(log => {
                        // Nếu log liên quan đến user hiện tại (actor)
                        if (log.actor?.uid === user.uid) return true;
                        if (log.actor?.email === user.email) return true;

                        // Nếu log liên quan đến phòng ban của user
                        const logDeptId = log.details?.departmentId || log.target?.departmentId;
                        const logDeptName = (log.details?.departmentName || log.target?.departmentName || '').toLowerCase();

                        if (logDeptId && userDeptId && logDeptId === userDeptId) return true;
                        if (logDeptName && userDeptName && logDeptName.includes(userDeptName)) return true;

                        // Cho phép xem các thông báo chung (close quarter, etc.)
                        if (log.action === 'CLOSE_QUARTER' || log.action === 'CLOSE_QUARTER_FAILED') return true;

                        return false;
                    });
                }

                setNotifications(logsData.slice(0, 20)); // Limit 20 after filtering
                setNotificationsLoading(false);
            },
            (error) => {
                console.error("Error loading notifications:", error);
                setNotificationsError(error);
                setNotificationsLoading(false);
            }
        );
        return () => unsubscribe();
    }, [user?.uid, user?.departmentId, user?.departmentName, user?.email, isHCOrKT]);

    // Push Notification: Check status on mount AND refresh token if permission already granted
    useEffect(() => {
        const initPushToken = async () => {
            if (!isPushSupported()) return;

            const status = getPermissionStatus();
            setPushEnabled(status === 'granted');

            // If permission is already granted and user is logged in, refresh token
            if (status === 'granted' && user?.uid) {
                console.log('🔄 Auto-refreshing FCM token on page load...');
                try {
                    // Pass user info to sync departmentId for push notifications
                    // Note: User object uses 'primaryDepartmentId' not 'departmentId'
                    const userInfo = {
                        departmentId: user.primaryDepartmentId || user.departmentId,
                        role: user.role,
                        email: user.email
                    };
                    console.log('📋 Saving user info:', userInfo);
                    const result = await requestNotificationPermission(user.uid, userInfo);
                    if (result.success) {
                        console.log('✅ FCM token refreshed on page load');
                    } else {
                        console.warn('⚠️ FCM token refresh failed:', result.error);
                    }
                } catch (error) {
                    console.error('❌ Error refreshing FCM token:', error);
                }
            }
        };

        initPushToken();
    }, [user?.uid]);

    // Push Notification: Setup foreground listener
    useEffect(() => {
        if (isPushSupported() && getPermissionStatus() === 'granted') {
            setupForegroundListener((payload) => {
                // Show in-app toast for foreground messages
                console.log('🔔 Push received in foreground:', payload);
            });
        }
    }, [pushEnabled]);

    // Handle toggle push notifications
    const handleTogglePush = async () => {
        if (!user?.uid) return;

        setPushLoading(true);
        try {
            // Pass user info to sync departmentId for push notifications
            // Note: User object uses 'primaryDepartmentId' not 'departmentId'
            const userInfo = {
                departmentId: user.primaryDepartmentId || user.departmentId,
                role: user.role,
                email: user.email
            };
            const result = await requestNotificationPermission(user.uid, userInfo);
            if (result.success) {
                setPushEnabled(true);
                console.log('✅ Push notifications enabled');
            } else {
                console.error('❌ Failed to enable push:', result.error);
                alert(result.error || 'Không thể bật thông báo đẩy');
            }
        } catch (error) {
            console.error('❌ Error toggling push:', error);
        } finally {
            setPushLoading(false);
        }
    };

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

    // Hàm xác định route dựa trên notification action và details
    const getNotificationRoute = (notification) => {
        const { action, details = {}, target = {} } = notification;

        // Asset Request related routes - ưu tiên điều hướng đến request
        if (action?.includes('ASSET_REQUEST')) {
            // Kiểm tra target.id trước (thường là requestId)
            // Backend có thể trả về type là 'request' hoặc 'asset_request'
            if (target?.id && (target?.type === 'request' || target?.type === 'asset_request')) {
                return `/asset-requests/${target.id}`;
            }
            // Kiểm tra details.requestId
            if (details?.requestId) {
                return `/asset-requests/${details.requestId}`;
            }
            // Kiểm tra details.id (có thể là requestId)
            if (details?.id) {
                return `/asset-requests/${details.id}`;
            }
            // Nếu có target.id mà không có type cụ thể (cũng có thể là requestId)
            if (target?.id) {
                return `/asset-requests/${target.id}`;
            }
            // Nếu có assetId trong details, điều hướng đến trang chi tiết asset
            if (details?.assetId) {
                return `/assets/${details.assetId}`;
            }
            // Mặc định điều hướng đến trang asset-transfer (trang quản lý requests)
            return '/asset-transfer';
        }

        // Asset related routes (ASSET_CREATED, ASSET_DELETED, etc.)
        if (action?.includes('ASSET') && !action?.includes('ASSET_REQUEST')) {
            // Ưu tiên target.id (thường là assetId)
            if (target?.id && (target?.type === 'asset' || !target?.type)) {
                return `/assets/${target.id}`;
            }
            // Kiểm tra details.assetId
            if (details?.assetId) {
                return `/assets/${details.assetId}`;
            }
            // Mặc định điều hướng đến trang danh sách assets
            return '/assets';
        }

        // Transfer related routes
        if (action?.includes('TRANSFER')) {
            // Ưu tiên target.id (thường là transferId)
            if (target?.id && (target?.type === 'transfer' || !target?.type)) {
                return `/transfers/${target.id}`;
            }
            // Kiểm tra details.transferId
            if (details?.transferId) {
                return `/transfers/${details.transferId}`;
            }
            // Kiểm tra details.id
            if (details?.id) {
                return `/transfers/${details.id}`;
            }
            // Mặc định điều hướng đến trang danh sách transfers (asset-transfer page)
            return '/asset-transfer';
        }

        // Report related routes - sử dụng inventory-reports path
        if (action?.includes('REPORT')) {
            // Kiểm tra target.id
            if (target?.id) {
                return `/inventory-reports/${target.id}`;
            }
            // Kiểm tra details.reportId
            if (details?.reportId) {
                return `/inventory-reports/${details.reportId}`;
            }
            // Mặc định điều hướng đến asset-transfer (tab báo cáo kiểm kê)
            return '/asset-transfer';
        }

        // Close quarter - điều hướng đến trang báo cáo lợi nhuận
        if (action === 'CLOSE_QUARTER' || action === 'CLOSE_QUARTER_FAILED') {
            if (details?.quarter && details?.year) {
                return `/profit-report-quarter?quarter=${details.quarter}&year=${details.year}`;
            }
            return '/profit-report-quarter';
        }

        // Mặc định không điều hướng (trả về null)
        return null;
    };

    const handleNotificationClick = async (notification) => {
        // Đánh dấu đã đọc nếu chưa đọc
        if (!notification.isRead) {
            await handleMarkAsRead(notification.id);
        }

        // Đóng menu
        setNotificationAnchor(null);

        // Điều hướng đến trang liên quan
        const route = getNotificationRoute(notification);
        if (route) {
            navigate(route);
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
                    { icon: <LayoutDashboard sx={{ fontSize: 20 }} />, text: "Dashboard", action: () => navigate("/") },
                    { icon: <Building2 sx={{ fontSize: 20 }} />, text: "Danh sách dự án", action: () => navigate("/project-manager") },
                    { icon: <BarChart2 sx={{ fontSize: 20 }} />, text: "Báo cáo lợi nhuận", action: () => navigate("/profit-report-quarter") },
                    { icon: <TrendingUp sx={{ fontSize: 20 }} />, text: "Báo cáo lợi nhuận năm", action: () => navigate("/profit-report-year") },
                    { icon: <FolderOpen sx={{ fontSize: 20 }} />, text: "Công nợ phải thu", action: () => navigate("/accounts-receivable") },
                    { icon: <FolderOpen sx={{ fontSize: 20 }} />, text: "Công nợ phải trả", action: () => navigate("/construction-payables") },
                ],
            },
            {
                category: "Hành động",
                items: [
                    { icon: <FolderOpen sx={{ fontSize: 20 }} />, text: "Tạo dự án mới", action: () => navigate("/construction-plan") },
                    { icon: <PlusCircle sx={{ fontSize: 20 }} />, text: "Quản lý tài sản", action: () => navigate("/asset-transfer") },
                    { icon: <FilePlus sx={{ fontSize: 20 }} />, text: "So sánh giá vật tư", action: () => navigate("/material-price-comparison") },
                ],
            },
            ...(user?.role === 'admin' ? [{
                category: "Quản trị",
                items: [
                    { icon: <Shield sx={{ fontSize: 20 }} />, text: "Quản trị hệ thống", action: () => navigate("/admin") },
                    { icon: <UserCheck sx={{ fontSize: 20 }} />, text: "Quản lý người dùng", action: () => navigate("/admin") },
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
                component={motion.div}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                sx={{
                    px: { xs: 2, sm: 3 },
                    height: 68,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    // ✨ GLASSMORPHISM EFFECT ✨
                    background: (t) => t.palette.mode === 'light'
                        ? `linear-gradient(135deg, ${alpha('#ffffff', 0.9)} 0%, ${alpha('#f8fafc', 0.9)} 100%)`
                        : `linear-gradient(135deg, ${alpha(t.palette.background.paper, 0.9)} 0%, ${alpha(t.palette.background.default, 0.9)} 100%)`,
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    borderBottom: (t) => `1px solid ${alpha(t.palette.divider, 0.1)}`,
                    boxShadow: (t) => t.palette.mode === 'light'
                        ? "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)"
                        : "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
                    zIndex: 1100,
                    position: 'sticky',
                    top: 0,
                }}
            >
                {/* Left: toggle + breadcrumbs */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Tooltip title={isSidebarOpen ? "Thu gọn (⌘B)" : "Mở rộng (⌘B)"} arrow>
                        <StyledIconButton
                            color="inherit"
                            onClick={onSidebarToggle}
                            edge="start"
                            aria-label={isSidebarOpen ? "Thu gọn thanh điều hướng" : "Mở thanh điều hướng"}
                        >
                            <motion.div
                                animate={{ rotate: isSidebarOpen ? 0 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {isSidebarOpen ? <ChevronsLeft /> : <MenuIcon />}
                            </motion.div>
                        </StyledIconButton>
                    </Tooltip>

                    <Box sx={{ display: { xs: "none", md: "block" } }}>
                        <Breadcrumbs
                            aria-label="breadcrumb"
                            separator={
                                <ChevronRight
                                    sx={{
                                        fontSize: 18,
                                        color: (t) => alpha(t.palette.text.secondary, 0.5),
                                    }}
                                />
                            }
                            sx={{
                                '& .MuiBreadcrumbs-separator': { mx: 0.75 },
                                '& .MuiBreadcrumbs-ol': { alignItems: 'center' },
                            }}
                        >
                            <MuiLink
                                component={RouterLink}
                                underline="none"
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    transition: 'all 0.2s ease',
                                    borderRadius: 1,
                                    px: 0.75,
                                    py: 0.25,
                                    '&:hover': {
                                        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                                    },
                                }}
                                color="text.secondary"
                                to="/"
                            >
                                <Home sx={{ fontSize: 18, mr: 0.75, color: 'primary.main' }} />
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                    Tổng quan
                                </Typography>
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
                                            fontSize: '0.875rem',
                                            px: 0.75,
                                            py: 0.25,
                                            borderRadius: 1,
                                            bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                                            color: 'primary.main',
                                        }}
                                        aria-current="page"
                                    >
                                        {label}
                                    </Typography>
                                ) : (
                                    <MuiLink
                                        component={RouterLink}
                                        underline="none"
                                        color="text.secondary"
                                        to={to}
                                        key={to}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            borderRadius: 1,
                                            px: 0.75,
                                            py: 0.25,
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                                                color: 'primary.main',
                                            },
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                            {label}
                                        </Typography>
                                    </MuiLink>
                                );
                            })}
                        </Breadcrumbs>
                    </Box>
                </Box>

                {/* Right: actions */}
                <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1 }}>
                    <Tooltip title="Tìm kiếm nhanh (⌘K)" arrow>
                        <StyledIconButton
                            color="inherit"
                            onClick={() => setSearchOpen(true)}
                            aria-label="Mở bảng lệnh nhanh"
                        >
                            <Search sx={{ fontSize: 22 }} />
                        </StyledIconButton>
                    </Tooltip>

                    <Tooltip title="Chế độ Sáng/Tối" arrow>
                        <StyledIconButton
                            sx={{ display: { xs: "none", sm: "inline-flex" } }}
                            color="inherit"
                            onClick={toggleColorMode}
                            aria-label="Đổi chế độ sáng/tối"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={theme.palette.mode}
                                    initial={reduce ? {} : { rotate: -180, opacity: 0, scale: 0.8 }}
                                    animate={reduce ? {} : { rotate: 0, opacity: 1, scale: 1 }}
                                    exit={reduce ? {} : { rotate: 180, opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                >
                                    {theme.palette.mode === "dark" ?
                                        <Sun sx={{ fontSize: 22, color: 'warning.main' }} /> :
                                        <Moon sx={{ fontSize: 22, color: 'primary.main' }} />
                                    }
                                </motion.div>
                            </AnimatePresence>
                        </StyledIconButton>
                    </Tooltip>

                    <Tooltip title="Thay đổi mật độ hiển thị" arrow>
                        <Box sx={{ display: { xs: "none", sm: "block" } }}>
                            <DensityToggleButton />
                        </Box>
                    </Tooltip>

                    <Tooltip title={`Thông báo${unreadCount > 0 ? ` (${unreadCount} mới)` : ''}`} arrow>
                        <StyledIconButton
                            color="inherit"
                            onClick={(e) => setNotificationAnchor(e.currentTarget)}
                            aria-label={`Mở thông báo, ${unreadCount} chưa đọc`}
                        >
                            <NotificationBadge badgeContent={unreadCount} max={99}>
                                <Bell sx={{ fontSize: 22 }} />
                            </NotificationBadge>
                        </StyledIconButton>
                    </Tooltip>

                    <Divider
                        orientation="vertical"
                        flexItem
                        sx={{
                            mx: 1.5,
                            display: { xs: "none", sm: "block" },
                            height: 32,
                            alignSelf: 'center',
                            bgcolor: (t) => alpha(t.palette.divider, 0.3),
                        }}
                    />

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
                PaperProps={{
                    sx: {
                        mt: 1.5,
                        minWidth: 240,
                        borderRadius: 2.5,
                        boxShadow: theme.palette.mode === 'light'
                            ? "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)"
                            : "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
                        background: theme.palette.mode === 'light'
                            ? `linear-gradient(135deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f8fafc', 0.98)} 100%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
                        backdropFilter: "blur(20px)",
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        overflow: 'hidden',
                    }
                }}
            >
                <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                        {user?.displayName || "Người dùng"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {user?.email || ""}
                    </Typography>
                </Box>
                <Box sx={{ py: 0.5 }}>
                    <MenuItem
                        onClick={() => { setUserMenuAnchor(null); navigate("/user"); }}
                        sx={{
                            borderRadius: 1.5,
                            mx: 1,
                            my: 0.25,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                transform: 'translateX(4px)',
                            },
                        }}
                    >
                        <ListItemIcon><UserIcon sx={{ fontSize: 20, color: 'primary.main' }} /></ListItemIcon>
                        <ListItemText primary="Hồ sơ cá nhân" primaryTypographyProps={{ fontWeight: 500 }} />
                    </MenuItem>
                    <MenuItem
                        onClick={() => { setUserMenuAnchor(null); navigate("/settings"); }}
                        sx={{
                            borderRadius: 1.5,
                            mx: 1,
                            my: 0.25,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                transform: 'translateX(4px)',
                            },
                        }}
                    >
                        <ListItemIcon><SettingsIcon sx={{ fontSize: 20, color: 'primary.main' }} /></ListItemIcon>
                        <ListItemText primary="Cài đặt" primaryTypographyProps={{ fontWeight: 500 }} />
                    </MenuItem>

                    {user?.role === 'admin' && (
                        <MenuItem
                            onClick={() => { setUserMenuAnchor(null); navigate("/admin"); }}
                            sx={{
                                borderRadius: 1.5,
                                mx: 1,
                                my: 0.25,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    transform: 'translateX(4px)',
                                },
                            }}
                        >
                            <ListItemIcon><Shield sx={{ fontSize: 20, color: 'primary.main' }} /></ListItemIcon>
                            <ListItemText primary="Quản trị" primaryTypographyProps={{ fontWeight: 500 }} />
                        </MenuItem>
                    )}

                    <MenuItem
                        onClick={() => { setUserMenuAnchor(null); navigate("/help"); }}
                        sx={{
                            borderRadius: 1.5,
                            mx: 1,
                            my: 0.25,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                transform: 'translateX(4px)',
                            },
                        }}
                    >
                        <ListItemIcon><HelpCircle sx={{ fontSize: 20, color: 'primary.main' }} /></ListItemIcon>
                        <ListItemText primary="Trợ giúp" primaryTypographyProps={{ fontWeight: 500 }} />
                    </MenuItem>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ py: 0.5 }}>
                    <MenuItem
                        onClick={() => { toggleColorMode(); }}
                        sx={{
                            borderRadius: 1.5,
                            mx: 1,
                            my: 0.25,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                transform: 'translateX(4px)',
                            },
                        }}
                    >
                        <ListItemIcon>
                            {theme.palette.mode === "dark" ?
                                <Sun sx={{ fontSize: 20, color: 'warning.main' }} /> :
                                <Moon sx={{ fontSize: 20, color: 'primary.main' }} />
                            }
                        </ListItemIcon>
                        <ListItemText
                            primary={theme.palette.mode === "dark" ? "Chế độ Sáng" : "Chế độ Tối"}
                            primaryTypographyProps={{ fontWeight: 500 }}
                        />
                    </MenuItem>
                    <MenuItem
                        onClick={async () => { setUserMenuAnchor(null); await handleLogout(); }}
                        sx={{
                            borderRadius: 1.5,
                            mx: 1,
                            my: 0.25,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                transform: 'translateX(4px)',
                            },
                        }}
                    >
                        <ListItemIcon><LogOut sx={{ fontSize: 20, color: 'error.main' }} /></ListItemIcon>
                        <ListItemText primary="Đăng xuất" primaryTypographyProps={{ fontWeight: 500 }} />
                    </MenuItem>
                </Box>
            </Menu>

            {/* NOTIFICATION MENU */}
            <Menu
                keepMounted
                anchorEl={notificationAnchor}
                open={Boolean(notificationAnchor)}
                onClose={() => setNotificationAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                    sx: {
                        mt: 1.5,
                        width: 420,
                        maxWidth: "90vw",
                        borderRadius: 2.5,
                        boxShadow: theme.palette.mode === 'light'
                            ? "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)"
                            : "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
                        background: theme.palette.mode === 'light'
                            ? `linear-gradient(135deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f8fafc', 0.98)} 100%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
                        backdropFilter: "blur(20px)",
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        overflow: 'hidden',
                    }
                }}
            >
                <Box sx={{
                    px: 2.5,
                    pt: 2,
                    pb: 1.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 100%)`,
                }}>
                    <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Bell sx={{ fontSize: 22, color: 'primary.main' }} />
                        Thông báo
                        {unreadCount > 0 && (
                            <Chip
                                label={unreadCount}
                                size="small"
                                color="primary"
                                sx={{
                                    height: 22,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                }}
                            />
                        )}
                    </Typography>
                    {unreadCount > 0 && (
                        <Button
                            size="small"
                            onClick={handleMarkAllAsRead}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: 1.5,
                                px: 1.5,
                            }}
                        >
                            Đánh dấu đã đọc
                        </Button>
                    )}

                    {/* Push Notification Toggle */}
                    {isPushSupported() && (
                        <Tooltip title={pushEnabled ? "Đã bật thông báo đẩy" : "Bật thông báo đẩy"} arrow>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={handleTogglePush}
                                    disabled={pushLoading || pushEnabled}
                                    sx={{
                                        ml: 0.5,
                                        color: pushEnabled ? 'success.main' : 'text.secondary',
                                        bgcolor: pushEnabled ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                                    }}
                                >
                                    {pushLoading ? (
                                        <CircularProgress size={18} />
                                    ) : pushEnabled ? (
                                        <NotificationsActive sx={{ fontSize: 20 }} />
                                    ) : (
                                        <NotificationsOff sx={{ fontSize: 20 }} />
                                    )}
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                </Box>
                <Tabs
                    value={notificationTab}
                    onChange={(_, v) => setNotificationTab(v)}
                    variant="fullWidth"
                    sx={{
                        borderBottom: (t) => `1px solid ${alpha(t.palette.divider, 0.1)}`,
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            minHeight: 48,
                        },
                        '& .Mui-selected': {
                            color: 'primary.main',
                        },
                    }}
                >
                    <Tab label="Tất cả" />
                    <Tab
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                Chưa đọc
                                {unreadCount > 0 && (
                                    <Chip
                                        label={unreadCount}
                                        size="small"
                                        color="primary"
                                        sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                        }}
                                    />
                                )}
                            </Box>
                        }
                    />
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
                            icon={<Bell sx={{ fontSize: 48 }} />}
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
                                    <motion.div
                                        key={n.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ListItemButton
                                            onClick={() => handleNotificationClick(n)}
                                            sx={{
                                                borderRadius: 2,
                                                mb: 0.75,
                                                mx: 1,
                                                alignItems: 'flex-start',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                bgcolor: n.isRead
                                                    ? 'transparent'
                                                    : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
                                                border: n.isRead
                                                    ? 'none'
                                                    : `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                                "&:hover": {
                                                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                                                    transform: 'translateX(4px)',
                                                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`,
                                                }
                                            }}
                                        >
                                            <ListItemIcon sx={{ mt: 0.5, minWidth: 36 }}>{config.icon}</ListItemIcon>

                                            <ListItemText
                                                primary={
                                                    <Typography variant="body2" fontWeight={n.isRead ? 400 : 700} sx={{ mb: 0.25 }}>
                                                        {config.template(
                                                            n.actor?.name || n.actor?.email?.split('@')[0] || "Hệ thống",
                                                            n.target?.name || n.target?.displayId || "",
                                                            n.details || {}
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
                                                <Box
                                                    sx={{
                                                        mt: 0.75,
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        bgcolor: 'primary.main',
                                                        flexShrink: 0,
                                                        boxShadow: `0 0 8px ${alpha(theme.palette.primary.main, 0.5)}`,
                                                    }}
                                                />
                                            )}
                                        </ListItemButton>
                                    </motion.div>
                                );
                            })
                    )}
                </Box>
                <Box sx={{
                    p: 1.5,
                    borderTop: t => `1px solid ${alpha(t.palette.divider, 0.1)}`,
                    background: `linear-gradient(135deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                }}>
                    <Button
                        fullWidth
                        size="medium"
                        onClick={() => {
                            setNotificationAnchor(null)
                        }}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            py: 1,
                        }}
                    >
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
                            <Box sx={{
                                p: 2,
                                borderBottom: (t) => `1px solid ${alpha(t.palette.divider, 0.1)}`,
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 100%)`,
                            }}>
                                <Search sx={{ fontSize: 22, color: theme.palette.primary.main }} />
                                <InputBase
                                    fullWidth
                                    placeholder="Tìm nhanh chức năng, dự án, báo cáo... (gõ để lọc)"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    autoFocus
                                    inputProps={{ "aria-label": "Tìm kiếm nhanh" }}
                                    sx={{
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        '& input::placeholder': {
                                            opacity: 0.6,
                                        },
                                    }}
                                />
                                <Button
                                    onClick={() => setSearchOpen(false)}
                                    size="small"
                                    color="inherit"
                                    startIcon={<X sx={{ fontSize: 16 }} />}
                                    sx={{
                                        textTransform: 'none',
                                        minWidth: 'auto',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 1.5,
                                        fontWeight: 600,
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.error.main, 0.1),
                                        },
                                    }}
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