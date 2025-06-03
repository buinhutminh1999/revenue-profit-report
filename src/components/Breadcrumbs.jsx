import React from 'react';
import {
  Breadcrumbs as MUIBreadcrumbs,
  Link as MUILink,
  Typography,
  useTheme,
  Box,
  Tooltip,
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';

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
        sx={{
          fontSize: '0.9rem',
          '& .MuiTypography-root': { fontWeight: 600 },
          '& a': { fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 },
        }}
      >
        {/* Trang chủ luôn có */}
        <MUILink
          component={Link}
          to="/"
          underline="hover"
          color="inherit"
        >
          <HomeIcon fontSize="small" />
          Trang chủ
        </MUILink>

        {/* Các phân đoạn URL */}
        {segments.map((seg, i) => {
          const to = '/' + segments.slice(0, i + 1).join('/');
          const isLast = i === segments.length - 1;
          const label =
            labelMap[seg] ||
            decodeURIComponent(
              seg.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
            );

          return isLast ? (
            <Tooltip title={label} key={to}>
              <Typography color="text.primary">{label}</Typography>
            </Tooltip>
          ) : (
            <Tooltip title={label} key={to}>
              <MUILink
                component={Link}
                to={to}
                underline="hover"
                color="inherit"
              >
                {label}
              </MUILink>
            </Tooltip>
          );
        })}
      </MUIBreadcrumbs>
    </Box>
  );
}
