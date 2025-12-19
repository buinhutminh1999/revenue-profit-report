// src/components/common/RejectReasonDialog.jsx
// Dialog for rejection with reason input

import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Stack, Avatar, TextField, CircularProgress,
} from '@mui/material';
import { Close, Cancel } from '@mui/icons-material';

export default function RejectReasonDialog({
    open,
    onClose,
    onConfirm,
    title = "Từ chối",
    itemType = "yêu cầu", // yêu cầu / báo cáo / phiếu
    loading = false,
    requireReason = true,
}) {
    const [reason, setReason] = useState('');

    // Reset reason when dialog opens
    useEffect(() => {
        if (open) {
            setReason('');
        }
    }, [open]);

    const handleConfirm = () => {
        if (requireReason && !reason.trim()) return;
        onConfirm(reason.trim());
    };

    const canConfirm = !requireReason || reason.trim().length > 0;

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: 'error.main', width: 40, height: 40 }}>
                        <Cancel />
                    </Avatar>
                    <Typography variant="h6" fontWeight={700}>
                        {title}
                    </Typography>
                </Stack>
            </DialogTitle>

            <DialogContent>
                <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                    Bạn có chắc chắn muốn từ chối {itemType} này?
                    {requireReason && " Vui lòng nhập lý do từ chối."}
                </Typography>

                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Lý do từ chối"
                    placeholder="Nhập lý do từ chối..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required={requireReason}
                    error={requireReason && reason.trim().length === 0}
                    helperText={requireReason && reason.trim().length === 0 ? "Vui lòng nhập lý do" : ""}
                />
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={onClose}
                    disabled={loading}
                    color="inherit"
                >
                    Hủy
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleConfirm}
                    disabled={loading || !canConfirm}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Cancel />}
                >
                    {loading ? "Đang xử lý..." : "Từ chối"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
