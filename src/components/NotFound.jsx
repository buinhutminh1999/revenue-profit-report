import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: 'center', p: 4 }}>
      <Typography variant="h3" color="error" sx={{ mb: 2 }}>
        404 - Trang không tồn tại
      </Typography>
      <Typography variant="h6" sx={{ mb: 4 }}>
        Rất tiếc, trang bạn tìm không tồn tại.
      </Typography>
      <Button variant="contained" color="primary" onClick={() => navigate('/')}>
        Quay lại Trang chủ
      </Button>
    </Box>
  );
};

export default NotFound;
