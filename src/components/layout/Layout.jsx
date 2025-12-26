// src/components/layout/Layout.jsx — ERP modernized shell (stable widths, scroll elevation, shortcuts)

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
import { KeyboardArrowUp } from "@mui/icons-material";
import { Fab, Zoom, useScrollTrigger } from "@mui/material";

import Header from "./Header";
import Sidebar from "./Sidebar";
import WhatsNewDialog from "../common/WhatsNewDialog";

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 64;

// AppBar mờ + blur, đổi chiều rộng theo trạng thái
const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  // Màu nền mờ hiện đại
  backgroundColor: alpha(theme.palette.background.paper, 0.95),
  backdropFilter: "blur(12px)", // Tăng độ mờ nhẹ
  boxShadow: "none",
  borderBottom: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,

  // Tối ưu hóa tốc độ chuyển đổi chung
  transition: theme.transitions.create(["width", "margin", "box-shadow"], {
    easing: theme.transitions.easing.easeInOut,
    duration: 300, // Tăng nhẹ thời gian chuyển đổi cho cảm giác mượt mà
  }),

  ...(open && {
    // Chỉ áp dụng margin/width khi sidebar mở trên màn hình lớn
    marginLeft: `var(--sidebar-w, ${SIDEBAR_WIDTH_EXPANDED}px)`,
    width: `calc(100% - var(--sidebar-w, ${SIDEBAR_WIDTH_EXPANDED}px))`,
    transition: theme.transitions.create(["width", "margin", "box-shadow"], {
      easing: theme.transitions.easing.easeInOut,
      duration: 300,
    }),
  }),
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  ...theme.mixins.toolbar,
}));



function ScrollTop(props) {
  const { children, window } = props;
  const trigger = useScrollTrigger({
    target: window ? window() : undefined,
    disableHysteresis: true,
    threshold: 100,
  });

  const handleClick = (event) => {
    const anchor = (event.target.ownerDocument || document).querySelector(
      "#app-main"
    );
    if (anchor) {
      anchor.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <Zoom in={trigger}>
      <Box
        onClick={handleClick}
        role="presentation"
        sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, "@media print": { display: "none" } }} // Hide on print
      >
        {children}
      </Box>
    </Zoom>
  );
}

export default function ModernLayout(props) {
  const location = useLocation();
  const theme = useTheme();
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));
  const reduce = useReducedMotion();
  const scrollRef = useRef(null);
  const [elevated, setElevated] = useState(false);

  // Khởi tạo: mặc định đóng; khi biết là desktop thì đọc localStorage
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    if (isLgUp) {
      const saved = localStorage.getItem("sidebarOpen");
      setSidebarOpen(saved !== null ? JSON.parse(saved) : true);
    } else {
      setSidebarOpen(false);
    }
  }, [isLgUp]);

  // Lưu trạng thái (desktop)
  useEffect(() => {
    if (isLgUp) localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen, isLgUp]);

  // Đóng sidebar mobile sau khi chuyển trang
  useEffect(() => {
    if (!isLgUp && isSidebarOpen) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Phím tắt: Ctrl/Cmd + B để toggle sidebar
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSidebarToggle = useCallback(() => setSidebarOpen((v) => !v), []);

  // Theo dõi cuộn để thêm bóng dưới AppBar
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const onScroll = () => setElevated(sc.scrollTop > 2);
    sc.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => sc.removeEventListener("scroll", onScroll);
  }, []);

  // CSS variables cho chiều rộng sidebar → hạn chế layout shift
  const rootVars = useMemo(
    () => ({
      // --sidebar-w dùng khi mở trên desktop, ngược lại dùng collapsed
      "--sidebar-w":
        isLgUp && isSidebarOpen
          ? `${SIDEBAR_WIDTH_EXPANDED}px`
          : `${SIDEBAR_WIDTH_COLLAPSED}px`,
    }),
    [isLgUp, isSidebarOpen]
  );

  // Custom scroll trigger for main element
  const trigger = useScrollTrigger({
    target: scrollRef.current || undefined,
    disableHysteresis: true,
    threshold: 300,
  });

  return (
    <Box sx={{ display: "flex", height: "100vh", ...rootVars }}>
      <CssBaseline />

      <AppBar
        position="fixed"
        open={isSidebarOpen && isLgUp}
        sx={{
          // đổ bóng khi content cuộn
          boxShadow: elevated ? `0 6px 16px ${alpha(theme.palette.common.black, 0.08)}` : "none",
          "@media print": { display: "none" }, // Hide on print
        }}
      >
        <Header onSidebarToggle={handleSidebarToggle} isSidebarOpen={isSidebarOpen} />
      </AppBar>

      <Box component="nav" sx={{ "@media print": { display: "none" } }}>
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          widthExpanded={SIDEBAR_WIDTH_EXPANDED}
          widthCollapsed={SIDEBAR_WIDTH_COLLAPSED}
        />
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          // chiều rộng ổn định theo biến
          width: { lg: `calc(100% - var(--sidebar-w))` },
          transition: reduce ? "none" : "width 200ms ease-in-out",
          overflow: "hidden",
          "@media print": {
            width: "100% !important",
            marginLeft: "0 !important"
          }
        }}
      >
        {/* Spacer cho AppBar */}
        <DrawerHeader />

        {/* Content scroll container */}
        <Box
          ref={scrollRef}
          role="main"
          id="app-main"
          tabIndex={-1}
          sx={{
            flexGrow: 1,
            p: { xs: 1, sm: 2 }, // Reduced padding for ERP density
            overflowY: "auto",
            overflowX: "hidden",
            scrollBehavior: "smooth",
            overscrollBehavior: "contain",
            // Edge-fade chỉ mờ ở ĐỈNH (top), ĐÁY (bottom) giữ nguyên để rõ nội dung
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 24px, black 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0, black 24px, black 100%)",
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

          {/* Back to Top Fab */}
          <Zoom in={trigger}>
            <Box
              onClick={() => scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })}
              role="presentation"
              sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, "@media print": { display: "none" } }}
            >
              <Fab color="primary" size="small" aria-label="scroll back to top" sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                <KeyboardArrowUp />
              </Fab>
            </Box>
          </Zoom>
        </Box>
      </Box>
      <WhatsNewDialog />
    </Box>
  );
}