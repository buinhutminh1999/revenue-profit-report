import React, { useState, useEffect } from 'react'; // Thêm useEffect
import { Outlet, useLocation } from 'react-router-dom';
import { Box, styled, useTheme, useMediaQuery, CssBaseline, AppBar as MuiAppBar } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';

import Header from './Header'; 
import Sidebar from './Sidebar';

// --- CẤU HÌNH KÍCH THƯỚC CHO SIDEBAR ---
const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 88;

// --- Styled Component cho Header (AppBar) ---
const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(8px)',
  boxShadow: 'none',
  borderBottom: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: SIDEBAR_WIDTH_EXPANDED,
    width: `calc(100% - ${SIDEBAR_WIDTH_EXPANDED}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
    ...theme.mixins.toolbar,
}));

/**
 * Layout ERP hiện đại, responsive với sidebar có thể thu gọn và ghi nhớ trạng thái.
 */
export default function ModernLayout() {
  const location = useLocation();
  const theme = useTheme();
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'));

  // ▼▼▼ NÂNG CẤP 1: Đọc trạng thái từ localStorage khi khởi tạo ▼▼▼
  // Sử dụng hàm callback trong useState để logic này chỉ chạy 1 lần duy nhất.
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    // Chỉ áp dụng ghi nhớ trên màn hình desktop
    if (isLgUp) {
      const savedState = localStorage.getItem('sidebarOpen');
      // Nếu có giá trị đã lưu, dùng nó. Nếu không, mặc định là mở.
      return savedState !== null ? JSON.parse(savedState) : true;
    }
    // Trên mobile, mặc định luôn là đóng.
    return false;
  });

  // ▼▼▼ NÂNG CẤP 2: Lưu trạng thái vào localStorage mỗi khi nó thay đổi ▼▼▼
  useEffect(() => {
    // Chỉ lưu trạng thái trên desktop
    if (isLgUp) {
        localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen, isLgUp]); // Chạy lại mỗi khi isSidebarOpen hoặc isLgUp thay đổi

  // ▼▼▼ NÂNG CẤP 3: Tự động đóng sidebar mobile sau khi chuyển trang ▼▼▼
  useEffect(() => {
    if (!isLgUp && isSidebarOpen) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);


  const handleSidebarToggle = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      
      <AppBar position="fixed" open={isSidebarOpen && isLgUp}>
        <Header 
            onSidebarToggle={handleSidebarToggle} 
            isSidebarOpen={isSidebarOpen}
        />
      </AppBar>
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} // Dùng cho mobile drawer
        widthExpanded={SIDEBAR_WIDTH_EXPANDED}
        widthCollapsed={SIDEBAR_WIDTH_COLLAPSED}
      />
      
      <Box component="main" sx={{ 
          flexGrow: 1, 
          display: 'flex',
          flexDirection: 'column',
          width: { lg: `calc(100% - ${SIDEBAR_WIDTH_COLLAPSED}px)` },
          transition: 'width 0.2s ease-in-out', // Thêm transition cho mượt
          ...(isSidebarOpen && isLgUp && {
            width: `calc(100% - ${SIDEBAR_WIDTH_EXPANDED}px)`,
          }),
          overflow: 'hidden'
      }}>
        <DrawerHeader />
        
        <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, overflowY: 'auto' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
}