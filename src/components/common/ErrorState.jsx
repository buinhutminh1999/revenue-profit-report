import React from 'react';
import { Box, Typography, Button, Stack, Alert, AlertTitle } from '@mui/material';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * ErrorState Component - Hiển thị trạng thái lỗi với khả năng retry
 * 
 * @param {Error|string} error - Error object hoặc error message
 * @param {string} title - Tiêu đề lỗi
 * @param {function} onRetry - Callback khi click retry
 * @param {string} retryLabel - Label cho retry button
 * @param {boolean} showDetails - Hiển thị chi tiết lỗi
 */
export default function ErrorState({
  error,
  title = "Đã xảy ra lỗi",
  onRetry,
  retryLabel = "Thử lại",
  showDetails = false,
  severity = "error", // error, warning, info
}) {
  const errorMessage = error?.message || error || "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.";

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8,
        px: 2,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Box
          sx={{
            mb: 3,
            color: `${severity}.main`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <AlertCircle size={64} />
        </Box>
      </motion.div>

      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: 2,
          color: 'text.primary',
        }}
      >
        {title}
      </Typography>

      <Alert
        severity={severity}
        sx={{
          mb: 3,
          maxWidth: 500,
          textAlign: 'left',
        }}
        icon={<AlertCircle size={20} />}
      >
        <AlertTitle sx={{ fontWeight: 600 }}>Chi tiết lỗi</AlertTitle>
        {errorMessage}
        {showDetails && error?.stack && (
          <Box
            component="pre"
            sx={{
              mt: 1,
              fontSize: '0.75rem',
              overflow: 'auto',
              maxHeight: 200,
            }}
          >
            {error.stack}
          </Box>
        )}
      </Alert>

      {onRetry && (
        <Button
          variant="contained"
          onClick={onRetry}
          startIcon={<RefreshCw size={18} />}
          sx={{ mt: 1 }}
        >
          {retryLabel}
        </Button>
      )}
    </Box>
  );
}

