import React from "react";
import { TableRow, TableCell, Checkbox, Typography, Tooltip, IconButton } from "@mui/material";
import { Edit, Trash2 } from "lucide-react";
import { hi, formatDate } from "../../utils/assetUtils";

const AssetTableRow = React.memo(({
    asset, isSelected, canManageAssets, onSelect, onEdit, onDelete, assetSearch
}) => {
    return (
        <TableRow hover role="checkbox" aria-checked={isSelected} tabIndex={-1} selected={isSelected}>
            {canManageAssets && (
                <TableCell padding="checkbox">
                    <Checkbox
                        color="primary"
                        checked={isSelected}
                        onChange={(event) => onSelect(event, asset.id)}
                        inputProps={{ 'aria-labelledby': `asset-checkbox-${asset.id}` }}
                    />
                </TableCell>
            )}
            <TableCell id={`asset-checkbox-${asset.id}`} sx={{ fontWeight: 600 }}>{hi(asset.name, assetSearch)}</TableCell>
            <TableCell>{asset.size || "—"}</TableCell>
            <TableCell align="center">{asset.quantity}</TableCell>
            <TableCell>{asset.unit}</TableCell>
            <TableCell>{asset.notes || "—"}</TableCell>
            {/* ✅ THÊM CELL MỚI NÀY VÀO */}
            <TableCell>
                <Typography
                    variant="body2"
                    sx={{ color: asset.lastChecked ? 'success.dark' : 'warning.dark', fontWeight: 500 }}
                >
                    {formatDate(asset.lastChecked)}
                </Typography>
            </TableCell>
            {canManageAssets && (
                <TableCell align="right">
                    <Tooltip title="Chỉnh sửa tài sản (Admin)">
                        <IconButton size="small" onClick={() => onEdit(asset)}>
                            <Edit size={18} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Yêu cầu Xóa/Giảm SL">
                        <IconButton size="small" color="error" onClick={() => onDelete(asset)}>
                            <Trash2 size={18} />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            )}
        </TableRow>
    );
});

export default AssetTableRow;
