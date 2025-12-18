import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
} from "@mui/material";

export default function AssetConfirmationModal({
    open,
    onClose,
    onConfirm,
    Asset,
    existingDoc
}) {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận Thêm Tài sản</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Tài sản "<b>{Asset?.name}</b>"
                    (ĐVT: {Asset?.unit}, Kích thước: {Asset?.size || 'N/A'})
                    đã tồn tại trong phòng ban này với số lượng hiện tại là <b>{existingDoc?.quantity}</b>.
                    <br /><br />
                    Bạn có muốn gửi yêu cầu <b>cộng thêm {Asset?.quantity}</b> vào số lượng hiện có không?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                >
                    Gửi Yêu Cầu Cập Nhật
                </Button>
            </DialogActions>
        </Dialog>
    );
}
