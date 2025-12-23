// src/components/assets/AssetTableRow.jsx
import React from "react";
import { TableRow, TableCell, Checkbox, Typography, Tooltip, IconButton, Chip, Stack, Box } from "@mui/material";
import { Edit, Delete, CalendarMonth } from "@mui/icons-material";
import { hi, formatDate } from "../../utils/assetUtils";
import { motion } from "framer-motion";

const MotionTableRow = motion.create(TableRow);

const AssetTableRow = React.memo(({
    asset, isSelected, canManageAssets, showCheckbox = true, onSelect, onEdit, onDelete, assetSearch
}) => {
    // showCheckbox controls checkbox visibility (requires valid id)
    // canManageAssets controls action buttons visibility
    const shouldShowCheckbox = canManageAssets && showCheckbox;

    return (
        <MotionTableRow
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            hover
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={-1}
            selected={isSelected}
            sx={{
                cursor: 'pointer',
                bgcolor: isSelected ? 'primary.50' : 'background.paper',
                '&:hover': {
                    bgcolor: isSelected ? 'primary.100' : 'background.paper',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    transform: 'translateY(-1px)',
                    zIndex: 1,
                    '& .action-buttons': {
                        opacity: 1,
                    }
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onClick={() => onEdit(asset)}
        >
            {canManageAssets && (
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    {shouldShowCheckbox ? (
                        <Checkbox
                            color="primary"
                            checked={isSelected}
                            onChange={(event) => onSelect(event, asset.id)}
                            inputProps={{ 'aria-labelledby': `asset-checkbox-${asset.id}` }}
                            sx={{
                                '& .MuiSvgIcon-root': { fontSize: 22 }
                            }}
                        />
                    ) : null}
                </TableCell>
            )}
            <TableCell id={`asset-checkbox-${asset.id}`}>
                <Typography fontWeight={600} sx={{ color: 'text.primary' }}>
                    {hi(asset.name, assetSearch)}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant="body2" color="text.secondary">
                    {asset.size || "—"}
                </Typography>
            </TableCell>
            <TableCell align="center">
                <Chip
                    size="small"
                    label={`${asset.quantity} ${asset.unit || ''}`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600, minWidth: 60 }}
                />
            </TableCell>
            <TableCell>
                <Typography variant="body2" color="text.secondary">
                    {asset.unit || "—"}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {asset.notes || "—"}
                </Typography>
            </TableCell>
            <TableCell>
                <Chip
                    size="small"
                    icon={<CalendarMonth sx={{ fontSize: '14px !important' }} />}
                    label={formatDate(asset.lastChecked)}
                    color={asset.lastChecked ? 'success' : 'warning'}
                    variant="outlined"
                    sx={{ borderRadius: 1.5 }}
                />
            </TableCell>
            {canManageAssets && (
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                        className="action-buttons"
                        sx={{
                            opacity: { xs: 1, md: 0.5 },
                            transition: 'opacity 0.2s'
                        }}
                    >
                        <Tooltip title="Chỉnh sửa tài sản" arrow>
                            <IconButton
                                size="small"
                                onClick={() => onEdit(asset)}
                                sx={{
                                    bgcolor: 'grey.100',
                                    '&:hover': { bgcolor: 'primary.lighter' },
                                    width: 36,
                                    height: 36,
                                }}
                            >
                                <Edit fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Yêu cầu Xóa/Giảm SL" arrow>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => onDelete(asset)}
                                sx={{
                                    bgcolor: 'error.lighter',
                                    '&:hover': { bgcolor: 'error.light' },
                                    width: 36,
                                    height: 36,
                                }}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </TableCell>
            )}
        </MotionTableRow>
    );
});

export default AssetTableRow;
