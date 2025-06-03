import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BreadcrumbsNav from './Breadcrumbs';
import { Box, Container } from '@mui/material';
import './Layout.css'; // Import CSS để dùng .main-content

export default function Layout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header cố định đầu trang */}
      <Header />

      {/* Breadcrumbs nằm riêng giúp người dùng định hướng tốt hơn */}
      <Box sx={{ px: 2, py: 1 }}>
        <BreadcrumbsNav />
      </Box>

      {/* Nội dung chính dùng class main-content (CSS chuẩn ERP) */}
      <Box component="main" role="main" className="main-content">
        <Container maxWidth="xl" disableGutters>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
