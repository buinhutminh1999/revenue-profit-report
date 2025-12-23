// src/components/assets/AssetCardMobile.jsx
import React from "react";
import {
    Card, CardContent, Stack, Checkbox, Box, Typography,
    Tooltip, IconButton, Chip, alpha, useTheme
} from "@mui/material";
import {
    Edit, Delete as Trash2, Inventory2, CalendarMonth,
    StraightenOutlined, NotesOutlined, Circle
} from "@mui/icons-material";
import { formatDate } from "../../utils/assetUtils";
import { motion } from "framer-motion";

const MotionCard = motion.create(Card);

const AssetCardMobile = React.memo(({ asset, isSelected, canManageAssets, showCheckbox = true, onSelect, onEdit, onDelete }) => {
    const theme = useTheme();
    // showCheckbox controls checkbox visibility (requires valid id)
    // canManageAssets controls action buttons visibility
    const shouldShowCheckbox = canManageAssets && showCheckbox;

    return (
        <MotionCard
            variant="outlined"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            // Removed whileHover and whileTap for performance
            sx={{
                mb: 1.5,
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: isSelected ? 'primary.main' : 'divider',
                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
                position: 'relative',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSelected ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}` : 'none',
                '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.1)}`,
                }
            }}
        >
            {/* Selection Indicator Strip */}
            {isSelected && (
                <Box sx={{
                    position: 'absolute',
                    top: 0, bottom: 0, left: 0,
                    width: 4,
                    bgcolor: 'primary.main'
                }} />
            )}

            {/* Clickable Area */}
            <Box
                onClick={onEdit}
                sx={{
                    cursor: 'pointer',
                    '&:active': { bgcolor: alpha(theme.palette.action.active, 0.05) }
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                        {/* Checkbox for selection */}
                        {shouldShowCheckbox && (
                            <Box onClick={(e) => e.stopPropagation()} sx={{ mt: 0.5 }}>
                                <Checkbox
                                    checked={isSelected}
                                    onChange={(event) => onSelect(event, asset.id)}
                                    icon={<Circle variant="outlined" sx={{ color: 'text.disabled', fontSize: 24 }} />}
                                    checkedIcon={<Circle sx={{ color: 'primary.main', fontSize: 24 }} />}
                                    sx={{ p: 0 }}
                                />
                            </Box>
                        )}

                        {/* Icon Block */}
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2.5,
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                color: 'primary.main'
                            }}
                        >
                            <Inventory2 sx={{ fontSize: 24 }} />
                        </Box>

                        {/* Content */}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                <Typography
                                    variant="subtitle1"
                                    fontWeight={700}
                                    sx={{
                                        lineHeight: 1.3,
                                        mb: 0.5,
                                        color: isSelected ? 'primary.main' : 'text.primary'
                                    }}
                                >
                                    {asset.name}
                                </Typography>

                                {/* Status Dot based on availability */}
                                {Number(asset.availableQuantity) <= 0 && (
                                    <Tooltip title="Đang khóa / Hết hàng">
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main', mt: 1, flexShrink: 0 }} />
                                    </Tooltip>
                                )}
                            </Stack>

                            {/* Quantity & Date */}
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
                                <Typography variant="body2" fontWeight={600} color="text.primary">
                                    {asset.quantity} {asset.unit || 'cái'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CalendarMonth sx={{ fontSize: 14 }} />
                                    {formatDate(asset.lastChecked)}
                                </Typography>
                            </Stack>

                            {/* Secondary Info */}
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
                    </Stack>

                    {/* Action Bar - Only visible if managing */}
                    {canManageAssets && (
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 1,
                            mt: 1.5,
                            pt: 1.5,
                            borderTop: '1px dashed',
                            borderColor: 'divider'
                        }}>
                            <Box
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.5,
                                    px: 1.5, py: 0.5, borderRadius: 1.5,
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    color: 'primary.main',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
                                }}
                            >
                                <Edit sx={{ fontSize: 16 }} />
                                <Typography variant="caption" fontWeight={600}>Sửa</Typography>
                            </Box>

                            <Box
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.5,
                                    px: 1.5, py: 0.5, borderRadius: 1.5,
                                    bgcolor: alpha(theme.palette.error.main, 0.08),
                                    color: 'error.main',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.15) }
                                }}
                            >
                                <Trash2 sx={{ fontSize: 16 }} />
                                <Typography variant="caption" fontWeight={600}>Xóa</Typography>
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Box>
        </MotionCard>
    );
});

export default AssetCardMobile;
