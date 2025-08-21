// src/pages/PermissionDenied.jsx

import React from 'react';
import { Box, Button, Typography, Container, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PermissionDenied() {
  const theme = useTheme();

  return (
    <Container>
      <Box
        sx={{
          py: 12,
          maxWidth: 480,
          mx: 'auto',
          display: 'flex',
          minHeight: 'calc(100vh - 250px)', // Căn giữa trong layout
          textAlign: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
        >
          <Box sx={{ mb: 3, color: theme.palette.error.main }}>
            <ShieldOff size={96} strokeWidth={1.5} />
          </Box>

          <Typography variant="h3" paragraph>
            Truy cập bị từ chối
          </Typography>

          <Typography sx={{ color: 'text.secondary', mb: 4 }}>
            Rất tiếc, tài khoản của bạn không có quyền truy cập vào chức năng này.
            <br />
            Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là một lỗi.
          </Typography>

          <Button to="/" variant="contained" component={RouterLink}>
            Quay về trang tổng quan
          </Button>
        </motion.div>
      </Box>
    </Container>
  );
}