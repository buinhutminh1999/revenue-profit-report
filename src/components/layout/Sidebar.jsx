import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Box, Tooltip, styled, Stack, Divider, Typography, Drawer as MuiDrawer, List,
    ListItemButton, ListItemIcon, ListItemText, Collapse, useTheme, useMediaQuery,
    ListSubheader, Avatar, CircularProgress, Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

// --- CÁC HOOK VÀ CẤU HÌNH ---
import { useAuth } from "../../contexts/AuthContext";
import { db, auth } from "../../services/firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

// --- CÁC ICON ---
import {
    Dashboard, ChevronRight, Work, AccountBalance, BarChart, Construction,
    Business, FactCheck, TableChart, LibraryAddCheck, Equalizer,
    Assignment, ContactPage, PieChart, ShowChart, TrendingUp,
    HowToReg,
    QrCodeScanner,
    History,
    Tune,
    Person,
    Logout,
    Build as BuildIcon,
    Settings as SettingsIcon,
    AdminPanelSettings
} from "@mui/icons-material";
import { Menu, MenuItem } from "@mui/material"; // Ensure Menu/MenuItem are imported

// --- STYLED COMPONENTS ---
const openedMixin = (theme, width) => ({
    width: width,
    transition: theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: "hidden",
});

const closedMixin = (theme, width) => ({
    transition: theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: "hidden",
    width: width,
    [theme.breakpoints.up("sm")]: {
        width: width,
    },
});

const StyledDrawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== "open" && prop !== "widthExpanded" && prop !== "widthCollapsed" })(
    ({ theme, open, widthExpanded, widthCollapsed }) => ({
        width: widthExpanded,
        flexShrink: 0,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        "& .MuiDrawer-paper": {
            background: theme.palette.mode === 'light'
                ? `linear-gradient(180deg, #ffffff 0%, ${alpha('#f8fafc', 0.8)} 100%)`
                : theme.palette.background.paper,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            boxShadow: theme.palette.mode === 'light'
                ? '0 0 0 1px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.08)'
                : '0 0 0 1px rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.3)',
            height: '100vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        },
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
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.5px',
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(1.5),
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(2),
    color: theme.palette.text.secondary,
    backgroundColor: "transparent",
    textTransform: 'uppercase',
}));

const navigationConfig = [
    {
        subheader: "Tổng quan",
        items: [{ title: "Dashboard", path: "/", icon: <Dashboard sx={{ fontSize: 20 }} /> }],
    },
    {
        subheader: "Quản lý Nhân sự",
        items: [
            {
                title: "Chấm công",
                icon: <HowToReg sx={{ fontSize: 20 }} />,
                children: [
                    { title: "Bảng điều khiển", path: "/attendance", icon: <Dashboard sx={{ fontSize: 18 }} /> },
                    { title: "Chấm công hàng ngày", path: "/attendance/check-in", icon: <QrCodeScanner sx={{ fontSize: 18 }} /> },
                    { title: "Lịch sử chấm công", path: "/attendance/history", icon: <History sx={{ fontSize: 18 }} /> },
                    { title: "Báo cáo", path: "/attendance/reports", icon: <BarChart sx={{ fontSize: 18 }} /> },
                    { title: "Cài đặt", path: "/attendance/settings", icon: <Tune sx={{ fontSize: 18 }} /> },
                ],
            },
        ],
    },
    {
        subheader: "Quản lý Vận hành",
        items: [
            {
                title: "Dự án & Thi công",
                icon: <Work sx={{ fontSize: 20 }} />,
                children: [
                    { title: "Kế hoạch Thi công", path: "/construction-plan", icon: <Construction sx={{ fontSize: 18 }} /> },
                    { title: "Quản lý Công trình", path: "/project-manager", icon: <Business sx={{ fontSize: 18 }} /> },
                    { title: "Đề xuất Sửa chữa", path: "/operations/repair-proposals", icon: <BuildIcon sx={{ fontSize: 18 }} /> },
                ],
            },
        ],
    },
    {
        subheader: "Tài chính & Kế toán",
        items: [
            {
                title: "Kế toán & Công nợ",
                icon: <AccountBalance sx={{ fontSize: 20 }} />,
                children: [
                    { title: "Công nợ Phải thu", path: "/accounts-receivable", icon: <FactCheck sx={{ fontSize: 18 }} /> },
                    { title: "Công nợ Phải trả", path: "/construction-payables", icon: <TableChart sx={{ fontSize: 18 }} /> },
                    { title: "Chi tiết Giao dịch", path: "/construction-payables-detail", icon: <Assignment sx={{ fontSize: 18 }} /> },
                    { title: "Phân bổ Chi phí", path: "/allocations", icon: <LibraryAddCheck sx={{ fontSize: 18 }} /> },
                    { title: "Bảng Cân đối", path: "/balance-sheet", icon: <Equalizer sx={{ fontSize: 18 }} /> },
                    { title: "Hệ thống Tài khoản", path: "/chart-of-accounts", icon: <Assignment sx={{ fontSize: 18 }} /> },
                ],
            },
        ],
    },
    {
        subheader: "Phân tích & Báo cáo",
        items: [
            {
                title: "Báo cáo",
                icon: <BarChart sx={{ fontSize: 20 }} />,
                children: [
                    { title: "Báo cáo Lợi nhuận", path: "/reports/profit-quarter", icon: <TrendingUp sx={{ fontSize: 18 }} /> },
                    { title: "Lợi nhuận theo Năm", path: "/reports/profit-year", icon: <ShowChart sx={{ fontSize: 18 }} /> },
                    { title: "Báo cáo Nợ Có", path: "/reports/broker-debt", icon: <ContactPage sx={{ fontSize: 18 }} /> },
                    { title: "Báo cáo Tổng quát", path: "/reports/overall", icon: <PieChart sx={{ fontSize: 18 }} /> },
                ],
            },
        ],
    },
    {
        subheader: "Quản trị",
        items: [
            {
                title: "Cài đặt hệ thống",
                icon: <AdminPanelSettings sx={{ fontSize: 20 }} />,
                children: [
                    { title: "Phân quyền Đề xuất SC", path: "/admin/repair-proposal-roles", icon: <SettingsIcon sx={{ fontSize: 18 }} /> },
                ],
            },
        ],
    },
];

// --- ✅ BƯỚC 1: TẠO CUSTOM HOOK ĐỂ LẤY VÀ KIỂM TRA QUYỀN ---
import { useAccessControl } from "../../hooks/useAccessControl";

// ----- Nav Item -----
function SidebarNavItem({ item, isOpen, persistKey, level = 0 }) {
    const reduce = useReducedMotion();
    const theme = useTheme();
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

    // [FIX] Moved useState to top level to avoid React Hooks violation
    const [anchorEl, setAnchorEl] = React.useState(null);
    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    const isChild = level > 0;
    const paddingLeft = isChild ? (isOpen ? 4 + level * 2 : 2) : (isOpen ? 2.5 : 2);

    const itemStyle = {
        borderRadius: isChild ? 1 : 1.5,
        mx: isChild ? 0.5 : 1.25,
        my: isChild ? 0.15 : 0.3,
        color: "text.secondary",
        position: "relative",
        minHeight: isChild ? 36 : 44,
        pl: paddingLeft,
        pr: 1.5,
        transition: 'all 0.2s ease',
        "& .MuiListItemIcon-root": {
            minWidth: isChild ? 28 : 40,
            color: "inherit",
        },
        "&:hover": {
            backgroundColor: (t) => alpha(t.palette.primary.main, isChild ? 0.06 : 0.08),
            color: "text.primary",
            transform: isChild ? 'translateX(2px)' : 'none',
        },
        "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            height: 0,
            width: 3,
            borderTopRightRadius: 3,
            borderBottomRightRadius: 3,
            backgroundColor: theme.palette.primary.main,
            transition: reduce ? "none" : "height 200ms ease-out",
            willChange: "height",
        },
    };

    const activeStyle = {
        color: theme.palette.primary.main,
        fontWeight: 600,
        backgroundColor: (t) => alpha(t.palette.primary.main, isChild ? 0.1 : 0.12),
        // [NEW] Glow Effect
        boxShadow: (t) => `0 0 0 1px ${alpha(t.palette.primary.main, 0.1)}`,
        "&::before": {
            height: isChild ? "70%" : "60%",
            boxShadow: (t) => `0 0 6px ${t.palette.primary.main}`, // Glow bar
        },
        "& .MuiListItemIcon-root": {
            color: theme.palette.primary.main,
            filter: "drop-shadow(0 0 2px currentColor)", // Glow icon
        },
    };

    if (hasChildren) {
        // [NEW] Handle Collapsed Mode: Popover Menu
        if (!isOpen) {
            return (
                <>
                    <Tooltip title={!isOpen ? title : ""} placement="right" arrow>
                        <ListItemButton
                            onClick={handleMenuOpen}
                            sx={{ ...itemStyle, ...(isActive && activeStyle) }}
                        >
                            <ListItemIcon sx={{ color: "inherit" }}>{icon}</ListItemIcon>
                        </ListItemButton>
                    </Tooltip>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
                        PaperProps={{
                            sx: {
                                ml: 1,
                                borderRadius: 3,
                                boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : '0 10px 40px -10px rgba(0,0,0,0.2)',
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                minWidth: 200
                            }
                        }}
                    >
                        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                            <Typography variant="subtitle2" color="primary.main" fontWeight={700}>
                                {title}
                            </Typography>
                        </Box>
                        {children.map(child => (
                            <MenuItem
                                key={child.title}
                                component={RouterLink}
                                to={child.path}
                                onClick={handleMenuClose}
                                selected={location.pathname === child.path || location.pathname.startsWith(child.path)}
                                sx={{
                                    my: 0.5,
                                    mx: 1,
                                    borderRadius: 1,
                                    '&.Mui-selected': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        fontWeight: 600
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 28, color: 'inherit' }}>{child.icon}</ListItemIcon>
                                <ListItemText primary={child.title} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                            </MenuItem>
                        ))}
                    </Menu>
                </>
            )
        }

        /* [OLD] Expanded Mode Logic */
        const parentActive = children.some((c) => location.pathname.startsWith(c.path));
        const collapseId = `submenu-${title.replace(/\s+/g, "-").toLowerCase()}`;

        return (
            <>
                <ListItemButton
                    onClick={() => setSubMenuOpen((v) => !v)}
                    sx={{
                        ...itemStyle,
                        ...(parentActive && {
                            color: "text.primary",
                            fontWeight: 600,
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        }),
                    }}
                    aria-expanded={isSubMenuOpen}
                    aria-controls={collapseId}
                >
                    <ListItemIcon sx={{ color: "inherit" }}>{icon}</ListItemIcon>
                    {isOpen && <ListItemText primary={title} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 'inherit' }} />}
                    {isOpen && (
                        <motion.span
                            style={{ display: "inline-flex", marginLeft: 'auto' }}
                            animate={reduce ? {} : { rotate: isSubMenuOpen ? 90 : 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                            <ChevronRight sx={{ fontSize: 18, color: 'inherit' }} />
                        </motion.span>
                    )}
                </ListItemButton>

                <Collapse in={isSubMenuOpen && isOpen} timeout={reduce ? 0 : "auto"} unmountOnExit>
                    <List
                        id={collapseId}
                        component={motion.ul}
                        initial={reduce ? false : { opacity: 0, y: -4 }}
                        animate={reduce ? {} : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        disablePadding
                        sx={{
                            pl: 0,
                            borderLeft: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                            ml: 2.5,
                        }}
                    >
                        {children.map((child) => (
                            <SidebarNavItem
                                key={child.title}
                                item={child}
                                isOpen={isOpen}
                                persistKey={persistKey}
                                level={level + 1}
                            />
                        ))}
                    </List>
                </Collapse>
            </>
        );
    }

    return (
        <Tooltip title={!isOpen ? title : ""} placement="right" arrow>
            <ListItemButton
                component={RouterLink}
                to={path}
                sx={{ ...itemStyle, ...(isActive && activeStyle) }}
                {...(isActive ? { "aria-current": "page" } : {})}
            >
                <ListItemIcon sx={{ color: "inherit" }}>{icon}</ListItemIcon>
                {isOpen && (
                    <ListItemText
                        primary={title}
                        primaryTypographyProps={{
                            fontSize: isChild ? '0.8125rem' : '0.875rem',
                            fontWeight: isActive ? 600 : 500,
                        }}
                    />
                )}
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

    const { checkPermission, isLoading } = useAccessControl();

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
            {/* Logo Section */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Stack
                    sx={{
                        alignItems: "center",
                        p: 2.5,
                        minHeight: 72,
                        justifyContent: "center",
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                        background: theme.palette.mode === 'light'
                            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, transparent 100%)`
                            : alpha(theme.palette.primary.main, 0.05),
                    }}
                >
                    <RouterLink to="/" aria-label="Trang chủ" style={{ textDecoration: 'none' }}>
                        <Box
                            component="img"
                            src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png"
                            alt="Logo Bách Khoa An Giang"
                            sx={{
                                height: isOpen ? 40 : 32,
                                width: "auto",
                                display: "block",
                                transition: 'height 0.3s ease',
                                filter: theme.palette.mode === 'dark' ? 'brightness(0.9)' : 'none',
                            }}
                        />
                    </RouterLink>
                </Stack>
            </motion.div>

            {/* Navigation Content - với minHeight 0 để flex hoạt động đúng */}
            <Box
                sx={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    maxHeight: 'calc(100vh - 200px)', // Đảm bảo để lại không gian cho logo và user profile
                    overflowY: "auto",
                    overflowX: "hidden",
                    pr: isOpen ? 0.5 : 0,
                    "&::-webkit-scrollbar": {
                        width: 6,
                    },
                    "&::-webkit-scrollbar-track": {
                        background: 'transparent',
                    },
                    "&::-webkit-scrollbar-thumb": {
                        background: alpha(theme.palette.text.primary, 0.2),
                        borderRadius: 6,
                        "&:hover": {
                            background: alpha(theme.palette.text.primary, 0.3),
                        },
                    },
                }}
            >
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <List disablePadding dense sx={{ pt: 1, pb: 1 }}>
                        {filteredConfig.map((group, groupIndex) => (
                            <motion.li
                                key={group.subheader}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: groupIndex * 0.05, duration: 0.3 }}
                            >
                                <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
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
                            </motion.li>
                        ))}
                    </List>
                )}
            </Box>

            {/* User Profile Section - flexShrink 0 để không bị co lại */}
            <Box
                sx={{
                    flexShrink: 0,
                    flexGrow: 0,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                    background: theme.palette.mode === 'light'
                        ? alpha('#ffffff', 0.95)
                        : alpha(theme.palette.background.paper, 0.95),
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    zIndex: 10,
                    width: '100%',
                    overflow: 'hidden', // Đảm bảo không bị tràn ra ngoài
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <Stack spacing={1} sx={{ p: isOpen ? 2 : 1.5 }}>
                        <Tooltip title={!isOpen ? (user?.displayName || "Hồ sơ") : ""} placement="right" arrow>
                            <Box
                                component={RouterLink}
                                to="/user"
                                sx={{
                                    textDecoration: "none",
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    position: 'relative',
                                    width: '100%',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 100%)`,
                                        opacity: 0,
                                        transition: 'opacity 0.2s ease',
                                    },
                                    '&:hover::before': {
                                        opacity: 1,
                                    },
                                }}
                                aria-label="Hồ sơ người dùng"
                            >
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent={isOpen ? "flex-start" : "center"}
                                    spacing={isOpen ? 2 : 0}
                                    sx={{
                                        p: isOpen ? 1.5 : 1,
                                        borderRadius: 2,
                                        backgroundColor: alpha(theme.palette.action.hover, 0.04),
                                        transition: 'all 0.2s ease',
                                        width: '100%',
                                        "&:hover": {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                            transform: isOpen ? 'translateX(2px)' : 'none',
                                        },
                                    }}
                                >
                                    <Avatar
                                        src={user?.photoURL || undefined}
                                        alt={user?.displayName || "User"}
                                        sx={{
                                            width: isOpen ? 40 : 36,
                                            height: isOpen ? 40 : 36,
                                            border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {(user?.displayName || "U")?.[0]?.toUpperCase()}
                                    </Avatar>
                                    {isOpen && (
                                        <Box sx={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
                                            <Typography
                                                variant="subtitle2"
                                                noWrap
                                                sx={{
                                                    fontWeight: 600,
                                                    color: theme.palette.text.primary,
                                                    fontSize: '0.875rem',
                                                }}
                                            >
                                                {user?.displayName || "Người dùng"}
                                            </Typography>
                                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    noWrap
                                                    sx={{ fontSize: '0.75rem' }}
                                                >
                                                    {user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                                                </Typography>
                                                {user?.role === "admin" && (
                                                    <Chip
                                                        label="Admin"
                                                        size="small"
                                                        sx={{
                                                            height: 18,
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                                                            color: theme.palette.primary.main,
                                                            '& .MuiChip-label': {
                                                                px: 0.75,
                                                            },
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    )}
                                    {isOpen && (
                                        <Tooltip title="Đăng xuất">
                                            <Box
                                                component="button"
                                                onClick={() => signOut(auth)}
                                                sx={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'text.secondary',
                                                    p: 0.5,
                                                    borderRadius: 1,
                                                    display: 'flex',
                                                    '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1) }
                                                }}
                                            >
                                                <Logout fontSize="small" />
                                            </Box>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Box>
                        </Tooltip>
                    </Stack>
                </motion.div>
            </Box>
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
            PaperProps={{
                sx: {
                    width: widthExpanded,
                    background: theme.palette.mode === 'light'
                        ? `linear-gradient(180deg, #ffffff 0%, ${alpha('#f8fafc', 0.8)} 100%)`
                        : theme.palette.background.paper,
                }
            }}
            role="dialog"
            aria-label="Menu điều hướng"
        >
            {content}
        </MuiDrawer>
    );
}
