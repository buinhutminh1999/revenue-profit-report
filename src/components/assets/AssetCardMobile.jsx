import React from "react";
import { Card, CardContent, Stack, Checkbox, Box, Typography, Tooltip, IconButton } from "@mui/material";
import { Edit, Delete as Trash2 } from "@mui/icons-material";
import { formatDate } from "../../utils/assetUtils";

const AssetCardMobile = React.memo(({ asset, isSelected, canManageAssets, onSelect, onEdit, onDelete }) => (
    <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                {/* Checkbox để chọn in tem */}
                {canManageAssets && (
                    <Checkbox
                        checked={isSelected}
                        onChange={(event) => onSelect(event, asset.id)}
                        sx={{ p: 0, mt: '6px' }}
                    />
                )}

                {/* Phần thông tin chính */}
                <Box sx={{ flexGrow: 1 }} onClick={onEdit}>
                    <Typography fontWeight={600}>{asset.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Số lượng: <strong>{asset.quantity} {asset.unit}</strong>
                    </Typography>
                    {/* ✅ THÊM DÒNG NÀY VÀO */}
                    <Typography variant="body2" color="text.secondary">
                        Kiểm kê: <Box component="span" sx={{ fontWeight: 600, color: asset.lastChecked ? 'success.dark' : 'warning.dark' }}>
                            {formatDate(asset.lastChecked)}
                        </Box>
                    </Typography>
                    {asset.size && (
                        <Typography variant="caption" color="text.secondary" display="block">
                            Kích thước: {asset.size}
                        </Typography>
                    )}
                    {asset.notes && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            Ghi chú: {asset.notes}
                        </Typography>
                    )}
                </Box>

                {/* Các nút hành động */}
                {canManageAssets && (
                    <Stack>
                        <Tooltip title="Chỉnh sửa (Admin)">
                            <IconButton size="small" onClick={onEdit}>
                                <Edit sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Yêu cầu Xóa/Giảm SL">
                            <IconButton size="small" color="error" onClick={onDelete}>
                                <Trash2 sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                )}
            </Stack>
        </CardContent>
    </Card>
));

export default AssetCardMobile;
