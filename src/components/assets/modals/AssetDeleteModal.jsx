import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
} from "@mui/material";

export default function AssetDeleteModal({
    open,
    onClose,
    onConfirm,
    assetName,
    isProcessing = false
}) {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Xác nhận Yêu cầu Xóa</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Bạn có chắc muốn gửi yêu cầu xóa tài sản “<b>{assetName}</b>” không? Tài sản sẽ chỉ bị xóa sau khi được duyệt.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button
                    onClick={onConfirm}
                    color="error"
                    variant="contained"
                    disabled={isProcessing}
                >
                    {isProcessing ? "Đang gửi..." : "Gửi Yêu Cầu"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
