import React from 'react';
import { Breadcrumbs as MUIBreadcrumbs, Link as MUILink, Typography } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

// Map từ URL segment sang nhãn đẹp
const labelMap = {
  'construction-plan':         'Kế hoạch thi công',
  'project-details':           'Chi tiết công trình',
  'allocations':               'Quản lý - CP',
  'cost-allocation-quarter':   'Chi phí theo quý',
  'office':                    'Văn phòng',
  'categories':                'Quản trị khoản mục',
  // … thêm route khác ở đây nếu cần
};

export default function BreadcrumbsNav() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <MUIBreadcrumbs
      aria-label="breadcrumb"
      sx={{
        px: 2,
        py: 1,
        backgroundColor: 'background.paper',
        boxShadow: 1,
      }}
    >
      {/* Link về Trang chủ */}
      <MUILink
        component={Link}
        to="/"
        underline="hover"
        color="inherit"
      >
        Trang chủ
      </MUILink>

      {/* Các phân đoạn tiếp theo */}
      {segments.map((seg, i) => {
        const to = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        // Lấy nhãn từ map, nếu không có thì chuyển kebab-case → Title Case
        const label =
          labelMap[seg] ||
          seg
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (ch) => ch.toUpperCase());

        return isLast ? (
          <Typography key={to} color="text.primary">
            {label}
          </Typography>
        ) : (
          <MUILink
            key={to}
            component={Link}
            to={to}
            underline="hover"
            color="inherit"
          >
            {label}
          </MUILink>
        );
      })}
    </MUIBreadcrumbs>
  );
}
