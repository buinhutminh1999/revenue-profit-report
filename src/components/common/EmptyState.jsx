import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * EmptyState Component - Hiển thị trạng thái không có dữ liệu
 * 
 * @param {ReactNode} icon - Icon hoặc illustration
 * @param {string} title - Tiêu đề
 * @param {string} description - Mô tả
 * @param {string} actionLabel - Label cho button action
 * @param {function} onAction - Callback khi click action button
 * @param {ReactNode} children - Nội dung tùy chỉnh
 */
export default function EmptyState({
  icon,
  title = "Không có dữ liệu",
  description = "Hiện tại không có dữ liệu để hiển thị.",
  actionLabel,
  onAction,
  children,
  size = "medium", // small, medium, large
}) {
  const iconSize = size === "small" ? 48 : size === "large" ? 96 : 64;
  const spacing = size === "small" ? 4 : size === "large" ? 10 : 8;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: spacing,
        px: 2,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {icon && (
          <Box
            sx={{
              mb: 3,
              color: 'text.secondary',
              display: 'flex',
              justifyContent: 'center',
              '& svg': {
                width: iconSize,
                height: iconSize,
              },
            }}
          >
            {icon}
          </Box>
        )}
      </motion.div>

      <Typography
        variant={size === "small" ? "h6" : size === "large" ? "h4" : "h5"}
        sx={{
          fontWeight: 700,
          mb: 1.5,
          color: 'text.primary',
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: actionLabel || onAction ? 3 : 0,
            maxWidth: 400,
            mx: 'auto',
          }}
        >
          {description}
        </Typography>
      )}

      {children || (actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          sx={{ mt: 1 }}
        >
          {actionLabel}
        </Button>
      ))}
    </Box>
  );
}

