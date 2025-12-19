// src/components/common/ConfirmDialog.jsx
// Generic confirmation dialog for delete/action confirmations

import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Stack, Avatar, CircularProgress,
    useTheme
} from '@mui/material';
import { Warning, Delete, Close } from '@mui/icons-material';

export default function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title = "Xác nhận",
    message = "Bạn có chắc chắn muốn thực hiện hành động này?",
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    confirmColor = "primary",
    icon = <Warning />,
    iconColor = "warning.main",
    loading = false,
    children, // Optional additional content
}) {
    const theme = useTheme();

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: iconColor, width: 40, height: 40 }}>
                        {icon}
                    </Avatar>
                    <Typography variant="h6" fontWeight={700}>
                        {title}
                    </Typography>
                </Stack>
            </DialogTitle>

            <DialogContent>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {message}
                </Typography>
                {children}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={onClose}
                    disabled={loading}
                    color="inherit"
                >
                    {cancelText}
                </Button>
                <Button
                    variant="contained"
                    color={confirmColor}
                    onClick={onConfirm}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                >
                    {loading ? "Đang xử lý..." : confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// Pre-configured Delete Confirmation
export function DeleteConfirmDialog({
    open,
    onClose,
    onConfirm,
    itemName = "mục này",
    loading = false,
}) {
    return (
        <ConfirmDialog
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Xác nhận xóa"
            message={`Bạn có chắc chắn muốn xóa ${itemName}? Hành động này không thể hoàn tác.`}
            confirmText="Xóa"
            confirmColor="error"
            icon={<Delete />}
            iconColor="error.main"
            loading={loading}
        />
    );
}
