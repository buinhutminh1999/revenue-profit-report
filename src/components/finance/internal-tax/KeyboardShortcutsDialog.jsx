import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Divider,
    Chip,
    useTheme,
    alpha
} from '@mui/material';
import { Close, Keyboard } from '@mui/icons-material';

const KeyboardShortcutsDialog = ({ open, onClose }) => {
    const theme = useTheme();

    const shortcuts = [
        {
            category: 'Thao tác chung',
            items: [
                { keys: ['Ctrl', 'D'], description: 'Thêm hàng trống mới' },
                { keys: ['Delete'], description: 'Xóa hàng đã chọn' },
                { keys: ['Ctrl', 'V'], description: 'Dán dữ liệu từ Excel' },
                { keys: ['Esc'], description: 'Hủy chỉnh sửa hoặc đóng dialog' },
                { keys: ['Enter'], description: 'Lưu chỉnh sửa ô' },
            ]
        },
        {
            category: 'Điều hướng',
            items: [
                { keys: ['Tab'], description: 'Chuyển sang ô tiếp theo' },
                { keys: ['Shift', 'Tab'], description: 'Chuyển về ô trước' },
                { keys: ['↑', '↓'], description: 'Di chuyển lên/xuống giữa các hàng' },
                { keys: ['←', '→'], description: 'Di chuyển trái/phải giữa các cột' },
            ]
        },
        {
            category: 'Tìm kiếm & Lọc',
            items: [
                { keys: ['Ctrl', 'F'], description: 'Tìm kiếm (focus vào ô tìm kiếm)' },
                { keys: ['Ctrl', 'Shift', 'F'], description: 'Xóa tất cả bộ lọc' },
            ]
        }
    ];

    const renderKey = (key) => {
        const isSpecial = ['↑', '↓', '←', '→', 'Esc', 'Enter', 'Tab', 'Delete'].includes(key);
        return (
            <Chip
                key={key}
                label={key}
                size="small"
                sx={{
                    height: 28,
                    minWidth: isSpecial ? 50 : 40,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                    '& .MuiChip-label': {
                        px: 1.5
                    }
                }}
            />
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: theme.shadows[10]
                }
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Keyboard sx={{ color: theme.palette.primary.main }} />
                        <Typography variant="h6" fontWeight={700}>
                            Phím tắt bàn phím
                        </Typography>
                    </Box>
                    <Button
                        onClick={onClose}
                        sx={{ minWidth: 'auto', p: 1 }}
                        color="inherit"
                    >
                        <Close />
                    </Button>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {shortcuts.map((category, categoryIndex) => (
                        <Box key={categoryIndex}>
                            <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                sx={{
                                    mb: 2,
                                    color: theme.palette.primary.main,
                                    textTransform: 'uppercase',
                                    fontSize: '0.875rem',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                {category.category}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {category.items.map((item, itemIndex) => (
                                    <Box
                                        key={itemIndex}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            py: 1,
                                            px: 2,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                            },
                                            transition: 'background-color 0.2s'
                                        }}
                                    >
                                        <Typography variant="body2" color="text.secondary">
                                            {item.description}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {item.keys.map((key, keyIndex) => (
                                                <React.Fragment key={keyIndex}>
                                                    {renderKey(key)}
                                                    {keyIndex < item.keys.length - 1 && (
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                mx: 0.5,
                                                                color: theme.palette.text.secondary,
                                                                fontWeight: 600
                                                            }}
                                                        >
                                                            +
                                                        </Typography>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                            {categoryIndex < shortcuts.length - 1 && (
                                <Divider sx={{ mt: 3 }} />
                            )}
                        </Box>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={onClose}
                    variant="contained"
                    sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
                >
                    Đã hiểu
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default KeyboardShortcutsDialog;

