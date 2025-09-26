import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Box, Tooltip, styled, Stack, Divider, Typography, Drawer as MuiDrawer, List,
    ListItemButton, ListItemIcon, ListItemText, Collapse, useTheme, useMediaQuery,
    ListSubheader, Avatar, CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

// --- CÁC HOOK VÀ CẤU HÌNH ---
import { useAuth } from "../../contexts/AuthContext"; // Chỉnh lại đường dẫn nếu cần
import { db } from "../../services/firebase-config";
import { doc, getDoc } from "firebase/firestore";

// --- CÁC ICON ---
import {
    LayoutDashboard, ChevronRight, Briefcase, Landmark, BarChart3, Construction,
    Building2, FileCheck2, FileSpreadsheet, BookCheck, BarChart2 as BarChartIcon,
    ClipboardList, BookUser, PieChart, LineChart, TrendingUp,
    UserCheck,
    ScanLine,
    History,
    SlidersHorizontal,
} from "lucide-react";

// ----- Drawer styles -----
const openedMixin = (theme, width) => ({
    width,
    transition: theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: "hidden",
});
const closedMixin = (theme, width) => ({
    width,
    transition: theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: "hidden",
});

const StyledDrawer = styled(MuiDrawer, {
    shouldForwardProp: (prop) =>
        prop !== "open" && prop !== "widthExpanded" && prop !== "widthCollapsed",
})(({ theme, open, widthExpanded, widthCollapsed }) => ({
        width: widthExpanded,
        flexShrink: 0,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        ...(open && {
            ...openedMixin(theme, widthExpanded),
            "& .MuiDrawer-paper": openedMixin(theme, widthExpanded),
        }),
        ...(!open && {
            ...closedMixin(theme, widthCollapsed),
            "& .MuiDrawer-paper": closedMixin(theme, widthCollapsed),
        }),
    })
);

const ListSubheaderStyle = styled(ListSubheader)(({ theme }) => ({
    ...theme.typography.overline,
    fontSize: "0.75rem",
    paddingTop: theme.spacing(2.5),
    paddingBottom: theme.spacing(0.75),
    paddingLeft: theme.spacing(3.5),
    color: theme.palette.text.secondary,
}));

const navigationConfig = [
    {
        subheader: "Tổng quan",
        items: [{ title: "Dashboard", path: "/", icon: <LayoutDashboard size={18} /> }],
    },
    {
        subheader: "Quản lý Nhân sự",
        items: [
            {
                title: "Chấm công",
                icon: <UserCheck size={18} />,
                children: [
                    { title: "Bảng điều khiển", path: "/attendance", icon: <LayoutDashboard size={18} /> },
                    { title: "Chấm công hàng ngày", path: "/attendance/check-in", icon: <ScanLine size={18} /> },
                    { title: "Lịch sử chấm công", path: "/attendance/history", icon: <History size={18} /> },
                    { title: "Báo cáo", path: "/attendance/reports", icon: <BarChart3 size={18} /> },
                    { title: "Cài đặt", path: "/attendance/settings", icon: <SlidersHorizontal size={18} /> },
                ],
            },
        ],
    },
    {
        subheader: "Quản lý Vận hành",
        items: [
            {
                title: "Dự án & Thi công",
                icon: <Briefcase size={18} />,
                children: [
                    { title: "Kế hoạch Thi công", path: "/construction-plan", icon: <Construction size={18} /> },
                    { title: "Quản lý Công trình", path: "/project-manager", icon: <Building2 size={18} /> },
                ],
            },
        ],
    },
    {
        subheader: "Tài chính & Kế toán",
        items: [
            {
                title: "Kế toán & Công nợ",
                icon: <Landmark size={18} />,
                children: [
                    { title: "Công nợ Phải thu", path: "/accounts-receivable", icon: <FileCheck2 size={18} /> },
                    { title: "Công nợ Phải trả", path: "/construction-payables", icon: <FileSpreadsheet size={18} /> },
                    { title: "Phân bổ Chi phí", path: "/allocations", icon: <BookCheck size={18} /> },
                    { title: "Bảng Cân đối", path: "/balance-sheet", icon: <BarChartIcon size={18} /> },
                    { title: "Hệ thống Tài khoản", path: "/chart-of-accounts", icon: <ClipboardList size={18} /> },
                ],
            },
        ],
    },
    {
        subheader: "Phân tích & Báo cáo",
        items: [
            {
                title: "Báo cáo",
                icon: <BarChart3 size={18} />,
                children: [
                    { title: "Báo cáo Lợi nhuận", path: "/reports/profit-quarter", icon: <TrendingUp size={18} /> },
                    { title: "Lợi nhuận theo Năm", path: "/reports/profit-year", icon: <LineChart size={18} /> },
                    { title: "Báo cáo Nợ Có", path: "/reports/broker-debt", icon: <BookUser size={18} /> },
                    { title: "Báo cáo Tổng quát", path: "/reports/overall", icon: <PieChart size={18} /> },
                ],
            },
        ],
    },
];
// --- ✅ BƯỚC 1: TẠO CUSTOM HOOK ĐỂ LẤY VÀ KIỂM TRA QUYỀN ---
function useNavigationPermissions() {
    const { user } = useAuth();
    const [permissionRules, setPermissionRules] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setIsLoading(true);
            return;
        }
        if (user.role === 'admin') {
            setPermissionRules('admin');
            setIsLoading(false);
            return;
        }
        const fetchRules = async () => {
            try {
                const docRef = doc(db, 'configuration', 'accessControl');
                const docSnap = await getDoc(docRef);
                setPermissionRules(docSnap.exists() ? docSnap.data() : {});
            } catch (error) {
                console.error("Lỗi khi tải quyền truy cập:", error);
                setPermissionRules({});
            } finally {
                setIsLoading(false);
            }
        };
        fetchRules();
    }, [user]);

    const checkPermission = useCallback((path) => {
        if (isLoading || !permissionRules || !user) return false;
        if (permissionRules === 'admin') return true;
        if (!path || path === "/") return true; // Luôn hiển thị Dashboard

        const pathKey = path.startsWith('/') ? path.substring(1) : path;
        const allowedEmails = permissionRules[pathKey] || [];
        return allowedEmails.includes(user.email);
    }, [permissionRules, user, isLoading]);

    return { checkPermission, isLoading };
}

// ----- Nav Item -----
function SidebarNavItem({ item, isOpen, persistKey }) {
    const reduce = useReducedMotion();
    const { title, path, icon, children } = item;
    const location = useLocation();

    const isActive =
        path && (location.pathname === path || (path !== "/" && location.pathname.startsWith(path)));
    const hasChildren = Array.isArray(children) && children.length > 0;

    const defaultOpen =
        hasChildren && children.some((c) => location.pathname.startsWith(c.path));
    const storageKey = `${persistKey}:${title}`;
    const [isSubMenuOpen, setSubMenuOpen] = React.useState(() => {
        const saved = localStorage.getItem(storageKey);
        return saved != null ? JSON.parse(saved) : defaultOpen;
    });
    React.useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(isSubMenuOpen));
    }, [isSubMenuOpen, storageKey]);

    const itemStyle = {
        borderRadius: 1.5,
        mx: 1.25,
        my: 0.25,
        color: "text.secondary",
        position: "relative",
        minHeight: 40,
        "& .MuiListItemIcon-root": { minWidth: 32 },
        "&:hover": {
            backgroundColor: (t) => alpha(t.palette.primary.main, 0.06),
            color: "text.primary",
        },
        "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            height: 0,
            width: 4,
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4,
            backgroundColor: "primary.main",
            transition: reduce ? "none" : "height 160ms ease-out",
            willChange: "height",
        },
    };
    const activeStyle = {
        color: "primary.main",
        fontWeight: 600,
        backgroundColor: (t) => alpha(t.palette.primary.main, 0.08),
        "&::before": { height: "60%" },
    };

    if (hasChildren) {
        const parentActive = children.some((c) => location.pathname.startsWith(c.path));
        const collapseId = `submenu-${title.replace(/\s+/g, "-").toLowerCase()}`;

        return (
            <>
                <ListItemButton
                    onClick={() => setSubMenuOpen((v) => !v)}
                    sx={{
                        ...itemStyle,
                        ...(parentActive && { color: "text.primary", fontWeight: 600 }),
                    }}
                    aria-expanded={isSubMenuOpen}
                    aria-controls={collapseId}
                >
                    <ListItemIcon sx={{ color: "inherit" }}>{icon}</ListItemIcon>
                    {isOpen && <ListItemText primary={title} />}
                    {isOpen && (
                        <motion.span
                            style={{ display: "inline-flex" }}
                            animate={reduce ? {} : { rotate: isSubMenuOpen ? 90 : 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                            <ChevronRight size={18} />
                        </motion.span>
                    )}
                </ListItemButton>

                <Collapse in={isSubMenuOpen && isOpen} timeout={reduce ? 0 : "auto"} unmountOnExit>
                    <List
                        id={collapseId}
                        component={motion.ul}
                        initial={reduce ? false : { opacity: 0, y: -4 }}
                        animate={reduce ? {} : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        disablePadding
                        sx={{ pl: 1 }}
                    >
                        {children.map((child) => (
                            <SidebarNavItem
                                key={child.title}
                                item={child}
                                isOpen={isOpen}
                                persistKey={persistKey}
                            />
                        ))}
                    </List>
                </Collapse>
            </>
        );
    }

    return (
        <Tooltip title={!isOpen ? title : ""} placement="right">
            <ListItemButton
                component={RouterLink}
                to={path}
                sx={{ ...itemStyle, ...(isActive && activeStyle) }}
                {...(isActive ? { "aria-current": "page" } : {})}
            >
                <ListItemIcon sx={{ color: "inherit" }}>{icon}</ListItemIcon>
                {isOpen && <ListItemText primary={title} />}
            </ListItemButton>
        </Tooltip>
    );
}

// ----- Sidebar Component Chính -----
export default function Sidebar({ isOpen, onClose, widthExpanded, widthCollapsed }) {
    const theme = useTheme();
    const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));
    const { user } = useAuth();
    const persistKey = "sidebar-submenu";

    const { checkPermission, isLoading } = useNavigationPermissions();

    const filteredConfig = useMemo(() => {
        if (isLoading) return [];

        const filterItems = (items) => {
            return items.reduce((acc, item) => {
                if (item.children) {
                    const accessibleChildren = filterItems(item.children);
                    if (accessibleChildren.length > 0) {
                        acc.push({ ...item, children: accessibleChildren });
                    }
                } else {
                    if (checkPermission(item.path)) {
                        acc.push(item);
                    }
                }
                return acc;
            }, []);
        };

        return navigationConfig.reduce((acc, group) => {
            const accessibleItems = filterItems(group.items);
            if (accessibleItems.length > 0) {
                acc.push({ ...group, items: accessibleItems });
            }
            return acc;
        }, []);
    }, [isLoading, checkPermission]);

    const content = (
        <Box
            role="navigation"
            aria-label="Điều hướng chính"
            sx={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
            <Stack sx={{ alignItems: "center", p: 2, height: 64, justifyContent: "center" }}>
                <RouterLink to="/" aria-label="Trang chủ">
                    <Box
                        component="img"
                        src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png"
                        alt="Logo Bách Khoa An Giang"
                        sx={{ height: 36, width: "auto", display: "block" }}
                    />
                </RouterLink>
            </Stack>

            <Box
                sx={{
                    flexGrow: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    pr: isOpen ? 0.5 : 0,
                    "&::-webkit-scrollbar": { width: 6 },
                    "&::-webkit-scrollbar-thumb": {
                        background: alpha(theme.palette.text.primary, 0.2),
                        borderRadius: 6,
                    },
                }}
            >
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <List disablePadding dense>
                        {filteredConfig.map((group) => (
                            <li key={group.subheader}>
                                <Box component="ul" sx={{ p: 0, m: 0 }}>
                                    {isOpen && <ListSubheaderStyle disableSticky>{group.subheader}</ListSubheaderStyle>}
                                    {group.items.map((item) => (
                                        <SidebarNavItem
                                            key={item.title}
                                            item={item}
                                            isOpen={isOpen}
                                            persistKey={persistKey}
                                        />
                                    ))}
                                </Box>
                            </li>
                        ))}
                    </List>
                )}
            </Box>

            <Stack spacing={1} sx={{ p: 2 }}>
                <Divider />
                <Tooltip title={!isOpen ? user?.displayName || "Hồ sơ" : ""} placement="right">
                    <Box component={RouterLink} to="/user" sx={{ textDecoration: "none" }} aria-label="Hồ sơ người dùng">
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={2}
                            sx={{
                                p: 1.25,
                                borderRadius: 1.5,
                                backgroundColor: alpha(theme.palette.action.hover, 0.04),
                                "&:hover": { backgroundColor: alpha(theme.palette.action.hover, 0.08) },
                            }}
                        >
                            <Avatar
                                src={user?.photoURL || undefined}
                                alt={user?.displayName || "User"}
                                sx={{ width: 36, height: 36 }}
                            >
                                {(user?.displayName || "U")?.[0]}
                            </Avatar>
                            {isOpen && (
                                <Box sx={{ overflow: "hidden" }}>
                                    <Typography variant="subtitle2" noWrap>
                                        {user?.displayName || "Người dùng"}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        {user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Box>
                </Tooltip>
            </Stack>
        </Box>
    );

    if (isLgUp) {
        return (
            <StyledDrawer
                variant="permanent"
                open={isOpen}
                widthExpanded={widthExpanded}
                widthCollapsed={widthCollapsed}
            >
                {content}
            </StyledDrawer>
        );
    }

    return (
        <MuiDrawer
            variant="temporary"
            open={isOpen}
            onClose={onClose}
            ModalProps={{ keepMounted: true }}
            PaperProps={{ sx: { width: widthExpanded } }}
            role="dialog"
            aria-label="Menu điều hướng"
        >
            {content}
        </MuiDrawer>
    );
}
