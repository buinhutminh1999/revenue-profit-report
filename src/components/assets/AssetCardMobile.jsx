// src/components/assets/AssetCardMobile.jsx
import React from "react";
import {
    Card, CardContent, CardActionArea, Stack, Checkbox, Box, Typography,
    Tooltip, IconButton, Chip, Fade
} from "@mui/material";
import {
    Edit, Delete as Trash2, Inventory2, CalendarMonth,
    StraightenOutlined, NotesOutlined
} from "@mui/icons-material";
import { formatDate } from "../../utils/assetUtils";
import { motion } from "framer-motion";

const MotionCard = motion(Card);

const AssetCardMobile = React.memo(({ asset, isSelected, canManageAssets, showCheckbox = true, onSelect, onEdit, onDelete }) => {
    // showCheckbox controls checkbox visibility (requires valid id)
    // canManageAssets controls action buttons visibility
    const shouldShowCheckbox = canManageAssets && showCheckbox;

    return (
        <MotionCard
            variant="outlined"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            sx={{
                mb: 1.5,
                borderRadius: 3,
                overflow: 'hidden',
                border: isSelected ? '2px solid' : '1px solid',
                borderColor: isSelected ? 'primary.main' : 'divider',
                bgcolor: isSelected ? 'primary.50' : 'background.paper',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    borderColor: 'primary.light',
                }
            }}
        >
            <CardActionArea onClick={onEdit} sx={{ p: 0 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        {/* Checkbox để chọn in tem */}
                        {shouldShowCheckbox && (
                            <Checkbox
                                checked={isSelected}
                                onChange={(event) => {
                                    event.stopPropagation();
                                    onSelect(event, asset.id);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                    p: 0.5,
                                    mt: 0,
                                    '& .MuiSvgIcon-root': { fontSize: 24 } // Larger touch target
                                }}
                            />
                        )}

                        {/* Icon đại diện tài sản */}
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                bgcolor: 'primary.lighter',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <Inventory2 sx={{ color: 'primary.main', fontSize: 24 }} />
                        </Box>

                        {/* Phần thông tin chính */}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            {/* Tên tài sản - nổi bật */}
                            <Typography
                                fontWeight={700}
                                fontSize="1rem"
                                sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    mb: 0.5
                                }}
                            >
                                {asset.name}
                            </Typography>

                            {/* Thông tin chi tiết với icons */}
                            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 1 }}>
                                {/* Số lượng - chip nổi bật */}
                                <Chip
                                    size="small"
                                    label={`${asset.quantity} ${asset.unit || 'cái'}`}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontWeight: 600, borderRadius: 1.5 }}
                                />

                                {/* Ngày kiểm kê */}
                                <Chip
                                    size="small"
                                    icon={<CalendarMonth sx={{ fontSize: '16px !important' }} />}
                                    label={formatDate(asset.lastChecked)}
                                    color={asset.lastChecked ? 'success' : 'warning'}
                                    variant="outlined"
                                    sx={{ borderRadius: 1.5 }}
                                />
                            </Stack>

                            {/* Thông tin phụ */}
                            <Stack spacing={0.5}>
                                {asset.size && (
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <StraightenOutlined sx={{ fontSize: 14, color: 'text.disabled' }} />
                                        <Typography variant="caption" color="text.secondary">
                                            {asset.size}
                                        </Typography>
                                    </Stack>
                                )}
                                {asset.notes && (
                                    <Stack direction="row" alignItems="flex-start" spacing={0.5}>
                                        <NotesOutlined sx={{ fontSize: 14, color: 'text.disabled', mt: 0.25 }} />
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                fontStyle: 'italic',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        >
                                            {asset.notes}
                                        </Typography>
                                    </Stack>
                                )}
                            </Stack>
                        </Box>

                        {/* Các nút hành động - larger touch targets */}
                        {canManageAssets && (
                            <Stack spacing={0.5} onClick={(e) => e.stopPropagation()}>
                                <Tooltip title="Chỉnh sửa" arrow placement="left">
                                    <IconButton
                                        size="medium"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit();
                                        }}
                                        sx={{
                                            bgcolor: 'grey.100',
                                            '&:hover': { bgcolor: 'primary.lighter' },
                                            width: 40,
                                            height: 40,
                                        }}
                                    >
                                        <Edit sx={{ fontSize: 20 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa/Giảm SL" arrow placement="left">
                                    <IconButton
                                        size="medium"
                                        color="error"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete();
                                        }}
                                        sx={{
                                            bgcolor: 'error.lighter',
                                            '&:hover': { bgcolor: 'error.light' },
                                            width: 40,
                                            height: 40,
                                        }}
                                    >
                                        <Trash2 sx={{ fontSize: 20 }} />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        )}
                    </Stack>
                </CardContent>
            </CardActionArea>
        </MotionCard>
    );
});

export default AssetCardMobile;
