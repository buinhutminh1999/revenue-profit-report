import React from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
    Box,
    Stack,
    IconButton,
    Avatar,
} from "@mui/material";
import {
    Warning,
    Error as ErrorIcon,
    Info,
    CheckCircle,
    Close,
} from "@mui/icons-material";
import { useTheme, alpha } from "@mui/material/styles";

/**
 * Component Dialog xác nhận tái sử dụng - Enhanced với icons và better styling.
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
    const theme = useTheme();

    // Hàm này sẽ gọi cả onConfirm và onClose
    // để thực thi hành động VÀ đóng dialog
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    // Chọn icon dựa trên màu
    const getIcon = () => {
        switch (confirmColor) {
            case "error":
                return <ErrorIcon />;
            case "warning":
                return <Warning />;
            case "info":
                return <Info />;
            case "success":
                return <CheckCircle />;
            default:
                return <Info />;
        }
    };

    // Màu accent cho icon background
    const getIconColor = () => {
        switch (confirmColor) {
            case "error":
                return theme.palette.error;
            case "warning":
                return theme.palette.warning;
            case "info":
                return theme.palette.info;
            case "success":
                return theme.palette.success;
            default:
                return theme.palette.primary;
        }
    };

    const iconColor = getIconColor();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: theme.shadows[12],
                },
            }}
        >
            <DialogTitle>
                <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={2} alignItems="center" flex={1}>
                        <Avatar
                            sx={{
                                bgcolor: alpha(iconColor.main, 0.1),
                                color: iconColor.main,
                                width: 48,
                                height: 48,
                            }}
                        >
                            {getIcon()}
                        </Avatar>
                        <Typography variant="h6" component="span" fontWeight={700}>
                            {title}
                        </Typography>
                    </Stack>
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{
                            color: "text.secondary",
                            "&:hover": {
                                bgcolor: alpha(theme.palette.action.hover, 0.5),
                            },
                        }}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ pl: 8, pr: 1 }}>
                    {/* Kiểm tra xem content là một chuỗi string 
                      hay là một component React (ví dụ: nhiều <Typography/>) 
                    */}
                    {typeof content === "string" ? (
                        <DialogContentText
                            sx={{
                                color: "text.primary",
                                fontSize: "0.95rem",
                                lineHeight: 1.6,
                            }}
                        >
                            {content}
                        </DialogContentText>
                    ) : (
                        content
                    )}
                </Box>
            </DialogContent>
            <DialogActions
                sx={{
                    padding: "20px 24px",
                    borderTop: `1px solid ${theme.palette.divider}`,
                    gap: 1,
                }}
            >
                <Button
                    onClick={onClose}
                    variant="outlined"
                    color="inherit"
                    sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: 2,
                        px: 3,
                    }}
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color={confirmColor}
                    autoFocus
                    sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: 2,
                        px: 3,
                        boxShadow: `0 4px 12px ${alpha(
                            iconColor.main,
                            0.3
                        )}`,
                        "&:hover": {
                            boxShadow: `0 6px 16px ${alpha(iconColor.main, 0.4)}`,
                        },
                    }}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ConfirmDialog;