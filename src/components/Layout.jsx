import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BreadcrumbsNav from './Breadcrumbs';
import { Box } from '@mui/material';

export default function Layout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      {/* Breadcrumbs nằm riêng, dễ nhìn và không lẫn trong Header */}
      <BreadcrumbsNav />

      <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
