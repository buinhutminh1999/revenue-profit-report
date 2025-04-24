import React from 'react';
import { Breadcrumbs as MUIBreadcrumbs, Link, Typography } from '@mui/material';
import { useLocation } from 'react-router-dom';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <MUIBreadcrumbs
      aria-label="breadcrumb"
      sx={{
        padding: '8px 16px',
        backgroundColor: 'background.paper',
        boxShadow: 1,
      }}
    >
      <Link underline="hover" color="inherit" href="/">
        Trang chủ
      </Link>
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        return last ? (
          <Typography key={to} color="text.primary">
            {value}
          </Typography>
        ) : (
          <Link key={to} underline="hover" color="inherit" href={to}>
            {value}
          </Link>
        );
      })}
    </MUIBreadcrumbs>
  );
};

export default Breadcrumbs;
