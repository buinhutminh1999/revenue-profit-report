import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, TextField, Alert
} from "@mui/material";

export default function AssetPasteModal({
    open,
    onClose,
    onConfirm,
    isProcessing = false
}) {
    const [pastedText, setPastedText] = useState("");

    const handleConfirm = () => {
        onConfirm(pastedText);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Nhập tài sản từ Excel (Copy & Paste)</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    Copy dữ liệu từ Excel (không bao gồm tiêu đề) và dán vào bên dưới.
                    <br />
                    Thứ tự cột: <b>Tên tài sản | Kích thước | Đơn vị | Số lượng | Ghi chú</b>
                </DialogContentText>

                <TextField
                    multiline
                    rows={10}
                    fullWidth
                    placeholder={`Bàn làm việc\t1.2m\tCái\t5\tPhòng Giám đốc\nGhế xoay\t\tCái\t10\t`}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    variant="outlined"
                    sx={{ fontFamily: 'monospace' }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!pastedText.trim() || isProcessing}
                >
                    {isProcessing ? "Đang xử lý..." : "Nhập & Lưu"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
