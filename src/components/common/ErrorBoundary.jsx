// src/components/common/ErrorBoundary.jsx
import React from 'react';
import { Box, Button, Typography } from '@mui/material';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <Typography variant="h4" gutterBottom>Đã có lỗi xảy ra</Typography>
          <Typography color="text.secondary" mb={3}>Vui lòng tải lại trang để tiếp tục.</Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>Tải lại</Button>
        </Box>
      );
    }
    return this.props.children;
  }
}