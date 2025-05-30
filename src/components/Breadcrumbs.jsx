import React from 'react';
import {
  Breadcrumbs as MUIBreadcrumbs,
  Link as MUILink,
  Typography,
  useTheme,
  Box
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

// Map từ URL segment sang nhãn đẹp
const labelMap = {
  'construction-plan': 'Kế hoạch thi công',
  'project-details': 'Chi tiết công trình',
  'allocations': 'Quản lý - CP',
  'cost-allocation-quarter': 'Chi phí theo quý',
  'office': 'Văn phòng',
  'categories': 'Quản trị khoản mục',
  // thêm routes nếu cần
};

export default function BreadcrumbsNav() {
  const theme = useTheme();
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        py: 1,
        bgcolor: theme.palette.background.paper,
        boxShadow: 1,
        borderRadius: 2,
      }}
    >
      <MUIBreadcrumbs
        aria-label="breadcrumb"
        separator="›"
        sx={{ fontSize: '0.9rem' }}
      >
        {/* Trang chủ luôn có */}
        <MUILink
          component={Link}
          to="/"
          underline="hover"
          color="inherit"
          fontWeight={500}
        >
          Trang chủ
        </MUILink>

        {/* Các phân đoạn URL */}
        {segments.map((seg, i) => {
          const to = '/' + segments.slice(0, i + 1).join('/');
          const isLast = i === segments.length - 1;
          const label =
            labelMap[seg] ||
            seg
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (ch) => ch.toUpperCase());

          return isLast ? (
            <Typography key={to} color="text.primary" fontWeight={600}>
              {label}
            </Typography>
          ) : (
            <MUILink
              key={to}
              component={Link}
              to={to}
              underline="hover"
              color="inherit"
              fontWeight={500}
            >
              {label}
            </MUILink>
          );
        })}
      </MUIBreadcrumbs>
    </Box>
  );
}
