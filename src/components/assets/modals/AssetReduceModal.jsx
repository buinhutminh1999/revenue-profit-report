import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, TextField
} from "@mui/material";

export default function AssetReduceModal({
    open,
    onClose,
    onConfirm,
    asset,
    isProcessing = false
}) {
    const [quantityToDelete, setQuantityToDelete] = useState("");

    useEffect(() => {
        if (open) setQuantityToDelete("");
    }, [open]);

    const handleConfirm = () => {
        onConfirm(quantityToDelete);
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Xác nhận Giảm Số lượng Tài sản</DialogTitle>
            <DialogContent>
                <DialogContentText component="div" sx={{ mb: 2 }}>
                    Tài sản "<b>{asset?.name}</b>" đang có <b>{asset?.quantity}</b> {asset?.unit}.
                    <br />
                    Vui lòng nhập số lượng bạn muốn xóa (giảm bớt). Một yêu cầu sẽ được tạo để chờ duyệt.
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    label={`Số lượng muốn xóa (tối đa ${asset?.quantity})`}
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={quantityToDelete}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                            setQuantityToDelete("");
                            return;
                        }
                        const num = parseInt(val, 10);
                        const max = asset?.quantity || 1;
                        if (num <= 0) setQuantityToDelete(1);
                        else if (num > max) setQuantityToDelete(max);
                        else setQuantityToDelete(num);
                    }}
                    inputProps={{ min: 1, max: asset?.quantity }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button
                    onClick={handleConfirm}
                    color="error"
                    variant="contained"
                    disabled={!quantityToDelete || quantityToDelete <= 0 || isProcessing}
                >
                    {isProcessing ? "Đang gửi..." : "Gửi Yêu Cầu"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
