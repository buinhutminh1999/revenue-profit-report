// src/components/assets/TransferTableRowMobile.jsx
import React from "react";
import {
    Card, CardContent, CardActions, Stack, Chip, Divider, Box, Typography, Button, alpha, useTheme
} from "@mui/material";
import { SwapHoriz as ArrowRightLeft, ChevronRight, CalendarMonth, AccessTime, Person } from "@mui/icons-material";
import { statusConfig } from "../../utils/constants.jsx";
import { shortId, fullTime, formatDate } from "../../utils/assetUtils";
import { motion } from "framer-motion";

const MotionCard = motion.create(Card);

/**
 * Mobile row component for Transfer items - Premium Version
 */
const TransferTableRowMobile = ({ transfer, onDetailClick, isMyTurn, actionButtons }) => {
    const theme = useTheme();

    return (
        <MotionCard
            variant="outlined"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            // Removed whileTap for performance
            onClick={() => onDetailClick(transfer)}
            sx={{
                mb: 1.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.1)}`,
                }
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* Header: Mã phiếu & Status */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {transfer.maPhieuHienThi || `#${shortId(transfer.id)}`}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
                            <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                                {formatDate(transfer.date)}
                            </Typography>
                        </Stack>
                    </Box>
                    <Chip
                        size="small"
                        label={statusConfig[transfer.status]?.label}
                        color={statusConfig[transfer.status]?.color}
                        icon={statusConfig[transfer.status]?.icon}
                        variant="outlined" // Use outlined/filled based on preference, outlined looks cleaner here
                        sx={{ fontWeight: 600, height: 24 }}
                    />
                </Stack>

                {/* Route Visualization */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        border: '1px dashed',
                        borderColor: alpha(theme.palette.primary.main, 0.2)
                    }}
                >
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'primary.main',
                            flexShrink: 0
                        }}
                    >
                        <ArrowRightLeft fontSize="small" />
                    </Box>

                    <Stack sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">Từ</Typography>
                            <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: '70%' }}>
                                {transfer.from}
                            </Typography>
                        </Stack>
                        <Divider sx={{ my: 0.5, borderStyle: 'dotted' }} />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">Đến</Typography>
                            <Typography variant="body2" fontWeight={700} color="primary.main" noWrap sx={{ maxWidth: '70%' }}>
                                {transfer.to}
                            </Typography>
                        </Stack>
                    </Stack>
                </Box>

                {/* Footer Info */}
                <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5} sx={{ mt: 1.5 }}>
                    <Person sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">
                        {transfer.createdBy?.name}
                    </Typography>
                </Stack>

            </CardContent>

            {/* Actions Area */}
            {isMyTurn && (
                <Box sx={{
                    bgcolor: 'grey.50',
                    p: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <Stack direction="row" spacing={1} sx={{ flex: 1, overflowX: 'auto' }}>
                        {actionButtons}
                    </Stack>
                    <Button
                        size="small"
                        endIcon={<ChevronRight />}
                        sx={{
                            ml: 1,
                            color: 'text.secondary',
                            minWidth: 'auto'
                        }}
                    >
                        Chi tiết
                    </Button>
                </Box>
            )}
        </MotionCard>
    );
};

// Memoize for performance
export default React.memo(TransferTableRowMobile);
