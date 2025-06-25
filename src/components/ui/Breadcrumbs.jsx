import React from 'react';
import { Breadcrumbs as MUIBreadcrumbs, Typography, useTheme, Box, Link as MUILink } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// Icons
import { Home, FolderGit2, FileText, Settings, ChevronRight } from 'lucide-react';

// TỐI ƯU 1: Mở rộng labelMap để chứa cả icon và text
const breadcrumbNameMap = {
  '/project-manager': { text: 'Quản Lý Công Trình', icon: <FolderGit2 size={16} /> },
  '/construction-plan': { text: 'Kế Hoạch Thi Công', icon: <FileText size={16} /> },
  '/settings': { text: 'Cài Đặt', icon: <Settings size={16} /> },
  // Thêm các route khác của bạn ở đây
};

// TỐI ƯU 2: Tạo component con để tái sử dụng, tránh lặp code
const Crumb = ({ text, to, icon, isLast }) => {
  const theme = useTheme();

  const content = (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        color: isLast ? 'text.primary' : 'text.secondary',
        '&:hover': {
          color: isLast ? 'text.primary' : theme.palette.primary.main,
        }
      }}
    >
      {icon}
      <Typography variant="body2" sx={{ fontWeight: isLast ? 600 : 500 }}>
        {text}
      </Typography>
    </Box>
  );

  if (isLast) {
    return content;
  }

  return (
    <MUILink component={RouterLink} to={to} underline="none">
      {content}
    </MUILink>
  );
};

export default function BreadcrumbsNav() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    // TỐI ƯU 3: Bỏ Box bao ngoài, component giờ "chromeless" và sẵn sàng tích hợp vào Header
    <MUIBreadcrumbs
      aria-label="breadcrumb"
      separator={<ChevronRight size={16} />}
      sx={{
        '& .MuiBreadcrumbs-ol': {
            alignItems: 'center'
        }
      }}
    >
      {/* Link Trang chủ mặc định */}
      <Crumb text="Trang chủ" to="/" icon={<Home size={16} />} isLast={pathnames.length === 0} />
      
      {/* Các link khác từ URL */}
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const routeConfig = breadcrumbNameMap[to];

        // Nếu có trong map thì dùng, không thì tự tạo title
        const text = routeConfig?.text || value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
        const icon = routeConfig?.icon || null;

        return <Crumb text={text} to={to} icon={icon} isLast={last} key={to} />;
      })}
    </MUIBreadcrumbs>
  );
}