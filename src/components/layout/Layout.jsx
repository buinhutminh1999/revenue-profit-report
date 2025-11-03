// src/components/layout/Layout.jsx
// Phiên bản Tối ưu nhất (Đã áp dụng Lazy State, Custom Hook, A11y, Hotkeys)

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
    Box,
    styled,
    useTheme,
    useMediaQuery,
    CssBaseline,
    AppBar as MuiAppBar,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";

// Component con
import Header from "./Header";
import Sidebar from "./Sidebar";

// ✅ Import hook tối ưu
import  useScrollElevation  from "../../hooks/useScrollElevation";

// Hằng số layout
const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 88;

// Styled components
const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor: alpha(theme.palette.background.paper, 0.8),
    backdropFilter: "blur(8px)",
    boxShadow: "none",
    borderBottom: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.primary,
    transition: theme.transitions.create(["width", "margin"], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        marginLeft: `var(--sidebar-w, ${SIDEBAR_WIDTH_EXPANDED}px)`,
        width: `calc(100% - var(--sidebar-w, ${SIDEBAR_WIDTH_EXPANDED}px))`,
        transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

const DrawerHeader = styled("div")(({ theme }) => ({
    ...theme.mixins.toolbar,
}));

export default function ModernLayout() {
    const location = useLocation();
    const theme = useTheme();
    const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));
    const reduce = useReducedMotion();
    const scrollRef = useRef(null);

    // ✅ Tối ưu 1: Dùng "Lazy Initializer" cho useState
    // Hàm này chỉ chạy 1 lần khi khởi tạo, tránh 2 lần render
    const [isSidebarOpen, setSidebarOpen] = useState(() => {
        const saved = localStorage.getItem("sidebarOpen");
        // Mặc định là 'true' nếu không có gì trong localStorage
        return saved !== null ? JSON.parse(saved) : true;
    });

    // ✅ Tối ưu 2: Dùng Custom Hook cho logic cuộn
    // Toàn bộ logic `elevated` đã được chuyển vào hook
    const elevated = useScrollElevation(scrollRef);

    // Chỉ dùng useEffect để cập nhật state khi màn hình thay đổi
    useEffect(() => {
        if (isLgUp) {
            // Lưu state khi ở desktop
            localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
        } else {
            // Tắt sidebar nếu chuyển sang mobile
            setSidebarOpen(false);
        }
    }, [isSidebarOpen, isLgUp]);

    // Đóng sidebar mobile sau khi chuyển trang
    useEffect(() => {
        if (!isLgUp && isSidebarOpen) {
            setSidebarOpen(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Dùng hook `useHotkeys` cho sạch sẽ
    useHotkeys(
        "ctrl+b, cmd+b",
        (e) => {
            e.preventDefault();
            setSidebarOpen((v) => !v);
        },
        [setSidebarOpen]
    );

    const handleSidebarToggle = useCallback(() => setSidebarOpen((v) => !v), []);

    // CSS variables cho chiều rộng sidebar (chống layout shift)
    const rootVars = useMemo(
        () => ({
            "--sidebar-w":
                isLgUp && isSidebarOpen
                    ? `${SIDEBAR_WIDTH_EXPANDED}px`
                    : `${SIDEBAR_WIDTH_COLLAPSED}px`,
        }),
        [isLgUp, isSidebarOpen]
    );

    return (
        <Box sx={{ display: "flex", height: "100vh", ...rootVars }}>
            <CssBaseline />

            <AppBar
                position="fixed"
                open={isSidebarOpen && isLgUp}
                sx={{
                    // State `elevated` lấy từ hook
                    boxShadow: elevated ? `0 6px 16px ${alpha(theme.palette.common.black, 0.08)}` : "none",
                }}
            >
                <Header onSidebarToggle={handleSidebarToggle} isSidebarOpen={isSidebarOpen} />
            </AppBar>

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                widthExpanded={SIDEBAR_WIDTH_EXPANDED}
                widthCollapsed={SIDEBAR_WIDTH_COLLAPSED}
            />

            {/* ✅ Tối ưu 3 (A11y): <main> là thẻ cha duy nhất cho nội dung */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    width: { lg: `calc(100% - var(--sidebar-w))` },
                    transition: reduce ? "none" : "width 200ms ease-in-out",
                    overflow: "hidden", // Quan trọng: Đảm bảo <main> không cuộn
                }}
            >
                {/* Spacer cho AppBar */}
                <DrawerHeader />

                {/* Vùng nội dung cuộn (không dùng `component="main"`) */}
                <Box
                    ref={scrollRef} // Ref được gán vào đây
                    id="app-main"
                    tabIndex={-1}
                    sx={{
                        flexGrow: 1,
                        p: { xs: 2, sm: 3 },
                        overflowY: "auto", // Chỉ vùng này được cuộn
                        overflowX: "hidden",
                        scrollBehavior: "smooth",
                        overscrollBehavior: "contain",
                        // Edge-fade (giữ nguyên)
                        WebkitMaskImage:
                            "linear-gradient(to bottom, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
                        maskImage:
                            "linear-gradient(to bottom, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
                    }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname + location.search}
                            initial={reduce ? {} : { opacity: 0, y: 15 }}
                            animate={reduce ? {} : { opacity: 1, y: 0 }}
                            exit={reduce ? {} : { opacity: 0, y: 15 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}

                            style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </Box>
            </Box>
        </Box>
    );
}