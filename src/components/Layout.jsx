import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, styled } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';

import Header from './Header'; // Header giờ là một phần của layout này
import Sidebar from './Sidebar'; // Component Sidebar mới

const MainContainer = styled('main')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: 'margin-left 0.3s ease-out',
  marginLeft: '80px', // Bằng chiều rộng của Sidebar
  [theme.breakpoints.down('lg')]: {
    marginLeft: 0, // Không có margin trên mobile
  },
}));

export default function Layout() {
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflowY: 'auto' }}>
        {/* Header bây giờ không cần Container và nằm trong cấu trúc này */}
        <Header /> 
        <MainContainer>
          {/* LEVEL UP: Hiệu ứng chuyển trang */}
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