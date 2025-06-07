import React from 'react';
// SỬA LỖI: Đã thêm 'alpha' và bỏ 'useTheme' không sử dụng
import { Box, Tooltip, IconButton, styled, Stack, Divider, alpha } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// Icons
import { LayoutDashboard, FolderOpen, BarChart2, Settings } from 'lucide-react';

const SidebarWrapper = styled(motion.div)(({ theme }) => ({
  width: '80px',
  height: '100vh',
  position: 'fixed',
  top: 0,
  left: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(2, 0),
  backgroundColor: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`,
  zIndex: 1100, // Cao hơn header
  [theme.breakpoints.down('lg')]: {
    display: 'none', // Ẩn sidebar trên mobile, dùng Drawer thay thế
  },
}));

const NavIconButton = styled(IconButton)(({ theme, active }) => ({
  width: 56,
  height: 56,
  borderRadius: '12px',
  // Giờ đây 'alpha' đã được định nghĩa và code sẽ chạy đúng
  backgroundColor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
    color: theme.palette.primary.main,
  },
  transition: 'all 0.2s ease',
}));

const Logo = styled('img')({
  width: '40px',
  height: '40px',
});

export default function Sidebar() {
  const location = useLocation();
  const mainNavLinks = [
    { text: 'Trang chính', to: '/', icon: <LayoutDashboard /> },
    { text: 'Công trình', to: '/project-manager', icon: <FolderOpen /> },
    { text: 'Báo cáo', to: '/profit-report-quarter', icon: <BarChart2 /> },
  ];

  return (
    <SidebarWrapper>
      <Link to="/">
        <Logo src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png" alt="Logo" />
      </Link>
      
      <Stack spacing={2} mt={4}>
        {mainNavLinks.map(item => (
          <Tooltip title={item.text} placement="right" key={item.text}>
            <NavIconButton 
              component={Link} 
              to={item.to}
              active={location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))}
            >
              {item.icon}
            </NavIconButton>
          </Tooltip>
        ))}
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      <Stack spacing={2} mb={1}>
        <Tooltip title="Cài đặt" placement="right">
          <NavIconButton component={Link} to="/settings" active={location.pathname.startsWith('/settings')}>
            <Settings />
          </NavIconButton>
        </Tooltip>
      </Stack>
    </SidebarWrapper>
  );
}