import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, styled } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';

import Header from './Header'; 
import Sidebar from './Sidebar';

// --- TỐI ƯU 1: Quản lý chiều rộng Sidebar ở một nơi duy nhất ---
// Giúp code dễ bảo trì hơn. Nếu bạn thay đổi chiều rộng của Sidebar,
// chỉ cần thay đổi giá trị của hằng số này.
const SIDEBAR_WIDTH = 80; // (đơn vị: px)

// Styled component cho khu vực nội dung chính
const MainContainer = styled('main')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: 'margin-left 0.3s ease-out',
  marginLeft: `${SIDEBAR_WIDTH}px`, // Sử dụng hằng số
  [theme.breakpoints.down('lg')]: {
    marginLeft: 0, // Trên màn hình nhỏ, sidebar sẽ ẩn đi nên không cần margin
  },
}));

/**
 * Layout chính cho toàn bộ ứng dụng, bao gồm Sidebar, Header
 * và khu vực hiển thị nội dung của từng trang (Outlet).
 * Tích hợp sẵn hiệu ứng chuyển trang mượt mà.
 */
export default function Layout() {
  const location = useLocation();

  return (
    // --- TỐI ƯU 2: Thêm background có chiều sâu cho toàn bộ ứng dụng ---
    <Box sx={{ 
        display: 'flex', 
        height: '100vh', 
        // Gradient rất nhẹ tạo cảm giác hiện đại và đỡ nhàm chán hơn nền trắng tinh
        background: 'linear-gradient(160deg, #f9fafb 0%, #f4f6f8 100%)', 
    }}>
      <Sidebar />
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1, 
        overflowY: 'auto' // Cho phép cuộn nếu nội dung dài
    }}>
        
        <Header /> 
        
        <MainContainer>
          {/* --- GIỮ NGUYÊN: Hiệu ứng chuyển trang đã làm rất tốt --- */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </MainContainer>
      </Box>
    </Box>
  );
}