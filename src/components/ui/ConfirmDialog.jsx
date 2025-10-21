import React from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
} from "@mui/material";

/**
 * Component Dialog xác nhận tái sử dụng.
 * @param {object} props
 * @param {boolean} props.open Trạng thái mở/đóng dialog.
 * @param {string} props.title Tiêu đề của dialog.
 * @param {string | React.ReactNode} props.content Nội dung, câu hỏi xác nhận.
 * @param {function} props.onClose Hàm được gọi khi bấm "Hủy" hoặc đóng dialog.
 * @param {function} props.onConfirm Hàm được gọi khi bấm "Xác nhận".
 * @param {string} [props.confirmText="Xác nhận"] Chữ trên nút xác nhận.
 * @param {string} [props.cancelText="Hủy"] Chữ trên nút hủy.
 * @param {'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'} [props.confirmColor="primary"] Màu của nút xác nhận.
 */
function ConfirmDialog({
    open,
    title,
    content,
    onClose,
    onConfirm,
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    confirmColor = "primary",
}) {
    // Hàm này sẽ gọi cả onConfirm và onClose
    // để thực thi hành động VÀ đóng dialog
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs">
            <DialogTitle>
                <Typography variant="h6" component="span" fontWeight={600}>
                    {title}
                </Typography>
            </DialogTitle>
            <DialogContent>
                {/* Kiểm tra xem content là một chuỗi string 
                  hay là một component React (ví dụ: nhiều <Typography/>) 
                */}
                {typeof content === "string" ? (
                    <DialogContentText>{content}</DialogContentText>
                ) : (
                    content
                )}
            </DialogContent>
            <DialogActions sx={{ padding: "16px 24px" }}>
                <Button onClick={onClose} variant="outlined" color="secondary">
                    {cancelText}
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color={confirmColor}
                    autoFocus
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ConfirmDialog;