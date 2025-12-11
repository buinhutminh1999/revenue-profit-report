// src/components/assets/TransferTableRowMobile.jsx
import React from "react";
import {
    Card, CardContent, CardActions, Stack, Chip, Divider, Box, Typography, Avatar, Button
} from "@mui/material";
import { SwapHoriz as ArrowRightLeft, ChevronRight } from "@mui/icons-material";
import { statusConfig } from "../../utils/constants.jsx";
import { shortId, fullTime } from "../../utils/assetUtils";

/**
 * Mobile row component for Transfer items
 * @param {Object} transfer - Transfer data object
 * @param {Function} onDetailClick - Handler for clicking to view details
 * @param {boolean} isMyTurn - Whether current user can act on this transfer
 * @param {React.ReactNode} actionButtons - Action buttons to render
 */
const TransferTableRowMobile = ({ transfer, onDetailClick, isMyTurn, actionButtons }) => (
    <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }} onClick={() => onDetailClick(transfer)}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            {/* Header: Mã phiếu và Trạng thái */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip
                    size="small"
                    variant="outlined"
                    label={transfer.maPhieuHienThi || `#${shortId(transfer.id)}`}
                    sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                />
                <Chip
                    size="small"
                    label={statusConfig[transfer.status]?.label}
                    color={statusConfig[transfer.status]?.color}
                    icon={statusConfig[transfer.status]?.icon}
                    variant="outlined"
                />
            </Stack>
            <Divider sx={{ mb: 1.5 }} />

            {/* Body: Lộ trình */}
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main', borderRadius: '8px' }}>
                    <ArrowRightLeft size={20} />
                </Avatar>
                <Box>
                    <Stack>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box component="span" sx={{ color: 'text.secondary', minWidth: '30px' }}>Từ:</Box>
                            <Box component="span" sx={{ fontWeight: 600 }}>{transfer.from}</Box>
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box component="span" sx={{ color: 'text.secondary', minWidth: '30px' }}>Đến:</Box>
                            <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>{transfer.to}</Box>
                        </Typography>
                    </Stack>
                </Box>
            </Stack>

            {/* Footer */}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'right' }}>
                Tạo bởi {transfer.createdBy?.name} • {fullTime(transfer.date)}
            </Typography>
        </CardContent>

        {/* Actions */}
        {isMyTurn && (
            <>
                <Divider />
                <CardActions sx={{ bgcolor: 'grey.50' }}>
                    {actionButtons}
                    <Box sx={{ flexGrow: 1 }} />
                    <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                </CardActions>
            </>
        )}
    </Card>
);

export default TransferTableRowMobile;
